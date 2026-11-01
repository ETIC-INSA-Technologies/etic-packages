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
 *  alignés sur les codes des backends ETIC. */
const PAR_STATUT: Record<number, [string, string]> = {
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

/**
 * Lit l'enveloppe `{ error: { code, message, details } }`, avec repli lisible
 * quand la réponse n'en porte pas (proxy, page HTML d'erreur).
 */
export function analyserErreur(status: number, corps: unknown): ErreurApi {
  const [codeRepli, messageRepli] = parDefaut(status)
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

/** Paramètres de requête ; un tableau donne une occurrence par élément
 *  (`type=a&type=b`, lu comme une liste par FastAPI). */
export type ParametresRequete = Record<
  string,
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[]
>

/** `?a=1&b=2`, ou `""` : les valeurs vides (`undefined`, `null`, `""`) sont
 *  omises, un filtre non renseigné n'apparaît pas dans l'URL. */
export function chaineRequete(parametres?: ParametresRequete): string {
  if (!parametres) return ""
  const usp = new URLSearchParams()
  for (const [cle, valeur] of Object.entries(parametres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue
    if (Array.isArray(valeur)) {
      for (const element of valeur) usp.append(cle, String(element))
    } else {
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
  /** Appelé sur tout 401, avant que l'erreur soit levée (vider le jeton,
   *  `signalerNonAuthentifie`…). */
  surNonAuthentifie?: (erreur: ErreurApi) => void
  /** Délai maximal d'une requête, corps compris, en millisecondes (30 s par
   *  défaut). */
  delaiMax?: number
}

/** Options d'une requête. */
export interface OptionsRequete {
  query?: ParametresRequete
  signal?: AbortSignal
  /** Remplace, pour cette requête, la politique de cookie du client. */
  credentials?: RequestCredentials
  /** En-têtes supplémentaires ; `Authorization` reste celui du client. */
  enTetes?: Record<string, string>
}

export interface ClientHttp {
  /** Les verbes rendent la réponse JSON (`undefined` si elle est vide, 204
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
  /** Fichier (image, PDF…) lu avec la même authentification. */
  lireBlob(
    chemin: string,
    options?: Pick<OptionsRequete, "query" | "signal">
  ): Promise<Blob>
  /** URL complète d'un chemin, pour une navigation (lien de connexion…). */
  url(chemin: string, query?: ParametresRequete): string
}

/** Un chemin relatif à la base : `/…`, jamais `//hote` ni `/\hote`, que le
 *  navigateur lirait comme une autre origine (et y enverrait le jeton).
 *  Erreur de programmation, hors du contrat `ErreurApi` : `TypeError`. */
function verifierChemin(chemin: string): void {
  if (!/^\/(?![/\\])/.test(chemin)) {
    throw new TypeError(
      "Chemin d'API invalide : il doit commencer par un seul « / »."
    )
  }
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
  if (!texte) return undefined as T
  const corps = lireJson(texte)
  if (corps === undefined) throw erreurNonJson(reponse, texte)
  return corps as T
}

async function lireReponseBlob(reponse: Response): Promise<Blob> {
  // Un fichier attendu, une page HTML reçue : c'est le repli `index.html`
  // d'un proxy, pas le fichier. Son corps n'est pas lu.
  if (annonceHtml(reponse)) {
    void reponse.body?.cancel()
    throw erreurNonJson(reponse)
  }
  return reponse.blob()
}

type Requete = OptionsRequete & { methode: string; corps?: unknown }

export function creerClientHttp(options: OptionsClientHttp = {}): ClientHttp {
  const base = (options.base ?? "").replace(/\/+$/, "")
  const delaiMax = options.delaiMax ?? DELAI_MAX_PAR_DEFAUT_MS
  const redirections =
    options.redirections ?? (options.jeton ? "refusees" : "suivies")

  function url(chemin: string, query?: ParametresRequete): string {
    verifierChemin(chemin)
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

    // Minuterie annulée dès la fin de la requête (`AbortSignal.timeout`
    // survivrait, elle, tout le délai).
    const delai = new AbortController()
    const minuteur = setTimeout(() => delai.abort(), delaiMax)
    const signal = opts.signal
      ? AbortSignal.any([opts.signal, delai.signal])
      : delai.signal

    // Une `ErreurApi` passe telle quelle ; une annulation voulue par
    // l'appelant (react-query) reste une annulation ; le délai et la panne
    // réseau deviennent des `ErreurApi`.
    const traduire = (erreur: unknown): never => {
      if (erreur instanceof ErreurApi) {
        if (erreur.status === 401) options.surNonAuthentifie?.(erreur)
        throw erreur
      }
      if (opts.signal?.aborted) throw erreur
      if (delai.signal.aborted) {
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
      const reponse = await fetch(adresse, {
        method: opts.methode,
        headers: enTetes,
        body: charge,
        signal,
        credentials: opts.credentials ?? options.credentials,
        redirect: redirections === "refusees" ? "manual" : "follow",
      })
      if (reponse.type === "opaqueredirect") {
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
