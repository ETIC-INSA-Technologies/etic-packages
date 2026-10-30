/**
 * Droits côté navigateur : PUREMENT COSMÉTIQUE. Masquer un bouton ou choisir
 * un écran n'interdit rien ; le serveur fait autorité, toujours, et renvoie 403
 * avec `details.required_permission`. Ne jamais conditionner à ces fonctions la
 * confidentialité d'une donnée : si elle ne doit pas être vue, l'API ne
 * l'envoie pas.
 */
import type { Me } from "./types"

export type PorteurDePermissions = Pick<Me, "permissions" | "is_superadmin">

/**
 * Vrai si le principal détient `code`. La liste reçue est déjà développée par
 * le serveur (implications comprises, jamais de joker `*`) : aucune règle n'est
 * rejouée ici. Le superadministrateur passe par son drapeau.
 */
export function aPermission(
  principal: PorteurDePermissions | null | undefined,
  code: string
): boolean {
  if (!principal) return false
  if (principal.is_superadmin) return true
  return principal.permissions.includes(code)
}
