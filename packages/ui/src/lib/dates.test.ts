import { afterEach, describe, expect, it, vi } from "vitest"

import { ecrireDateIso, lireDateIso } from "@etic-ui/index"

describe("lireDateIso / ecrireDateIso", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("lit une date ISO en heure locale, sans décalage de fuseau", () => {
    vi.stubEnv("TZ", "America/New_York")
    const date = lireDateIso("2001-05-04")!
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2001, 4, 4,
    ])
    expect(date.getHours()).toBe(0)
  })

  it("fait l'aller-retour, même à minuit et en fin de journée", () => {
    vi.stubEnv("TZ", "Europe/Paris")
    expect(ecrireDateIso(lireDateIso("1999-12-31"))).toBe("1999-12-31")
    expect(ecrireDateIso(new Date(2026, 0, 1, 23, 59))).toBe("2026-01-01")
    expect(ecrireDateIso(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01")
  })

  it("garde les années à moins de quatre chiffres (pas de 1900 implicite)", () => {
    expect(lireDateIso("0050-03-01")!.getFullYear()).toBe(50)
    expect(ecrireDateIso(lireDateIso("0050-03-01"))).toBe("0050-03-01")
  })

  it("rend undefined ou null sans date lisible", () => {
    expect(lireDateIso(null)).toBeUndefined()
    expect(lireDateIso(undefined)).toBeUndefined()
    expect(lireDateIso("")).toBeUndefined()
    expect(lireDateIso("04/05/2001")).toBeUndefined()
    expect(lireDateIso("2001-05-04T10:00:00Z")).toBeUndefined()
    expect(lireDateIso("2001-02-31")).toBeUndefined()
    expect(ecrireDateIso(undefined)).toBeNull()
    expect(ecrireDateIso(null)).toBeNull()
    expect(ecrireDateIso(new Date(Number.NaN))).toBeNull()
  })
})
