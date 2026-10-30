/**
 * Échec du SSO : le backend renvoie le navigateur vers la page de connexion
 * avec `?erreur=<code>`. Seul le code transite par l'URL ; le texte affiché est
 * rédigé ici, jamais repris de l'adresse.
 */

const MESSAGES: Record<string, string> = {
  unauthenticated:
    "La connexion a expiré ou a été interrompue. Relancez la connexion.",
  account_disabled:
    "Votre compte ETIC Members est désactivé. Contactez un administrateur.",
  account_alumni: "Cette application n'est pas ouverte aux anciens membres.",
  forbidden: "Votre compte n'a pas accès à cette application.",
  external_service_unavailable:
    "ETIC Members est momentanément indisponible. Réessayez dans un instant.",
}

const MESSAGE_INCONNU = "La connexion n'a pas abouti. Relancez la connexion."

export interface ErreurConnexion {
  code: string
  message: string
}

/**
 * Code et message de `?erreur=` dans `search` (`location.search`), ou `null`.
 * `messages` remplace ou complète les textes par défaut, par code (une
 * application qui accueille les anciens membres, par exemple).
 */
export function lireErreurConnexion(
  search: string,
  messages: Record<string, string> = {}
): ErreurConnexion | null {
  const code = new URLSearchParams(search).get("erreur")?.trim()
  if (!code) return null
  const textes = { ...MESSAGES, ...messages }
  return {
    code,
    message: Object.hasOwn(textes, code) ? textes[code] : MESSAGE_INCONNU,
  }
}
