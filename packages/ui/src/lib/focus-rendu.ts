/**
 * Focus *rendu* par un popup qui se ferme. Un menu, un calendrier ou un
 * dialogue rendent le focus à leur déclencheur en se fermant (Échap, un
 * choix, « Annuler ») : une infobulle qui s'ouvrirait sur ce focus
 * absorberait l'Échap suivant, celui qui doit fermer le dialogue englobant.
 *
 * Reconnu sans écouteur global, d'après le déclencheur lui-même :
 * - il a perdu le focus alors que son popup était ouvert
 *   (`aria-expanded="true"` : le focus est parti dans le popup), et le
 *   retrouve sans venir d'un autre élément de la page (`relatedTarget`
 *   vide : le popup a déjà disparu) ;
 * - ou le focus vient d'un élément placé dans un popup (menu, liste,
 *   dialogue…) qui ne contient pas le déclencheur : le popup, encore là, le
 *   rend.
 *
 * Tout autre focus clavier (Tab, Entrée qui ouvre un dialogue et y place le
 * focus) ouvre l'infobulle comme avant. Le clic, lui, est écarté par Base UI
 * (`:focus-visible`).
 */

/** Conteneurs de popup de Base UI et de shadcn, par leur rôle. */
const POPUP =
  '[role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"]'

/** Déclencheurs qui ont perdu le focus au profit de leur popup ouvert. */
const partisDansLeurPopup = new WeakSet<Element>()

/** À appeler quand le déclencheur perd le focus. */
export function noterDepartDuFocus(declencheur: Element) {
  if (declencheur.getAttribute("aria-expanded") === "true")
    partisDansLeurPopup.add(declencheur)
  else partisDansLeurPopup.delete(declencheur)
}

/** À appeler quand le déclencheur reçoit le focus : vrai si ce focus est
 *  rendu par un popup qui se ferme. */
export function focusRenduParUnPopup(
  declencheur: Element,
  precedent: EventTarget | null
): boolean {
  const parti = partisDansLeurPopup.has(declencheur)
  partisDansLeurPopup.delete(declencheur)
  if (!(precedent instanceof Element)) return parti
  const popup = precedent.closest(POPUP)
  return popup !== null && !popup.contains(declencheur)
}
