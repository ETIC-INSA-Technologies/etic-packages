import type { ReactNode } from "react"
import type { ErreurApi } from "./client"
import { useAuth } from "./context"

export interface SessionRequiseProps {
  children: ReactNode
  /** Rendu sans session : page de connexion, ou redirection de l'application. */
  sansSession: ReactNode
  /** Rendu pendant la première résolution de la session. */
  chargement?: ReactNode
  /** Rendu quand la session n'a pas pu être résolue (réseau, serveur). */
  erreur?: (erreur: ErreurApi, reessayer: () => void) => ReactNode
}

/**
 * Barrière de session, à trois états jamais confondus : chargement, panne
 * (avec « Réessayer », surtout pas un renvoi vers la connexion, qui ferait
 * croire à une déconnexion quand c'est le serveur qui ne répond pas), absence
 * de session. Cosmétique : le serveur refuse de toute façon sans session.
 */
export function SessionRequise({
  children,
  sansSession,
  chargement = null,
  erreur,
}: SessionRequiseProps) {
  const auth = useAuth()
  if (auth.chargement) return chargement
  // Une session déjà connue reste affichée si une relecture échoue en arrière-plan.
  if (auth.me) return children
  if (auth.erreur) {
    return erreur ? erreur(auth.erreur, auth.rafraichir) : null
  }
  return sansSession
}

export interface SiPermissionProps {
  code: string
  children: ReactNode
  sinon?: ReactNode
}

/** Affiche `children` si la session détient `code`. ⚠️ Cosmétique. */
export function SiPermission({
  code,
  children,
  sinon = null,
}: SiPermissionProps) {
  return useAuth().aPermission(code) ? children : sinon
}
