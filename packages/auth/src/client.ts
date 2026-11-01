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

/** L'API a répondu par une redirection à une requête portant le jeton : elle
 *  n'est pas suivie, le jeton ne doit pas partir vers une autre adresse. */
export const CODE_REDIRECTION_REFUSEE = "redirection_refusee"

/** Au-delà, une requête est abandonnée : un proxy muet ne doit pas laisser un
 *  écran en chargement indéfini. Confortable : protège d'un blocage, pas
 *  d'une requête lente. */
export const DELAI_MAX_PAR_DEFAUT_MS = 30_000

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

/** Nom des copies d'ETIC Members et d'ETIC Docs : même classe, pour passer
 *  au paquet par un simple changement d'import. */
export { ErreurApi as ApiError }

function messageParDefaut(status: number): string {
  if (status === 401) return "Session expirée ou absente. Reconnectez-vous."
  if (status === 403) return "Permission insuffisante pour cette action."
  if (status === 404) return "Ressource introuvable."
  if (status === 409) return "Conflit : la ressource a changé entre-temps."
  if (status === 422) return "Données invalides."
  if (status === 502 || status === 503)
    return "Un service est momentanément indisponible. Réessayez dans quelques instants."
  if (status >= 500) return "Erreur interne du serveur."
  return "La requête n'a pas abouti."
}

function codeParDefaut(status: number): string {
  if (status === 401) return "unauthenticated"
  if (status === 403) return "forbidden"
  if (status === 404) return "not_found"
  if (status === 409) return "conflict"
  if (status === 422) return "validation_error"
  if (status === 502 || status === 503) return "external_service_unavailable"
  return status >= 500 ? "internal_error" : `http_${status}`
}

/**
 * Lit l'enveloppe `{ error: { code, message, details } }`, avec repli lisible
 * quand la réponse n'en porte pas (proxy, page HTML d'erreur).
 */
export function analyserErreur(status: number, corps: unknown): ErreurApi {
  const erreur = (corps as Partial<EnveloppeErreur> | null)?.error
  if (erreur && typeof erreur === "object" && typeof erreur.code === "string") {
    const message =
      typeof erreur.message === "string" && erreur.message.trim()
        ? erreur.message
        : messageParDefaut(status)
    const details =
      erreur.details && typeof erreur.details === "object"
        ? erreur.details
        : null
    return new ErreurApi(status, erreur.code, message, details)
  }
  return new ErreurApi(status, codeParDefaut(status), messageParDefaut(status))
}

/** Valeur d'un paramètre de requête ; un tableau donne une occurrence par
 *  élément (`type=a&type=b`, lu comme une liste par FastAPI). */
export type ValeurParametre =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[]

export type ParametresRequete = Record<string, ValeurParametre>

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
   *  n'est envoyé s'il rend une valeur vide. Une requête qui le porte ne suit
   *  aucune redirection (`CODE_REDIRECTION_REFUSEE`). */
  jeton?: () => string | null | undefined
  /** Politique de cookie par défaut ; `"include"` pour une session par
   *  cookie. Sans valeur, celle de `fetch` (`same-origin`). */
  credentials?: RequestCredentials
  /** Appelé sur tout 401, avant que l'erreur soit levée (vider le jeton,
   *  `signalerNonAuthentifie`…). */
  surNonAuthentifie?: (erreur: ErreurApi) => void
  /** Délai maximal d'une requête, corps compris, en millisecondes. */
  delaiMax?: number
}

export type MethodeHttp = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface OptionsRequete {
  methode?: MethodeHttp
  /** Corps sérialisé en JSON (`Content-Type: application/json`). */
  corps?: unknown
  /** Corps passé tel quel (`FormData` d'un envoi de fichier : le navigateur
   *  écrit lui-même la frontière multipart). Prioritaire sur `corps`. */
  corpsBrut?: BodyInit
  query?: ParametresRequete
  signal?: AbortSignal
  /** Remplace, pour cette requête, la politique de cookie du client. */
  credentials?: RequestCredentials
  /** En-têtes supplémentaires ; `Authorization` reste celui du client. */
  enTetes?: Record<string, string>
}

