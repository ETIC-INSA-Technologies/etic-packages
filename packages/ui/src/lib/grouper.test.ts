import { describe, expect, it } from "vitest"

import { grouperPar } from "@etic-ui/index"

describe("grouperPar", () => {
  const elements = [
    { nom: "b1", type: "b", libelle: "Bêta" },
    { nom: "a1", type: "a", libelle: "Alpha" },
    { nom: "b2", type: "b", libelle: "Bêta (autre)" },
  ]

  it("garde l'ordre d'apparition, des groupes et de leurs éléments", () => {
    const groupes = grouperPar(
      elements,
      (e) => e.type,
      (e) => e.libelle
    )
    expect(groupes.map((g) => g.cle)).toEqual(["b", "a"])
    expect(groupes[0].elements.map((e) => e.nom)).toEqual(["b1", "b2"])
    // Le libellé est lu sur le premier élément du groupe.
    expect(groupes[0].libelle).toBe("Bêta")
  })

  it("liste vide : aucun groupe", () => {
    expect(
      grouperPar(
        [],
        () => "",
        () => ""
      )
    ).toEqual([])
  })
})
