import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"
import { appliquerTheme } from "@etic-ui/theme"
import { setMobileViewport, setSearchDelay } from "@etic-ui/testing"

afterEach(() => {
  cleanup()
})

// Ce fichier s'exécute au début de chaque fichier de test. Avec `isolate:
// false` (vite.config.ts), les fichiers d'un même worker partagent leurs
// modules et leur DOM : chacun repart ici d'un état neuf, quel que soit
// l'ordre dans lequel ils passent.
vi.useRealTimers()
vi.unstubAllGlobals()
vi.unstubAllEnvs()
vi.restoreAllMocks()
setSearchDelay()
setMobileViewport(false)
delete (window as { matchMedia?: unknown }).matchMedia
appliquerTheme("system")
localStorage.clear()
sessionStorage.clear()
for (const cookie of document.cookie.split(";")) {
  const nom = cookie.split("=")[0].trim()
  if (nom) document.cookie = `${nom}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}
window.history.replaceState(null, "", "/")
for (const racine of [document.documentElement, document.body])
  for (const { name } of [...racine.attributes]) racine.removeAttribute(name)
document.head.replaceChildren()
document.body.replaceChildren()

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
