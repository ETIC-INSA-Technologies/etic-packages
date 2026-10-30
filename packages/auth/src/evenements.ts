/**
 * Événement global « la session n'est plus valide ». Le client HTTP de
 * l'application l'émet sur tout 401, sans connaître le fournisseur
 * d'authentification ; `AuthProvider` l'écoute et purge la session.
 */
export const EVENEMENT_NON_AUTHENTIFIE = "etic-auth:non-authentifie"

export function signalerNonAuthentifie(): void {
  globalThis.dispatchEvent(new Event(EVENEMENT_NON_AUTHENTIFIE))
}
