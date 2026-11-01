import { afterEach, describe, expect, it, vi } from "vitest"

import {
  accorde,
  compte,
  formaterAnciennete,
  formaterDate,
  formaterDateHeure,
  formaterDateHeureLongue,
  formaterDuree,
  formaterDureeArrondie,
  formaterHorodatage,
  formaterOctets,
  nombreFr,
  participe,
} from "@etic-ui/index"

/** `Intl` sépare les milliers par une espace fine insécable : on compare les
 *  textes avec des espaces ordinaires. */
const espaces = (texte: string) => texte.replace(/\s/g, " ")

describe("accords et nombres", () => {
  it("met 0 et 1 au singulier, au-delà au pluriel", () => {
    expect(accorde(0, "ligne")).toBe("ligne")
    expect(accorde(1, "ligne")).toBe("ligne")
    expect(accorde(2, "ligne")).toBe("lignes")
    expect(accorde(2, "journal", "journaux")).toBe("journaux")
    expect(participe("supprimé", 3, true)).toBe("supprimées")
    expect(participe("supprimé", 1, false)).toBe("supprimé")
  })

  it("compte : le nombre au format français et le nom accordé", () => {
    expect(compte(0, "doublon")).toBe("0 doublon")
    expect(compte(1, "personne")).toBe("1 personne")
    expect(espaces(compte(1234, "ligne"))).toBe("1 234 lignes")
    expect(espaces(nombreFr(1234567))).toBe("1 234 567")
  })
})

describe("formaterOctets", () => {
  it("passe à l'unité supérieure par 1 024, une décimale sous 100", () => {
    expect(formaterOctets(0)).toBe("0 o")
    expect(formaterOctets(512)).toBe("512 o")
    expect(formaterOctets(1536)).toBe("1,5 Ko")
    expect(formaterOctets(1024 * 1024)).toBe("1 Mo")
    expect(formaterOctets(150 * 1024 * 1024)).toBe("150 Mo")
    expect(formaterOctets(3 * 1024 ** 5)).toBe(`${nombreFr(3 * 1024)} To`)
  })

  it("rend le repli sans valeur", () => {
    expect(formaterOctets(null)).toBe("—")
    expect(formaterOctets(undefined, "inconnu")).toBe("inconnu")
  })
})

describe("durées", () => {
  it("formaterDuree garde les deux plus grandes unités", () => {
    expect(formaterDuree(42.7)).toBe("42 s")
    expect(formaterDuree(15 * 60)).toBe("15 min")
    expect(formaterDuree(2 * 3600 + 15 * 60)).toBe("2 h 15 min")
    expect(formaterDuree(3 * 86400 + 4 * 3600 + 59)).toBe("3 j 4 h")
    expect(formaterDuree(null)).toBe("—")
  })

  it("formaterDureeArrondie ne garde que la plus grande", () => {
    expect(formaterDureeArrondie(3 * 86400 + 4 * 3600)).toBe("3 j")
    expect(formaterDureeArrondie(18 * 3600 + 59 * 60)).toBe("18 h")
    expect(formaterDureeArrondie(15 * 60 + 30)).toBe("15 min")
  })
})

describe("formaterAnciennete", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("dit l'ancienneté d'un instant, avec ou sans « il y a »", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-05T12:00:00Z"))
    const instant = "2026-07-02T08:00:00Z" // 3 j 4 h avant
    expect(formaterAnciennete(instant)).toBe("il y a 3 j 4 h")
    expect(formaterAnciennete(instant, { arrondie: true })).toBe("il y a 3 j")
    expect(formaterAnciennete(instant, { arrondie: true, ilYA: false })).toBe(
      "3 j"
    )
    expect(formaterAnciennete("2026-07-05T11:59:30Z")).toBe("à l'instant")
    expect(formaterAnciennete("2026-07-06T00:00:00Z")).toBe("à l'instant")
  })

  it("rend le repli sans valeur, et une valeur illisible telle quelle", () => {
    expect(formaterAnciennete(null)).toBe("—")
    expect(formaterAnciennete("", { repli: "jamais" })).toBe("jamais")
    expect(formaterAnciennete("pas-une-date")).toBe("pas-une-date")
  })
})

const formateursDeDate = [
  ["formaterDate", formaterDate],
  ["formaterDateHeure", formaterDateHeure],
  ["formaterHorodatage", formaterHorodatage],
  ["formaterDateHeureLongue", formaterDateHeureLongue],
] as const

describe.each(formateursDeDate)("%s", (_nom, formater) => {
  it("rend « — » pour une valeur absente, ou le repli donné", () => {
    expect(formater(null)).toBe("—")
    expect(formater(undefined)).toBe("—")
    expect(formater("")).toBe("—")
    expect(formater(null, "jamais")).toBe("jamais")
  })

  it("rend telle quelle une valeur illisible, pas « Invalid Date »", () => {
    expect(formater("pas-une-date")).toBe("pas-une-date")
  })
})

describe("dates en français", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("écrit chaque format en heure locale", () => {
    vi.stubEnv("TZ", "Europe/Paris")
    const instant = "2026-07-05T12:30:12Z" // 14:30:12 à Paris
    expect(formaterDate(instant)).toBe("05 juillet 2026")
    expect(formaterDateHeure(instant)).toBe("05/07/2026 14:30")
    expect(formaterHorodatage(instant)).toBe("05/07/2026 14:30:12")
    expect(espaces(formaterDateHeureLongue(instant))).toBe(
      "05 juillet 2026 à 14:30"
    )
  })

  it("garde le jour d'une date sans heure à l'ouest de Greenwich", () => {
    // Node relit le fuseau dès que `TZ` change.
    vi.stubEnv("TZ", "America/New_York")
    // Lue comme minuit UTC, ce serait le 4 juillet à New York.
    expect(formaterDate("2026-07-05")).toBe("05 juillet 2026")
  })

  it("seuls les formats avec heure portent une heure", () => {
    const instant = "2026-07-05T14:30:12Z"
    expect(formaterDate(instant)).not.toMatch(/\d:\d/)
    expect(formaterHorodatage(instant)).toMatch(/\d:\d/)
  })
})
