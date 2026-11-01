import { describe, expect, it } from "vitest"

import { ordonner, replacer } from "@etic-ui/lib/ordre-colonnes"

describe("ordonner", () => {
  it("cités d'abord, inconnus et doublons ignorés, puis le reste", () => {
    expect(ordonner(["c", "x", "a", "c", 3], ["a", "b", "c", "d"])).toEqual([
      "c",
      "a",
      "b",
      "d",
    ])
    expect(ordonner(undefined, ["a", "b"])).toEqual(["a", "b"])
  })
})

describe("replacer", () => {
  const deplacable = (id: string) => id !== "select" && id !== "nom"

  it("ne change de place que les colonnes déplaçables", () => {
    expect(
      replacer(["select", "a", "nom", "b", "c"], deplacable, ["c", "a", "b"])
    ).toEqual(["select", "c", "nom", "a", "b"])
  })

  it("ignore les colonnes fixes du nouvel ordre ; les oubliées suivent, sans doublon", () => {
    expect(
      replacer(["select", "a", "b", "c"], deplacable, [
        "nom",
        "b",
        "select",
        "b",
      ])
    ).toEqual(["select", "b", "a", "c"])
  })
})