export type OptionsSansMethode = Omit<OptionsRequete, "methode">

export interface ClientHttp {
  /** Réponse JSON (`undefined` si elle est vide), ou `ErreurApi`. */
  requete<T>(chemin: string, options?: OptionsRequete): Promise<T>
  /** Fichier (image, PDF…) lu avec la même authentification. */
  lireBlob(
    chemin: string,
    options?: Pick<OptionsRequete, "query" | "signal">
  ): Promise<Blob>
  get<T>(chemin: string, options?: OptionsSansMethode): Promise<T>
  post<T>(
    chemin: string,
    corps?: unknown,
    options?: OptionsSansMethode
  ): Promise<T>
  put<T>(
    chemin: string,
    corps?: unknown,
    options?: OptionsSansMethode
  ): Promise<T>
  patch<T>(
    chemin: string,
    corps?: unknown,
    options?: OptionsSansMethode
  ): Promise<T>
  delete<T>(chemin: string, options?: OptionsSansMethode): Promise<T>
}

/** Un chemin relatif à la base : `/…`, jamais `//hote` ni `/\hote`, que le
 *  navigateur lirait comme une autre origine (et y enverrait le jeton). */
function verifierChemin(chemin: string): void {
  if (!/^\/(?![/\\])/.test(chemin)) {
    throw new TypeError(
      "Chemin d'API invalide : il doit commencer par un seul « / »."
    )
  }
}

function estHtml(reponse: Response, texte: string): boolean {
  const type = reponse.headers.get("content-type") ?? ""
  return type.includes("text/html") || /^\s*</.test(texte)
}

function erreurNonJson(reponse: Response, html: boolean): ErreurApi {
  return new ErreurApi(
    reponse.status,
    CODE_REPONSE_NON_JSON,
    html
      ? "Le serveur a renvoyé une page HTML au lieu de la réponse de l'API : /api n'est sans doute pas routé vers le backend."
      : "Le serveur a répondu autre chose que du JSON : l'API n'est sans doute pas routée vers le backend.",
    { content_type: reponse.headers.get("content-type") }
  )
}

function lireJson(texte: string): { ok: true; corps: unknown } | { ok: false } {
  try {
    return { ok: true, corps: JSON.parse(texte) }
  } catch {
    return { ok: false }
  }
}

async function lireReponseJson<T>(reponse: Response): Promise<T> {
  const texte = await reponse.text()
  if (!texte) return undefined as T
  const lu = lireJson(texte)
  if (!lu.ok) throw erreurNonJson(reponse, estHtml(reponse, texte))
  return lu.corps as T
}

async function lireReponseBlob(reponse: Response): Promise<Blob> {
  // Un fichier attendu, une page HTML reçue : c'est le repli `index.html`
  // d'un proxy, pas le fichier.
  if (estHtml(reponse, "")) throw erreurNonJson(reponse, true)
  return reponse.blob()
}

