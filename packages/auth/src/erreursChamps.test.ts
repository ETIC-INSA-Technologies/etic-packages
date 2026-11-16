import { describe, expect, it } from "vitest"

import { ErreurApi } from "./client"
import { erreursChamps } from "./erreursChamps"

describe("erreursChamps", () => {
  it("lit details.errors d'une ErreurApi 422", () => {
    const erreur = new ErreurApi(422, "validation_error", "Requête invalide.", {
      errors: [
        {
          loc: ["body", "phases", 0, "nb_jeh"],
          msg: "Doit être positif",
          type: "greater_than_equal",
        },
        { loc: ["query", "limit"], msg: "Trop grand", type: "less_than" },
      ],
    })
    expect(erreursChamps(erreur)).toEqual([
      {
        chemin: "body.phases.0.nb_jeh",
        msg: "Doit être positif",
        type: "greater_than_equal",
      },
      { chemin: "query.limit", msg: "Trop grand", type: "less_than" },
    ])
  })

  it("vide pour toute autre erreur", () => {
    expect(erreursChamps(new Error("x"))).toEqual([])
    expect(erreursChamps(null)).toEqual([])
    expect(
      erreursChamps(new ErreurApi(404, "not_found", "Introuvable"))
    ).toEqual([])
    expect(
      erreursChamps(
        new ErreurApi(422, "validation_error", "x", { errors: "?" })
      )
    ).toEqual([])
  })

  it("une entrée mal formée donne des champs vides, sans exception", () => {
    const erreur = new ErreurApi(422, "validation_error", "x", {
      errors: [null, { loc: "body", msg: "  ", type: 3 }, "texte"],
    })
    const vide = { chemin: "", msg: null, type: null }
    expect(erreursChamps(erreur)).toEqual([vide, vide, vide])
  })
})
