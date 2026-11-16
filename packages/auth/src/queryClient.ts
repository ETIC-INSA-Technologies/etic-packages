import { QueryClient } from "@tanstack/react-query"

import { ErreurApi } from "./client"

export interface OptionsQueryClient {
  /** Durée (ms) pendant laquelle une donnée lue reste fraîche : 30 s par
   *  défaut. `0` relit à chaque montage d'un composant qui l'utilise. */
  staleTime?: number
}

/**
 * Vrai si une lecture qui a échoué doit être retentée : une seule nouvelle
 * tentative, et jamais sur un refus (`ErreurApi` 4xx). Rejouer un 401, un
 * 403 ou un 404 ne peut pas réussir : cela retarderait l'affichage de
 * l'erreur et doublerait l'appel. Le budget est réservé aux pannes (réseau,
 * délai dépassé, 5xx).
 */
export function lectureARetenter(nbEchecs: number, erreur: unknown): boolean {
  if (
    erreur instanceof ErreurApi &&
    erreur.status >= 400 &&
    erreur.status < 500
  )
    return false
  return nbEchecs < 1
}

/**
 * Le `QueryClient` des applications ETIC, même politique de cache partout :
 *
 * - une lecture qui échoue est retentée une fois, sauf un refus 4xx
 *   (`lectureARetenter`) ;
 * - pas de relecture au retour sur l'onglet (`refetchOnWindowFocus`) ;
 * - une donnée lue reste fraîche 30 s (`staleTime`, en option) ;
 * - une mutation n'est jamais rejouée : une écriture reste une action
 *   unique, que l'utilisateur relance lui-même.
 *
 * À créer une fois, au niveau du module ou dans un `useState`, et à donner à
 * `QueryClientProvider`.
 *
 * ```tsx
 * const queryClient = creerQueryClient()
 * <QueryClientProvider client={queryClient}>…</QueryClientProvider>
 * ```
 */
export function creerQueryClient({
  staleTime = 30_000,
}: OptionsQueryClient = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: lectureARetenter,
        refetchOnWindowFocus: false,
        staleTime,
      },
      mutations: { retry: false },
    },
  })
}
