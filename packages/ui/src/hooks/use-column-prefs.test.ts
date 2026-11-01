import { createElement, type ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import {
  PorteeStockageLocal,
  useColumnPrefs,
  usePersistedState,
  type UseColumnPrefsOptions,
} from "@etic-ui/index"

/** Enveloppe qui fournit la portée (la personne connectée). */
function dans(portee: string | null) {
  return ({ children }: { children: ReactNode }) =>
    createElement(PorteeStockageLocal, { portee }, children)
}

const STATUTS = ["actif", "ancien"] as const
type Statut = (typeof STATUTS)[number]
const estStatut = (v: unknown): v is Statut => STATUTS.includes(v as Statut)

beforeEach(() => localStorage.clear())

describe("usePersistedState", () => {
  it("garde la valeur choisie sous la clé de la personne connectée", () => {
    const { result } = renderHook(
      () =>
        usePersistedState<Statut>("statut", "actif", { accepter: estStatut }),
      { wrapper: dans("membre-a") }
    )
    expect(result.current[0]).toBe("actif")
    // Rien d'écrit tant que rien n'est choisi : la valeur par défaut peut
    // changer avec l'application.
    expect(localStorage.length).toBe(0)

    act(() => result.current[1]("ancien"))
    expect(result.current[0]).toBe("ancien")
    expect(localStorage.getItem("membre-a:statut")).toBe('"ancien"')

    // Une nouvelle visite relit la valeur.
    const visite = renderHook(
      () =>
        usePersistedState<Statut>("statut", "actif", { accepter: estStatut }),
      { wrapper: dans("membre-a") }
    )
    expect(visite.result.current[0]).toBe("ancien")
  })

  it("sépare les personnes d'un même navigateur, et relit au changement de compte", () => {
    let portee = "membre-a"
    const { result, rerender } = renderHook(() =>
      usePersistedState("statut", "actif", { portee })
    )
    act(() => result.current[1]("ancien"))

    // Une autre personne se connecte, sans rechargement : ses valeurs, dès
    // le premier rendu, pas celles de la précédente.
    portee = "membre-b"
    rerender()
    expect(result.current[0]).toBe("actif")
    act(() => result.current[1]((avant) => `${avant}!`))
    expect(localStorage.getItem("membre-b:statut")).toBe('"actif!"')
    expect(localStorage.getItem("membre-a:statut")).toBe('"ancien"')
  })

  it("écarte une valeur enregistrée devenue invalide, ou illisible", () => {
    localStorage.setItem("anon:statut", '"supprime"')
    const { result } = renderHook(() =>
      usePersistedState<Statut>("statut", "actif", { accepter: estStatut })
    )
    // Sans portée, la clé est préfixée par « anon ».
    expect(result.current[0]).toBe("actif")

    localStorage.setItem("anon:autre", "{pas du JSON")
    const illisible = renderHook(() => usePersistedState("autre", 3))
    expect(illisible.result.current[0]).toBe(3)
  })
})

const OPTIONS: UseColumnPrefsOptions = {
  cle: "membres:personnes",
  colonnes: ["email", "statut", "telephone"],
  visiblesParDefaut: ["email", "statut"],
}

describe("préférences relues", () => {
  const relire = (brute: unknown, options: UseColumnPrefsOptions) => {
    localStorage.setItem(`anon:${options.cle}`, JSON.stringify(brute))
    const { result } = renderHook(() => useColumnPrefs(options))
    return { order: result.current.ordre, visible: result.current.visibles }
  }

  it("reprend l'ancien format, retire les inconnues, ajoute les nouvelles", () => {
    expect(
      relire(["telephone", "fax"], {
        cle: "ancien",
        colonnes: ["email", "telephone"],
        visiblesParDefaut: ["email"],
      })
    ).toEqual({ order: ["email", "telephone"], visible: ["telephone"] })

    // Enregistré avant « poste » : affiché s'il l'est par défaut, à la fin ;
    // « statut », masqué exprès, le reste ; « telephone », nouveau mais
    // masqué par défaut, aussi.
    expect(
      relire(
        { order: ["statut", "email", "fax"], visible: ["email"] },
        {
          cle: "nouveau",
          colonnes: ["email", "statut", "telephone", "poste"],
          visiblesParDefaut: ["email", "statut", "poste"],
        }
      )
    ).toEqual({
      order: ["statut", "email", "telephone", "poste"],
      visible: ["email", "poste"],
    })
  })
})

describe("useColumnPrefs", () => {
  it("garde les colonnes de chaque personne, au format de Members", () => {
    const { result } = renderHook(() => useColumnPrefs(OPTIONS), {
      wrapper: dans("membre-a"),
    })
    expect(result.current.visibles).toEqual(["email", "statut"])
    act(() => result.current.basculer("telephone"))
    expect(result.current.visibles).toContain("telephone")
    expect(
      JSON.parse(localStorage.getItem("membre-a:membres:personnes")!)
    ).toEqual({
      order: ["email", "statut", "telephone"],
      visible: ["email", "statut", "telephone"],
    })

    const autre = renderHook(() => useColumnPrefs(OPTIONS), {
      wrapper: dans("membre-b"),
    })
    expect(autre.result.current.visibles).toEqual(["email", "statut"])
  })

  it("donne à useDataTable visibilité et ordre, colonnes fixes en tête", () => {
    const { result } = renderHook(() =>
      useColumnPrefs({ ...OPTIONS, fixesEnTete: ["select", "nom"] })
    )
    const { optionsTableau } = result.current
    expect(optionsTableau.visibiliteColonnes).toEqual({
      email: true,
      statut: true,
      telephone: false,
    })
    expect(optionsTableau.ordreColonnes).toEqual([
      "select",
      "nom",
      "email",
      "statut",
      "telephone",
    ])

    act(() =>
      result.current.optionsTableau.onVisibiliteColonnesChange((avant) => ({
        ...avant,
        statut: false,
      }))
    )
    expect(result.current.visibles).toEqual(["email"])

    act(() =>
      result.current.optionsTableau.onOrdreColonnesChange([
        "select",
        "nom",
        "telephone",
        "email",
        "statut",
      ])
    )
    expect(result.current.ordre).toEqual(["telephone", "email", "statut"])
  })

  it("laisse à leur place et dans leur état les colonnes indisponibles", () => {
    localStorage.setItem(
      "anon:membres:personnes",
      JSON.stringify({
        order: ["telephone", "email", "statut"],
        visible: ["telephone", "email"],
      })
    )
    // « telephone » n'est pas offert ici (droit manquant).
    const { result } = renderHook(() =>
      useColumnPrefs({ ...OPTIONS, disponibles: ["email", "statut"] })
    )
    expect(result.current.optionsTableau.visibiliteColonnes).toEqual({
      email: true,
      statut: false,
    })
    expect(result.current.optionsTableau.ordreColonnes).toEqual([
      "email",
      "statut",
    ])

    act(() =>
      result.current.optionsTableau.onVisibiliteColonnesChange({
        email: false,
        statut: true,
      })
    )
    act(() =>
      result.current.optionsTableau.onOrdreColonnesChange(["statut", "email"])
    )
    // « telephone » garde son état (affiché) et sa place (en tête).
    expect(result.current.visibles.sort()).toEqual(["statut", "telephone"])
    expect(result.current.ordre).toEqual(["telephone", "statut", "email"])
  })

  it("revient aux colonnes par défaut", () => {
    const { result } = renderHook(() => useColumnPrefs(OPTIONS))
    act(() => result.current.basculer("email"))
    act(() =>
      result.current.optionsTableau.onOrdreColonnesChange([
        "telephone",
        "email",
        "statut",
      ])
    )
    expect(result.current.ordre).toEqual(["telephone", "email", "statut"])
    act(() => result.current.reinitialiser())
    expect(result.current.visibles).toEqual(["email", "statut"])
    expect(result.current.ordre).toEqual(["email", "statut", "telephone"])
  })

  it("rend des options stables tant que rien ne change, même pour des listes écrites en ligne", () => {
    const { result, rerender } = renderHook(() =>
      useColumnPrefs({
        cle: "stable",
        colonnes: ["email", "statut"],
        visiblesParDefaut: ["email"],
      })
    )
    const avant = result.current.optionsTableau
    rerender()
    expect(result.current.optionsTableau).toBe(avant)
  })
})
