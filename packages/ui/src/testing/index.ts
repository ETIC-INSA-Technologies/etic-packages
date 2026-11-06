// Outils de test des applications : `@etic-insa/ui/test`. Hors de l'index
// principal, ils n'entrent jamais dans le bundle d'une application.
import { MOBILE_MEDIA_QUERY } from "@etic-ui/hooks/use-mobile"

type Ecouteur = (evenement: MediaQueryListEvent) => void

const ecouteurs = new Set<Ecouteur>()
let mobile = false

/**
 * Passe l'affichage en mobile (`true`) ou en bureau (`false`) pour la
 * doublure posée par {@link installMatchMedia}. Les composants abonnés
 * (`useIsMobile`, `AppShell`…) se redessinent aussitôt : sur un composant
 * déjà monté, l'appeler dans un `act()`.
 */
export function setMobileViewport(valeur: boolean): void {
  if (mobile === valeur) return
  mobile = valeur
  const evenement = {
    matches: valeur,
    media: MOBILE_MEDIA_QUERY,
  } as MediaQueryListEvent
  for (const ecouteur of ecouteurs) ecouteur(evenement)
}

/**
 * Remplace `window.matchMedia` par une doublure pilotable : le `matchMedia`
 * de jsdom n'existe pas, celui de happy-dom suit une fenêtre fixe de
 * 1 024 px, donc mobile pour la bibliothèque. Seule la requête de
 * `useIsMobile` (`MOBILE_MEDIA_QUERY`) est connue ; toute autre est réputée
 * ne pas correspondre. Affichage de bureau au départ.
 *
 * À appeler une fois dans le fichier de mise en place des tests, avec
 * `beforeEach(() => setMobileViewport(false))` pour que chaque test parte du
 * bureau.
 */
export function installMatchMedia(): void {
  const matchMedia = (media: string): MediaQueryList => {
    const estMobile = media === MOBILE_MEDIA_QUERY
    return {
      media,
      // Un accesseur, pas une valeur : une liste gardée reflète l'état
      // courant à chaque lecture.
      get matches() {
        return estMobile && mobile
      },
      onchange: null,
      addEventListener: (
        _type: string,
        ecouteur: EventListenerOrEventListenerObject
      ) => {
        if (estMobile && typeof ecouteur === "function")
          ecouteurs.add(ecouteur as Ecouteur)
      },
      removeEventListener: (
        _type: string,
        ecouteur: EventListenerOrEventListenerObject
      ) => {
        if (typeof ecouteur === "function")
          ecouteurs.delete(ecouteur as Ecouteur)
      },
      // API historique, exigée par le type.
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList
  }
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: matchMedia,
  })
}
