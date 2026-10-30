import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useEffectEvent, useMemo } from "react"
import { creerClientAuth, ErreurApi, PREFIXE_PAR_DEFAUT } from "./client"
import { AuthContext, CLE_ME, type AuthValeur } from "./context"
import { EVENEMENT_NON_AUTHENTIFIE } from "./evenements"
import { aPermission } from "./permissions"
import type { Me, Theme } from "./types"

export interface AuthProviderProps {
  children: React.ReactNode
  /** Préfixe des routes d'authentification du backend (`/api/v1/auth`). */
  prefixe?: string
  /** Appelé quand la session disparaît en cours de route (401 signalé) :
   *  l'application y branche sa navigation vers sa page de connexion. */
  surNonAuthentifie?: () => void
}

/**
 * Source unique de l'identité côté navigateur. La session est un cookie
 * httpOnly : le navigateur ne la lit pas, il la CONSTATE par `GET /me`. Le
 * backend introspecte le jeton à chaque requête, ce qui rend la révocation
 * immédiate sans que le navigateur connaisse une expiration.
 *
 * Doit être placé sous un `QueryClientProvider`.
 */
export function AuthProvider({
  children,
  prefixe = PREFIXE_PAR_DEFAUT,
  surNonAuthentifie,
}: AuthProviderProps) {
  const queryClient = useQueryClient()
  const client = useMemo(() => creerClientAuth(prefixe), [prefixe])

  const requete = useQuery<Me | null, ErreurApi>({
    queryKey: CLE_ME,
    queryFn: async ({ signal }) => {
      try {
        return await client.lireMe(signal)
      } catch (erreur) {
        // Pas de session : l'état normal avant connexion, pas une panne.
        if (erreur instanceof ErreurApi && erreur.status === 401) return null
        throw erreur
      }
    },
    retry: false,
    // Le serveur garde l'introspection 30 s : redemander plus souvent (à chaque
    // retour sur l'onglet) ne montrerait rien de plus. Une session coupée entre
    // deux se voit au premier 401 (`signalerNonAuthentifie`).
    staleTime: 30_000,
  })
  const me = requete.data ?? null

  const surEvenement = useEffectEvent(() => {
    queryClient.setQueryData(CLE_ME, null)
    surNonAuthentifie?.()
  })
  useEffect(() => {
    const ecouteur = () => surEvenement()
    globalThis.addEventListener(EVENEMENT_NON_AUTHENTIFIE, ecouteur)
    return () =>
      globalThis.removeEventListener(EVENEMENT_NON_AUTHENTIFIE, ecouteur)
  }, [])

  const deconnecter = useCallback(async () => {
    try {
      await client.deconnecter()
    } catch {
      // Même si le serveur échoue, l'état local est purgé : afficher une session
      // que l'utilisateur croit fermée serait pire.
    } finally {
      // Toutes les données de la session partent, sauf `me`, posée à `null` :
      // la retirer aussi détacherait le rendu, qui ne verrait pas la déconnexion.
      queryClient.setQueryData(CLE_ME, null)
      queryClient.removeQueries({
        predicate: (requete) => requete.queryKey[0] !== CLE_ME[0],
      })
    }
  }, [client, queryClient])

  const changerTheme = useCallback(
    async (theme: Theme) => {
      // Une relecture de `me` partie avant le changement ne doit pas le défaire.
      await queryClient.cancelQueries({ queryKey: CLE_ME })
      const avant = queryClient.getQueryData<Me | null>(CLE_ME)
      if (avant) {
        const apres: Me = { ...avant, preferences: { theme } }
        queryClient.setQueryData(CLE_ME, apres)
      }
      try {
        await client.modifierPreferences(theme)
      } catch (erreur) {
        if (avant) queryClient.setQueryData(CLE_ME, avant)
        throw erreur
      }
    },
    [client, queryClient]
  )

  const seConnecter = useCallback(
    (suivant?: string) => {
      const retour = suivant ?? pageCourante()
      globalThis.location.assign(client.urlConnexion(retour))
    },
    [client]
  )

  const rafraichir = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: CLE_ME })
  }, [queryClient])

  const valeur = useMemo<AuthValeur>(
    () => ({
      me,
      chargement: requete.isPending,
      erreur: requete.error ?? null,
      estSuperadmin: me?.is_superadmin ?? false,
      aPermission: (code) => aPermission(me, code),
      theme: me?.preferences?.theme ?? "system",
      changerTheme,
      seConnecter,
      deconnecter,
      rafraichir,
    }),
    [
      me,
      requete.isPending,
      requete.error,
      changerTheme,
      seConnecter,
      deconnecter,
      rafraichir,
    ]
  )

  return <AuthContext value={valeur}>{children}</AuthContext>
}

/** Page courante, sans le `?erreur=` d'un échec de connexion : il ne doit pas
 *  réapparaître une fois connecté. */
function pageCourante(): string {
  const parametres = new URLSearchParams(globalThis.location.search)
  parametres.delete("erreur")
  const requete = parametres.toString()
  return `${globalThis.location.pathname}${requete ? `?${requete}` : ""}`
}
