import { describe, expect, it } from "vitest"

import {
  comparerFr,
  correspondance,
  NO_AUTOFILL,
  normaliser,
  normaliserRecherche,
} from "@etic-ui/index"

describe("normaliser", () => {
  it("retire accents et casse", () => {
    expect(normaliser("Pôle Qualité")).toBe("pole qualite")
    expect(normaliser("TRÉSORIER")).toBe("tresorier")
    expect(normaliser("Ça déçoit, Noël")).toBe("ca decoit, noel")
  })

  it("laisse le reste intact, espaces compris", () => {
    expect(normaliser("member.created")).toBe("member.created")
    expect(normaliser(" a b ")).toBe(" a b ")
  })
})

describe("correspondance", () => {
  it("trouve la recherche dans l'un des textes, sans accents ni casse", () => {
    const correspond = correspondance("  etude ")
    expect(correspond("Étude de marché")).toBe(true)
    expect(correspond("Client", "ÉTUDES 2026")).toBe(true)
    expect(correspond("Client", null, undefined)).toBe(false)
  })

  it("laisse tout passer pour une recherche vide", () => {
    expect(correspondance("")("x")).toBe(true)
    expect(correspondance("   ")()).toBe(true)
  })
})

describe("normaliserRecherche et comparerFr", () => {
  it("normalise et rogne une recherche ; vide, elle ne filtre rien", () => {
    expect(normaliserRecherche("  Élève ")).toBe("eleve")
    expect(normaliserRecherche("   ")).toBe("")
  })

  it("trie à la française : accents à leur place, nombres à leur valeur", () => {
    expect(
      ["Zélateur", "élève", "Poste 10", "Directeur", "Poste 2"].sort(comparerFr)
    ).toEqual(["Directeur", "élève", "Poste 2", "Poste 10", "Zélateur"])
  })
})

describe("NO_AUTOFILL", () => {
  it("porte l'attribut de chaque gestionnaire de mots de passe", () => {
    expect(NO_AUTOFILL).toEqual({
      autoComplete: "off",
      "data-1p-ignore": true,
      "data-lpignore": "true",
      "data-bwignore": true,
    })
  })
})
