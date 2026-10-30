import { describe, expect, it } from "vitest"
import { aPermission } from "./permissions"

describe("aPermission", () => {
  it("refuse sans principal", () => {
    expect(aPermission(null, "app.read")).toBe(false)
  })
  it("lit la liste déjà développée", () => {
    const p = { permissions: ["app.read"], is_superadmin: false }
    expect(aPermission(p, "app.read")).toBe(true)
    expect(aPermission(p, "app.write")).toBe(false)
  })
  it("n'invente pas de joker", () => {
    expect(aPermission({ permissions: ["*"], is_superadmin: false }, "x")).toBe(
      false
    )
  })
  it("ouvre tout au superadministrateur", () => {
    expect(aPermission({ permissions: [], is_superadmin: true }, "x")).toBe(
      true
    )
  })
})
