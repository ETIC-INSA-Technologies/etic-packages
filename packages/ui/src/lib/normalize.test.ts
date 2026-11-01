import { describe, expect, it } from "vitest"

import { correspondance, NO_AUTOFILL, normaliser } from "@etic-ui/index"

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