export function creerClientHttp(options: OptionsClientHttp = {}): ClientHttp {
  const base = (options.base ?? "").replace(/\/+$/, "")
  const delaiMax = options.delaiMax ?? DELAI_MAX_PAR_DEFAUT_MS

  /** Envoie la requête et passe la réponse à `lire`, sous un même délai
   *  maximal (le corps peut se faire attendre autant que les en-têtes). */
  async function envoyer<T>(
    chemin: string,
    requete: OptionsRequete,
    accept: string,
    lire: (reponse: Response) => Promise<T>
  ): Promise<T> {
    verifierChemin(chemin)
    const enTetes = new Headers(requete.enTetes)
    if (!enTetes.has("Accept")) enTetes.set("Accept", accept)
    let charge: BodyInit | undefined
    if (requete.corpsBrut !== undefined) {
      charge = requete.corpsBrut
    } else if (requete.corps !== undefined) {
      enTetes.set("Content-Type", "application/json")
      charge = JSON.stringify(requete.corps)
    }
    const jeton = options.jeton?.()
    if (jeton) enTetes.set("Authorization", `Bearer ${jeton}`)
    else enTetes.delete("Authorization")

    const delai = new AbortController()
    const minuteur = setTimeout(() => delai.abort(), delaiMax)
    const signal = requete.signal
      ? AbortSignal.any([requete.signal, delai.signal])
      : delai.signal
    // Une annulation voulue par l'appelant (react-query) reste une
    // annulation ; le délai et la panne réseau deviennent des `ErreurApi`.
    const traduire = (erreur: unknown): never => {
      if (requete.signal?.aborted) throw erreur
      if (delai.signal.aborted) {
        throw new ErreurApi(
          0,
          CODE_DELAI_DEPASSE,
          "Le serveur n'a pas répondu à temps. Réessayez dans quelques instants."
        )
      }
      if (erreur instanceof ErreurApi) throw erreur
      throw new ErreurApi(
        0,
        CODE_RESEAU,
        "Le serveur ne répond pas. Vérifiez votre connexion et réessayez."
      )
    }

    try {
      let reponse: Response
      try {
        reponse = await fetch(
          `${base}${chemin}${chaineRequete(requete.query)}`,
          {
            method: requete.methode ?? "GET",
            headers: enTetes,
            body: charge,
            signal,
            credentials: requete.credentials ?? options.credentials,
            // Avec le jeton, aucune redirection suivie : elle pourrait mener
            // à une autre origine. Une API ne redirige pas un appel `fetch`.
            ...(jeton ? { redirect: "manual" as const } : {}),
          }
        )
      } catch (erreur) {
        return traduire(erreur)
      }
      if (reponse.type === "opaqueredirect") {
        throw new ErreurApi(
          0,
          CODE_REDIRECTION_REFUSEE,
          "L'API a répondu par une redirection, qui n'a pas été suivie."
        )
      }
      if (!reponse.ok) {
        let texte = ""
        try {
          texte = await reponse.text()
        } catch (erreur) {
          traduire(erreur)
        }
        const lu = texte ? lireJson(texte) : null
        const erreur = analyserErreur(reponse.status, lu?.ok ? lu.corps : null)
        if (reponse.status === 401) options.surNonAuthentifie?.(erreur)
        throw erreur
      }
      try {
        return await lire(reponse)
      } catch (erreur) {
        return traduire(erreur)
      }
    } finally {
      clearTimeout(minuteur)
    }
  }

  const requete = <T>(chemin: string, opts: OptionsRequete = {}) =>
    envoyer(chemin, opts, "application/json", (r) => lireReponseJson<T>(r))

  return {
    requete,
    lireBlob: (chemin, opts = {}) =>
      envoyer(chemin, opts, "*/*", lireReponseBlob),
    get: (chemin, opts) => requete(chemin, { ...opts, methode: "GET" }),
    post: (chemin, corps, opts) =>
      requete(chemin, { ...opts, methode: "POST", corps }),
    put: (chemin, corps, opts) =>
      requete(chemin, { ...opts, methode: "PUT", corps }),
    patch: (chemin, corps, opts) =>
      requete(chemin, { ...opts, methode: "PATCH", corps }),
    delete: (chemin, opts) => requete(chemin, { ...opts, methode: "DELETE" }),
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
  const base = prefixe.replace(/\/+$/, "")
  // Session par cookie httpOnly : aucun jeton côté navigateur.
  const http = creerClientHttp({ base, credentials: "include" })
  return {
    lireMe: (signal) => http.get<Me>("/me", { signal }),
    modifierPreferences: (theme) =>
      http.patch<Preferences>("/preferences", { theme }),
    deconnecter: async () => {
      await http.post("/logout")
    },
    urlConnexion: (suivant) =>
      suivant
        ? `${base}/login?suivant=${encodeURIComponent(suivant)}`
        : `${base}/login`,
  }
}
