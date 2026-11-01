/**
 * Origine du dernier focus : une vraie navigation au clavier (Tab, flèches
 * d'un groupe…) ou autre chose. Un popup qui se ferme (menu, calendrier,
 * dialogue) rend le focus à son déclencheur après Échap, Entrée ou un clic :
 * ce focus n'est pas une navigation, et une infobulle qui s'y ouvrirait
 * absorberait l'Échap suivant (celui qui doit fermer le dialogue englobant).
 *
 * Suivi au niveau de la fenêtre, en phase de capture (avant qu'un composant
 * n'arrête l'évènement) : un seul abonnement, posé au premier usage et
 * jamais retiré (deux écouteurs qui ne font qu'écrire une variable).
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
let suivi = false

/** Pose les écouteurs une fois, côté navigateur seulement (rien en SSR). */
function suivre() {
  if (suivi || typeof window === "undefined") return
  suivi = true
  window.addEventListener(
    "keydown",
    (event) => {
      if (MODIFICATEURS.has(event.key)) return
      derniereEntree = TOUCHES_DE_NAVIGATION.has(event.key)
        ? "navigation"
        : "autre"
    },
    true
  )
  window.addEventListener(
    "pointerdown",
    () => {
      derniereEntree = "autre"
    },
    true
  )
}

/**
 * Vrai si le focus qui arrive suit une touche de navigation, ou si aucune
 * entrée n'a encore été vue (focus au chargement de la page : le
 * comportement par défaut s'applique). Faux après Échap ou Entrée qui
 * ferment un popup, un clic, une frappe.
 */
export function focusParNavigation(): boolean {
  return derniereEntree !== "autre"
}

/** Oublie la dernière entrée : entre deux tests (`test/setup.ts`), pour
 *  qu'un clic d'un test ne décide pas du focus du suivant. */
export function oublierDerniereEntree() {
  derniereEntree = null
}

/**
 * Pour un composant qui s'ouvre au focus (infobulle, `Toggletip`) : démarre
 * le suivi dès son rendu et rend `focusParNavigation`, à consulter dans son
 * `onFocus`.
 */
export function useOuvertureAuFocusClavier(): () => boolean {
  suivre()
  return focusParNavigation
}
