import { describe, expect, it } from "vitest"
import {
  emailDistinct,
  LIBELLE_SESSION_INCONNUE,
  nomAffichage,
} from "./nomAffichage"

const base = { membre_id: "m1", email: "a@b.fr", nom_affichage: "Ada L" }

describe("nomAffichage", () => {
  it("préfère le nom d'ETIC Members", () => {
    expect(nomAffichage(base)).toBe("Ada L")
    expect(emailDistinct(base)).toBe("a@b.fr")
  })
  it("retombe sur l'e-mail, sans le répéter", () => {
    const me = { ...base, nom_affichage: "  " }
    expect(nomAffichage(me)).toBe("a@b.fr")
    expect(emailDistinct(me)).toBeNull()
  })
  it("puis sur l'identifiant, puis sur un libellé", () => {
    expect(nomAffichage({ ...base, nom_affichage: null, email: null })).toBe(
      "m1"
    )
    expect(nomAffichage(null)).toBe(LIBELLE_SESSION_INCONNUE)
  })
})
