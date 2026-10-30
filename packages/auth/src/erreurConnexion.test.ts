import { describe, expect, it } from "vitest"
import { lireErreurConnexion } from "./erreurConnexion"

describe("lireErreurConnexion", () => {
  it("rien sans paramètre", () => {
    expect(lireErreurConnexion("?x=1")).toBeNull()
  })
  it("message rédigé pour un code connu", () => {
    expect(lireErreurConnexion("?erreur=account_disabled")?.message).toMatch(
      /désactivé/
    )
  })
  it("message générique, jamais le texte de l'URL", () => {
    const e = lireErreurConnexion("?erreur=%3Cscript%3E")
    expect(e?.code).toBe("<script>")
    expect(e?.message).not.toContain("<script>")
  })
  it("ignore les propriétés héritées", () => {
    expect(lireErreurConnexion("?erreur=toString")?.message).toMatch(/Relancez/)
  })
  it("prend les messages de l'application en priorité", () => {
    expect(
      lireErreurConnexion("?erreur=account_alumni", {
        account_alumni: "Message propre à l'application.",
      })?.message
    ).toBe("Message propre à l'application.")
  })
})
