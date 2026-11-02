/**
 * Client HTTP commun des applications ETIC, et client des routes
 * d'authentification bâti dessus.
 *
 * - `creerClientHttp` : enveloppe d'erreur commune (`ErreurApi`), délai
 *   maximal, page HTML reçue à la place de JSON signalée comme telle, jeton
 *   `Bearer` fourni par l'application (ETIC Members) ou session par cookie
 *   (`credentials: "include"`, applications satellites).
 * - `creerClientAuth` : routes `/api/v1/auth/*` d'une application satellite.
 *   La session est un cookie httpOnly posé par le backend : le navigateur ne
 *   lit, ne stocke et n'envoie aucun jeton.
 *
 * Le jeton ne quitte jamais l'en-tête `Authorization` : il n'entre dans aucun
 * message, aucun `details` d'`ErreurApi` et aucun journal.
 */
import type { EnveloppeErreur, Me, Preferences, Theme } from "./types"

/** Préfixe par défaut des routes d'authentification du backend. */
export const PREFIXE_PAR_DEFAUT = "/api/v1/auth"

/** `details.action` d'un 401 après lequel seule une nouvelle connexion aboutit. */
export const ACTION_RECONNEXION = "relancer_authorize"

/** Erreur réseau : le serveur n'a pas répondu (status 0). */
export const CODE_RESEAU = "network_error"

/** Le serveur n'a pas répondu dans le délai maximal (status 0). */
export const CODE_DELAI_DEPASSE = "delai_depasse"

/** Réponse 200 qui n'est pas du JSON : en pratique, `/api/*` n'est pas routé
 *  vers le backend et le proxy a servi l'`index.html` de l'application. Un
 *  défaut de déploiement doit se voir, pas passer pour une session vide. */
export const CODE_REPONSE_NON_JSON = "reponse_non_json"

/** Redirection reçue alors que le client les refuse (`redirections:
 *  "refusees"`, le défaut avec un jeton) : elle n'est pas suivie (status 0). */
export const CODE_REDIRECTION_REFUSEE = "redirection_refusee"

/** 304 Not Modified (status 304) : réponse à une requête conditionnelle
 *  (`If-None-Match`, `If-Modified-Since` passés dans `enTetes`), sans corps.
 *  Ce n'est pas une redirection ; le client n'a pas de cache où relire la
 *  ressource, l'appelant garde la version qu'il a déjà. Le cache HTTP du
 *  navigateur, lui, revalide sans montrer de 304 à `fetch`. */
export const CODE_NON_MODIFIE = "not_modified"

/** Au-delà, une requête est abandonnée : un proxy muet ne doit pas laisser un
 *  écran en chargement indéfini. Confortable : protège d'un blocage, pas
 *  d'une requête lente. */
const DELAI_MAX_PAR_DEFAUT_MS = 30_000

/** Erreur de toute requête qui n'aboutit pas : enveloppe
 *  `{ error: { code, message, details } }` du backend, ou repli lisible. */
export class ErreurApi extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown> | null

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> | null = null
  ) {
    super(message)
    this.name = "ErreurApi"
    this.status = status
    this.code = code
    this.details = details
  }

  /** Vrai sur un 401 : session absente, expirée ou révoquée, seule une
   *  nouvelle connexion la rétablit (le backend a déjà tenté le
   *  rafraîchissement). */
  get reconnexionRequise(): boolean {
    return this.status === 401
  }

  /** ETIC Members (ou un autre service) est momentanément indisponible. */
  get serviceIndisponible(): boolean {
    return (
      this.code === "external_service_unavailable" ||
      this.status === 502 ||
      this.status === 503
    )
  }
}

const INDISPONIBLE: [string, string] = [
  "external_service_unavailable",
  "Un service est momentanément indisponible. Réessayez dans quelques instants.",
]

/** Code et message d'une réponse d'erreur sans enveloppe (proxy, page HTML),
 *  alignés sur les codes des backends ETIC. Le statut est ajouté au message
 *  (`messageDeRepli`). */
