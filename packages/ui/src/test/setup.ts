import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

import { oublierDerniereEntree } from "@etic-ui/lib/navigation-clavier"

afterEach(() => {
  cleanup()
  // Le suivi du clavier est global à la page : chaque test repart sans
  // entrée vue, comme une page qui vient de charger.
  oublierDerniereEntree()
})

// jsdom n'a pas `checkVisibility` (tous les navigateurs visés l'ont), et son
// `getClientRects` est toujours vide : sans ce substitut, tout élément y
// paraîtrait masqué. Il suit `display: none` (style ou attribut `hidden`)
// jusqu'à la racine, ce que jsdom calcule.
if (typeof HTMLElement.prototype.checkVisibility !== "function") {
  const affiche = (element: HTMLElement | null): boolean =>
    !element ||
    (!element.hidden &&
      getComputedStyle(element).display !== "none" &&
      affiche(element.parentElement))
  HTMLElement.prototype.checkVisibility = function (this: HTMLElement) {
    return affiche(this)
  }
}
