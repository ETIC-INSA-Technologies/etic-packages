/**
 * Origine du dernier focus : une vraie navigation au clavier (Tab, flèches
 * d'un groupe…) ou autre chose. Un popup qui se ferme (menu, calendrier,
 * dialogue) rend le focus à son déclencheur après Échap, Entrée ou un clic :
 * ce focus n'est pas une navigation, et une infobulle qui s'y ouvrirait
 * absorberait l'Échap suivant (celui qui doit fermer le dialogue englobant).
 *
 * Suivi au niveau de la fenêtre, en phase de capture (avant qu'un composant
 * n'arrête l'évènement), et seulement tant qu'un composant s'y abonne.
 */

const TOUCHES_DE_NAVIGATION = new Set([
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
])

/** Seules, elles ne déplacent rien : Maj+Tab reste une navigation. */
const MODIFICATEURS = new Set(["Shift", "Control", "Alt", "Meta"])

let derniereEntree: "navigation" | "autre" | null = null
let abonnes = 0

function surTouche(event: KeyboardEvent) {
  if (MODIFICATEURS.has(event.key)) return
  derniereEntree = TOUCHES_DE_NAVIGATION.has(event.key) ? "navigation" : "autre"
}

function surPointeur() {
  derniereEntree = "autre"
}

/** Commence le suivi des entrées ; renvoie de quoi l'arrêter (à rendre par
 *  un `useEffect`). */
export function suivreNavigationClavier(): () => void {
  if (abonnes++ === 0) {
    window.addEventListener("keydown", surTouche, true)
    window.addEventListener("pointerdown", surPointeur, true)
  }
  return () => {
    if (--abonnes > 0) return
    window.removeEventListener("keydown", surTouche, true)
    window.removeEventListener("pointerdown", surPointeur, true)
    derniereEntree = null
  }
}

/**
 * Vrai si le focus qui arrive suit autre chose qu'une touche de navigation :
 * Échap ou Entrée qui ferment un popup, un clic, une frappe. Faux tant
 * qu'aucune entrée n'a été vue (focus au chargement de la page) : le
 * comportement par défaut s'applique alors.
 */
export function focusHorsNavigation(): boolean {
  return derniereEntree === "autre"
}
