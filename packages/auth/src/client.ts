/**
 * Client HTTP des routes d'authentification de l'application.
 *
 * La session est un cookie httpOnly posé par le backend : le navigateur ne lit,
 * ne stocke et n'envoie aucun jeton, d'où `credentials: "include"` et aucun
 * en-tête `Authorization`.
 */
import type { EnveloppeErreur, Me, Preferences, Theme } from "./types"

/** Préfixe par défaut des routes d'authentification du backend. */
export const PREFIXE_PAR_DEFAUT = "/api/v1/auth"

/** `details.action` d'un 401 après lequel seule une nouvelle connexion aboutit. */
export const ACTION_RECONNEXION = "relancer_authorize"

/** Erreur réseau : le serveur n'a pas répondu (status 0). */
export const CODE_RESEAU = "network_error"

/** Réponse 200 qui n'est pas du JSON : en pratique, `/api/*` n'est pas routé
 *  vers le backend et le proxy a servi l'`index.html` de l'application. Un
 *  défaut de déploiement doit se voir, pas passer pour une session vide. */
export const CODE_REPONSE_NON_JSON = "reponse_non_json"

/** Au-delà, une requête est abandonnée : un proxy muet ne doit pas laisser un
 *  écran en chargement indéfini. */
const DELAI_MAX_REQUETE_MS = 30_000

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

function signalAvecDelai(signal?: AbortSignal): AbortSignal {
  const delai = AbortSignal.timeout(DELAI_MAX_REQUETE_MS)
  return signal ? AbortSignal.any([signal, delai]) : delai
}

function messageParDefaut(status: number): string {
  if (status === 401) return "Session expirée ou absente. Reconnectez-vous."
  if (status === 403) return "Permission insuffisante pour cette action."
  if (status === 502 || status === 503)
    return "Un service est momentanément indisponible. Réessayez dans quelques instants."
  if (status >= 500) return "Erreur interne du serveur."
  return "La requête n'a pas abouti."
}

function codeParDefaut(status: number): string {
  if (status === 401) return "unauthenticated"
  if (status === 403) return "forbidden"
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

async function requete<T>(
  url: string,
  init: RequestInit & { signal?: AbortSignal } = {}
): Promise<T> {
  let reponse: Response
  try {
    reponse = await fetch(url, {
      ...init,
      credentials: "include",
      headers: { Accept: "application/json", ...init.headers },
      signal: signalAvecDelai(init.signal),
    })
  } catch (erreur) {
    // Une annulation voulue par l'appelant (react-query) reste une annulation.
    if (init.signal?.aborted) throw erreur
    throw new ErreurApi(
      0,
      CODE_RESEAU,
      "Le serveur ne répond pas. Vérifiez votre connexion et réessayez."
    )
  }

  const texte = await reponse.text()
  let corps: unknown = null
  if (texte) {
    try {
      corps = JSON.parse(texte)
    } catch {
      if (reponse.ok) {
        throw new ErreurApi(
          reponse.status,
          CODE_REPONSE_NON_JSON,
          "Le serveur a répondu autre chose que du JSON : l'API n'est sans doute pas routée vers le backend."
        )
      }
    }
  }
  if (!reponse.ok) throw analyserErreur(reponse.status, corps)
  return corps as T
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
  return {
    lireMe: (signal) => requete<Me>(`${base}/me`, { signal }),
    modifierPreferences: (theme) =>
      requete<Preferences>(`${base}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      }),
    deconnecter: async () => {
      await requete(`${base}/logout`, { method: "POST" })
    },
    urlConnexion: (suivant) =>
      suivant
        ? `${base}/login?suivant=${encodeURIComponent(suivant)}`
        : `${base}/login`,
  }
}
