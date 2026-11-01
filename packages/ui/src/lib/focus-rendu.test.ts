import { describe, expect, it } from "vitest"

import { focusRenduParUnPopup, noterDepartDuFocus } from "./focus-rendu"

function page() {
  document.body.innerHTML = `
    <button id="avant">Avant</button>
    <button id="declencheur" aria-haspopup="menu" aria-expanded="false">Thème</button>
    <div role="menu"><div role="menuitem" id="entree" tabindex="-1">Sombre</div></div>
    <div role="dialog"><button id="champ">Champ</button><button id="voisin">Voisin</button></div>`
  const $ = (id: string) => document.getElementById(id)!
  return { $ }
}

describe("focusRenduParUnPopup", () => {
  it("vrai quand le focus vient d'un popup qui ne contient pas la cible", () => {
    const { $ } = page()
    expect(focusRenduParUnPopup($("declencheur"), $("entree"))).toBe(true)
  })

  it("faux pour une tabulation depuis la page ou dans le même dialogue", () => {
    const { $ } = page()
    expect(focusRenduParUnPopup($("declencheur"), $("avant"))).toBe(false)
    expect(focusRenduParUnPopup($("voisin"), $("champ"))).toBe(false)
  })

  it("sans élément d'origine : vrai seulement si le déclencheur est parti dans son popup ouvert", () => {
    const { $ } = page()
    const declencheur = $("declencheur")
    // Tab depuis le haut de la page : pas d'origine, pas de départ noté.
    expect(focusRenduParUnPopup(declencheur, null)).toBe(false)
    declencheur.setAttribute("aria-expanded", "true")
    noterDepartDuFocus(declencheur)
    declencheur.setAttribute("aria-expanded", "false")
    expect(focusRenduParUnPopup(declencheur, null)).toBe(true)
    // Noté une fois seulement.
    expect(focusRenduParUnPopup(declencheur, null)).toBe(false)
  })
})