const PAR_STATUT: Record<number, [string, string]> = {
  304: [
    CODE_NON_MODIFIE,
    "La ressource n'a pas changé depuis la version déjà reçue.",
  ],
  401: ["unauthenticated", "Session expirée ou absente. Reconnectez-vous."],
  403: ["forbidden", "Permission insuffisante pour cette action."],
  404: ["not_found", "Ressource introuvable."],
  409: ["conflict", "Conflit : la ressource a changé entre-temps."],
  422: ["validation_error", "Données invalides."],
  501: ["not_implemented", "Fonctionnalité non encore disponible."],
  502: INDISPONIBLE,
  503: INDISPONIBLE,
}

/** Hors table : `internal_error` pour un 5xx, `http_<statut>` pour les
 *  autres (un 4xx inattendu n'est pas une panne du serveur). */
function parDefaut(status: number): [string, string] {
  return (
    PAR_STATUT[status] ??
    (status >= 500
      ? ["internal_error", "Erreur interne du serveur."]
      : [`http_${status}`, "La requête n'a pas abouti."])
  )
}

/** Le statut s'ajoute à la fin du message, quel qu'il soit : « La requête
 *  n'a pas abouti. (HTTP 413) », « Session expirée ou absente.
 *  Reconnectez-vous. (HTTP 401) » — un proxy qui répond sans enveloppe reste
 *  diagnostiquable depuis l'écran. */
function messageDeRepli(status: number, message: string): string {
  return `${message} (HTTP ${status})`
}

/**
 * Lit l'enveloppe `{ error: { code, message, details } }`, avec repli lisible
 * quand la réponse n'en porte pas (proxy, page HTML d'erreur) : code et
 * message déduits du statut, statut compris dans le message.
 */
export function analyserErreur(status: number, corps: unknown): ErreurApi {
  const [codeRepli, messageBrut] = parDefaut(status)
  const messageRepli = messageDeRepli(status, messageBrut)
  const erreur = (corps as Partial<EnveloppeErreur> | null | undefined)?.error
  if (erreur && typeof erreur === "object" && typeof erreur.code === "string") {
    const message =
      typeof erreur.message === "string" && erreur.message.trim()
        ? erreur.message
        : messageRepli
    const details =
      erreur.details && typeof erreur.details === "object"
        ? erreur.details
        : null
    return new ErreurApi(status, erreur.code, message, details)
  }
  return new ErreurApi(status, codeRepli, messageRepli)
}

type ValeurSimple = string | number | boolean | null | undefined

/** Paramètres de requête ; un tableau donne une occurrence par élément
 *  (`type=a&type=b`, lu comme une liste par FastAPI). */
export type ParametresRequete = Record<
  string,
  ValeurSimple | readonly ValeurSimple[]
>

const estVide = (valeur: ValeurSimple) =>
  valeur === undefined || valeur === null || valeur === ""

/** `?a=1&b=2`, ou `""` : les valeurs vides (`undefined`, `null`, `""`) sont
 *  omises, dans un tableau aussi : un filtre non renseigné n'apparaît pas
 *  dans l'URL. */
export function chaineRequete(parametres?: ParametresRequete): string {
  if (!parametres) return ""
  const usp = new URLSearchParams()
  for (const [cle, valeur] of Object.entries(parametres)) {
    if (Array.isArray(valeur)) {
      for (const element of valeur as readonly ValeurSimple[]) {
        if (!estVide(element)) usp.append(cle, String(element))
      }
    } else if (!estVide(valeur as ValeurSimple)) {
      usp.set(cle, String(valeur))
    }
  }
  const rendu = usp.toString()
  return rendu ? `?${rendu}` : ""
}

