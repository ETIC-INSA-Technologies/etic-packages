import type { Me } from "./types"

/** Dernier recours : une session existe, mais rien ne permet de la nommer. */
export const LIBELLE_SESSION_INCONNUE = "Session"

type Nommable = Pick<Me, "membre_id" | "email" | "nom_affichage">

/**
 * Libellé de la session. ETIC Members calcule seul le nom (« Prénom Nom », le
 * rôle d'un compte fonctionnel) : aucune concaténation prénom + nom ici, qui
 * laisserait un compte fonctionnel sans nom. Replis : e-mail, puis identifiant.
 */
export function nomAffichage(me: Nommable | null | undefined): string {
  if (!me) return LIBELLE_SESSION_INCONNUE
  return (
    me.nom_affichage?.trim() ||
    me.email?.trim() ||
    me.membre_id.trim() ||
    LIBELLE_SESSION_INCONNUE
  )
}

/** E-mail à rappeler sous le nom, ou `null` s'il est déjà le libellé. */
export function emailDistinct(me: Nommable | null | undefined): string | null {
  const email = me?.email?.trim()
  return email && email !== nomAffichage(me) ? email : null
}
