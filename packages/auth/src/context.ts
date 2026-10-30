import { createContext, use } from "react"
import type { ErreurApi } from "./client"
import type { Me, Theme } from "./types"

export interface AuthValeur {
  /** Identité de la session, ou `null` sans session. */
  me: Me | null
  /** Première résolution de la session en cours. */
  chargement: boolean
  /** Résolution impossible (réseau, serveur) : ce n'est PAS une absence de session. */
  erreur: ErreurApi | null
  estSuperadmin: boolean
  /** ⚠️ Cosmétique : le serveur fait autorité. */
  aPermission: (code: string) => boolean
  /** Thème enregistré dans ETIC Members (`system` à défaut). */
  theme: Theme
  /** Enregistre le thème pour toute la suite ; appliqué tout de suite ici. */
  changerTheme: (theme: Theme) => Promise<void>
  /** Navigation vers ETIC Members ; retour sur `suivant` (défaut : page courante). */
  seConnecter: (suivant?: string) => void
  deconnecter: () => Promise<void>
  rafraichir: () => void
}

export const AuthContext = createContext<AuthValeur | null>(null)

/** Clé react-query de la session. */
export const CLE_ME = ["etic-auth", "me"] as const

export function useAuth(): AuthValeur {
  const valeur = use(AuthContext)
  if (!valeur) {
    throw new Error("useAuth() doit être appelé sous <AuthProvider>.")
  }
  return valeur
}