export interface OptionsClientHttp {
  /** Préfixe de toutes les URL : `""` (même origine), `/api/v1` ou une URL
   *  absolue (`https://api.exemple.org/api/v1`). Fixé par l'application. */
  base?: string
  /** Jeton envoyé en `Authorization: Bearer …`, lu à chaque requête ; rien
   *  n'est envoyé s'il rend une valeur vide. */
  jeton?: () => string | null | undefined
  /** `"refusees"` : une redirection lève `redirection_refusee` au lieu
   *  d'être suivie, le jeton ne part pas vers une autre adresse. Par défaut,
   *  `"refusees"` si `jeton` est fourni, `"suivies"` sinon. */
  redirections?: "suivies" | "refusees"
  /** Politique de cookie par défaut ; `"include"` pour une session par
   *  cookie. Sans valeur, celle de `fetch` (`same-origin`). */
  credentials?: RequestCredentials
  /** Appelé sur un 401, avant que l'erreur soit levée (vider le jeton,
   *  `signalerNonAuthentifie`…). Pas pour le 401 tardif d'une requête partie
   *  avec un jeton que `jeton()` ne rend plus (reconnexion entre-temps) : il
   *  ne doit pas purger le nouveau ; l'erreur 401 est levée dans tous les
   *  cas. S'il lève, l'appelant reçoit quand même l'`ErreurApi` 401 ;
   *  l'exception du rappel est signalée à part (`reportError`). */
  surNonAuthentifie?: (erreur: ErreurApi) => void
  /** Délai maximal d'une requête, corps compris, en millisecondes : 30 s
   *  par défaut, plafonné à 2^31-1 ; `Infinity` ou `null` : aucun délai.
   *  Une valeur ≤ 0 ou non finie lève une `RangeError`. */
  delaiMax?: number | null
}

/** Options d'une requête. */
export interface OptionsRequete {
  query?: ParametresRequete
  signal?: AbortSignal
  /** Remplace, pour cette requête, la politique de cookie du client. */
  credentials?: RequestCredentials
  /** En-têtes supplémentaires ; `Authorization` reste celui du client. */
  enTetes?: Record<string, string>
  /** Remplace, pour cette requête, le délai maximal du client (mêmes
   *  valeurs) : à allonger pour l'envoi ou la lecture d'un gros fichier. */
  delaiMax?: number | null
}

export interface ClientHttp {
  /** Les verbes rendent la réponse JSON (`null` si elle est vide, 204
   *  compris) ou lèvent une `ErreurApi`. `corps` part tel quel s'il est un
   *  `FormData`, un `Blob`, un `URLSearchParams` ou un `ArrayBuffer` (et ses
   *  vues), sérialisé en JSON sinon. */
  get<T>(chemin: string, options?: OptionsRequete): Promise<T>
  post<T>(chemin: string, corps?: unknown, options?: OptionsRequete): Promise<T>
  put<T>(chemin: string, corps?: unknown, options?: OptionsRequete): Promise<T>
  patch<T>(
    chemin: string,
    corps?: unknown,
    options?: OptionsRequete
  ): Promise<T>
  delete<T>(chemin: string, options?: OptionsRequete): Promise<T>
  /** Fichier (image, PDF…) lu avec la même authentification ; pour un gros
   *  fichier, allonger `delaiMax`. */
  lireBlob(chemin: string, options?: OptionsRequete): Promise<Blob>
  /** URL complète d'un chemin, pour une navigation (lien de connexion…). */
  url(chemin: string, query?: ParametresRequete): string
}

/** Adresse de référence pour résoudre une base relative : la page, ou une
 *  origine fictive hors navigateur (tests, rendu serveur). Lue une fois par
 *  `creerClientHttp`. */
function adresseDeReference(): string {
  return globalThis.location?.href ?? "http://reference.invalid/"
}

/**
 * Un chemin relatif à la base, qui ne peut pas mener ailleurs que l'origine
 * de la base (le jeton y partirait) : il commence par un seul `/` (ni `//`
 * ni `/\`, quelle que soit la base), ne contient ni caractère de contrôle ni
 * espace (l'analyseur d'URL retire tabulations et retours à la ligne :
 * `/\t/hote` deviendrait `//hote`), et l'URL résolue garde l'origine de la
 * base (`origineBase`, résolue sur la même `reference`). `%2F%2F` reste un
 * chemin.
 * Erreur de programmation, hors du contrat `ErreurApi` : `TypeError`.
 */
function verifierChemin(
  base: string,
  reference: string,
  origineBase: string,
  chemin: string
): void {
  const valide =
    /^\/(?![/\\])/.test(chemin) &&
    // eslint-disable-next-line no-control-regex
    !/[\u0000- \u007f]/.test(chemin)
  if (
    !valide ||
    new URL(`${base}${chemin}`, reference).origin !== origineBase
  ) {
    throw new TypeError(
      "Chemin d'API invalide : il doit commencer par « / », sans espace ni caractère de contrôle, et rester sur l'origine de l'API."
    )
  }
}

/** Plafond des minuteries des navigateurs : au-delà, elles partent aussitôt. */
const DELAI_PLAFOND_MS = 2 ** 31 - 1

/** Délai en millisecondes, ou `null` pour aucun délai. */
function validerDelai(
  delai: number | null | undefined,
  defaut: number | null
): number | null {
  if (delai === undefined) return defaut
  if (delai === null || delai === Infinity) return null
  if (!Number.isFinite(delai) || delai <= 0) {
    throw new RangeError(
      "delaiMax : un nombre de millisecondes supérieur à 0, Infinity ou null."
    )
  }
  return Math.min(delai, DELAI_PLAFOND_MS)
}

/** Un signal qui s'abaisse avec le premier des `signaux`. `AbortSignal.any`
 *  manque avant Safari 17.4 : repli par écouteurs, que `liberer` retire. */
function combinerSignaux(signaux: AbortSignal[]): {
  signal: AbortSignal | undefined
  liberer: () => void
} {
  const rien = () => {}
  if (signaux.length <= 1) return { signal: signaux[0], liberer: rien }
  if (typeof AbortSignal.any === "function") {
    return { signal: AbortSignal.any(signaux), liberer: rien }
  }
  const controleur = new AbortController()
  const ecouteurs = signaux.map((signal) => {
    const abandonner = () => controleur.abort(signal.reason)
    signal.addEventListener("abort", abandonner, { once: true })
    return () => signal.removeEventListener("abort", abandonner)
  })
  const deja = signaux.find((signal) => signal.aborted)
  if (deja) controleur.abort(deja.reason)
  return {
    signal: controleur.signal,
    liberer: () => ecouteurs.forEach((retirer) => retirer()),
  }
}

/** Signale une exception sans interrompre le flux en cours : `reportError`
 *  (console et événement `error` de la fenêtre, comme une exception non
 *  rattrapée), à défaut une exception relancée dans une micro-tâche. */
function signalerException(exception: unknown): void {
  if (typeof globalThis.reportError === "function") {
    globalThis.reportError(exception)
  } else {
    queueMicrotask(() => {
      throw exception
    })
  }
}

/** Abandonne un corps qui ne sera pas lu ; un flux déjà en erreur ne doit
 *  pas laisser de rejet non traité. */
function abandonnerCorps(reponse: Response): void {
  void reponse.body?.cancel().catch(() => {})
}

function estCorpsBrut(corps: unknown): corps is BodyInit {
  return (
    corps instanceof FormData ||
    corps instanceof Blob ||
    corps instanceof URLSearchParams ||
    corps instanceof ArrayBuffer ||
    ArrayBuffer.isView(corps)
  )
}

function annonceHtml(reponse: Response): boolean {
  return (reponse.headers.get("content-type") ?? "").includes("text/html")
}

/** `texte` : le corps déjà lu, s'il l'a été. */
function erreurNonJson(reponse: Response, texte?: string): ErreurApi {
  const html = annonceHtml(reponse) || /^\s*</.test(texte ?? "")
  return new ErreurApi(
    reponse.status,
    CODE_REPONSE_NON_JSON,
    html
      ? "Le serveur a renvoyé une page HTML au lieu de la réponse de l'API : /api n'est sans doute pas routé vers le backend."
      : "Le serveur a répondu autre chose que du JSON : l'API n'est sans doute pas routée vers le backend.",
    { content_type: reponse.headers.get("content-type") }
  )
}

/** Le JSON lu, ou `undefined` si le texte n'en est pas. */
function lireJson(texte: string): unknown {
  try {
    return JSON.parse(texte)
  } catch {
    return undefined
  }
}

async function lireReponseJson<T>(reponse: Response): Promise<T> {
  const texte = await reponse.text()
  // `null`, pas `undefined` : react-query refuse un `queryFn` qui rend
  // `undefined`.
  if (!texte) return null as T
  const corps = lireJson(texte)
  if (corps === undefined) throw erreurNonJson(reponse, texte)
  return corps as T
}

async function lireReponseBlob(reponse: Response): Promise<Blob> {
  // Un fichier attendu, une page HTML reçue : c'est le repli `index.html`
  // d'un proxy, pas le fichier. Son corps n'est pas lu.
  if (annonceHtml(reponse)) {
    abandonnerCorps(reponse)
    throw erreurNonJson(reponse)
  }
  return reponse.blob()
}

type Requete = OptionsRequete & { methode: string; corps?: unknown }

export function creerClientHttp(options: OptionsClientHttp = {}): ClientHttp {
  const base = (options.base ?? "").replace(/\/+$/, "")
  // L'origine de la page ne change pas pendant sa vie : la référence est lue
  // une fois, et la base comme chaque chemin sont résolus sur elle (deux
  // lectures pourraient diverger, `location` absent puis présent). Une base
  // malformée (variable d'environnement) ne fait pas échouer la création du
  // client, donc l'import du module : chaque requête la rejette.
  const reference = adresseDeReference()
  let origineBase: string | undefined
  let erreurBase: TypeError | undefined
  try {
    origineBase = new URL(`${base}/`, reference).origin
  } catch (cause) {
    erreurBase = new TypeError(`Base d'API invalide : « ${base} ».`, {
      cause,
    })
  }
  const delaiClient = validerDelai(options.delaiMax, DELAI_MAX_PAR_DEFAUT_MS)
  const redirections =
    options.redirections ?? (options.jeton ? "refusees" : "suivies")

  function url(chemin: string, query?: ParametresRequete): string {
    if (origineBase === undefined) throw erreurBase
    verifierChemin(base, reference, origineBase, chemin)
    return `${base}${chemin}${chaineRequete(query)}`
  }

  /** Envoie la requête et passe la réponse à `lire`, sous un même délai
   *  maximal (le corps peut se faire attendre autant que les en-têtes). */
  async function envoyer<T>(
    chemin: string,
    opts: Requete,
    accept: string,
    lire: (reponse: Response) => Promise<T>
  ): Promise<T> {
    const adresse = url(chemin, opts.query)
    const enTetes = new Headers(opts.enTetes)
    if (!enTetes.has("Accept")) enTetes.set("Accept", accept)
    let charge: BodyInit | undefined
    if (estCorpsBrut(opts.corps)) {
      // `FormData` : pas de `Content-Type`, le navigateur écrit lui-même la
      // frontière multipart.
      charge = opts.corps
    } else if (opts.corps !== undefined) {
      enTetes.set("Content-Type", "application/json")
      charge = JSON.stringify(opts.corps)
    }
    const jeton = options.jeton?.()
    if (jeton) enTetes.set("Authorization", `Bearer ${jeton}`)
    else enTetes.delete("Authorization")

    const delaiMs = validerDelai(opts.delaiMax, delaiClient)
    // Minuterie annulée dès la fin de la requête (`AbortSignal.timeout`
    // survivrait, elle, tout le délai).
    const delai = delaiMs === null ? null : new AbortController()
    let minuteur: ReturnType<typeof setTimeout> | undefined
    let liberer = () => {}

    // Une `ErreurApi` passe telle quelle ; une annulation voulue par
    // l'appelant (react-query) reste une annulation ; le délai et la panne
    // réseau deviennent des `ErreurApi`.
    const traduire = (erreur: unknown): never => {
      if (erreur instanceof ErreurApi) {
        // Le 401 tardif d'une requête partie avec un jeton que l'application
        // a remplacé depuis ne doit pas purger le nouveau : le rappel n'est
        // appelé que si le jeton courant est encore celui de la requête (ou
        // si la requête n'en portait pas). L'erreur est levée dans tous les
        // cas.
        if (
          erreur.status === 401 &&
          options.surNonAuthentifie &&
          (!jeton || options.jeton?.() === jeton)
        ) {
          // Le rappel ne remplace pas l'erreur 401 et n'est pas tu.
          try {
            options.surNonAuthentifie(erreur)
          } catch (exception) {
            signalerException(exception)
          }
        }
        throw erreur
      }
      if (opts.signal?.aborted) throw erreur
      if (delai?.signal.aborted) {
        throw new ErreurApi(
          0,
          CODE_DELAI_DEPASSE,
          "Le serveur n'a pas répondu à temps. Réessayez dans quelques instants."
        )
      }
      throw new ErreurApi(
        0,
        CODE_RESEAU,
        "Le serveur ne répond pas. Vérifiez votre connexion et réessayez."
      )
    }

    try {
      if (delai && delaiMs !== null) {
        minuteur = setTimeout(() => delai.abort(), delaiMs)
      }
      const combine = combinerSignaux(
        [opts.signal, delai?.signal].filter((s) => s !== undefined)
      )
      liberer = combine.liberer
      const reponse = await fetch(adresse, {
        method: opts.methode,
        headers: enTetes,
        body: charge,
        signal: combine.signal,
        credentials: opts.credentials ?? options.credentials,
        redirect: redirections === "refusees" ? "manual" : "follow",
      })
      // Navigateur : `opaqueredirect` ; Node (undici) : le vrai statut 3xx,
      // sauf 304 (Not Modified), qui n'est pas une redirection : il devient
      // `not_modified` par `analyserErreur`, redirections suivies ou non.
      if (
        redirections === "refusees" &&
        (reponse.type === "opaqueredirect" ||
          (reponse.status >= 300 &&
            reponse.status < 400 &&
            reponse.status !== 304))
      ) {
        abandonnerCorps(reponse)
        throw new ErreurApi(
          0,
          CODE_REDIRECTION_REFUSEE,
          "L'API a répondu par une redirection, qui n'a pas été suivie."
        )
      }
      if (!reponse.ok) {
        throw analyserErreur(reponse.status, lireJson(await reponse.text()))
      }
      return await lire(reponse)
    } catch (erreur) {
      return traduire(erreur)
    } finally {
      clearTimeout(minuteur)
      liberer()
    }
  }

  const json = <T>(chemin: string, opts: Requete) =>
    envoyer(chemin, opts, "application/json", (r) => lireReponseJson<T>(r))

  return {
    get: (chemin, opts) => json(chemin, { ...opts, methode: "GET" }),
    post: (chemin, corps, opts) =>
      json(chemin, { ...opts, methode: "POST", corps }),
    put: (chemin, corps, opts) =>
      json(chemin, { ...opts, methode: "PUT", corps }),
    patch: (chemin, corps, opts) =>
      json(chemin, { ...opts, methode: "PATCH", corps }),
    delete: (chemin, opts) => json(chemin, { ...opts, methode: "DELETE" }),
    lireBlob: (chemin, opts) =>
      envoyer(chemin, { ...opts, methode: "GET" }, "*/*", lireReponseBlob),
    url,
  }
}

/** Appels aux routes `{base}{prefixe}/…` du backend de l'application. */
export interface ClientAuth {
  lireMe(signal?: AbortSignal): Promise<Me>
  modifierPreferences(theme: Theme): Promise<Preferences>
  deconnecter(): Promise<void>
  /** URL de `login`, à ouvrir par navigation (302 vers ETIC Members). */
  urlConnexion(suivant?: string): string
}

export function creerClientAuth(prefixe = PREFIXE_PAR_DEFAUT): ClientAuth {
  // Session par cookie httpOnly : aucun jeton côté navigateur.
  const http = creerClientHttp({ base: prefixe, credentials: "include" })
  return {
    lireMe: (signal) => http.get<Me>("/me", { signal }),
    modifierPreferences: (theme) =>
      http.patch<Preferences>("/preferences", { theme }),
    deconnecter: async () => {
      await http.post("/logout")
    },
    urlConnexion: (suivant) => http.url("/login", { suivant }),
  }
}
