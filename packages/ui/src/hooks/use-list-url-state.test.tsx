import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { useListUrlState, type UseListUrlStateOptions } from "@etic-ui/index"

const CLES_TRI = ["nom", "date"] as const
type Cle = (typeof CLES_TRI)[number]

/** Le hook branché sur un faux routeur : l'URL vit dans un état React. */
function rendre(
  depart: string,
  options: Partial<UseListUrlStateOptions<Cle>> = {}
) {
  const ecritures: string[] = []
  const rendu = renderHook(() => {
    const [params, setParams] = useState(() => new URLSearchParams(depart))
    const liste = useListUrlState({
      params,
      onParamsChange: (p) => {
        ecritures.push(p.toString())
        setParams(p)
      },
      clesTri: CLES_TRI,
      tri: "nom",
      sens: "asc",
      ...options,
    })
    return { liste, url: params.toString() }
  })
  return { ...rendu, ecritures }
}

describe("useListUrlState", () => {
  it("relit l'URL, et retombe sur les défauts pour une valeur inconnue", () => {
    const bon = rendre("offset=50&limit=100&tri=date&sens=desc&groupe=ca")
    expect(bon.result.current.liste).toMatchObject({
      decalage: 50,
      limite: 100,
      tri: "date",
      sens: "desc",
      filtresActifs: 1,
    })
    expect(bon.result.current.liste.filtre("groupe")).toBe("ca")
    expect(bon.result.current.liste.filtre("statut")).toBe("")

    const abime = rendre("offset=-3&limit=7&tri=inconnu&sens=haut")
    expect(abime.result.current.liste).toMatchObject({
      decalage: 0,
      limite: 25,
      tri: "nom",
      sens: "asc",
      filtresActifs: 0,
    })

    for (const offset of ["Infinity", "abc", "1e400"]) {
      const { result } = rendre(`offset=${offset}`)
      expect(result.current.liste.decalage, offset).toBe(0)
    }
  })

  it("un filtre revient en première page, la pagination la garde", () => {
    const { result } = rendre("offset=50")
    act(() => result.current.liste.definirDecalage(75))
    expect(result.current.url).toBe("offset=75")
    act(() => result.current.liste.definirFiltre("groupe", "ca"))
    expect(result.current.url).toBe("groupe=ca")
    act(() => result.current.liste.definirFiltre("groupe", ""))
    expect(result.current.url).toBe("")
  })

  it("n'écrit pas les valeurs par défaut", () => {
    const { result } = rendre("tri=date&sens=desc&limit=50")
    act(() => result.current.liste.definirTri("nom", "asc"))
    act(() => result.current.liste.definirLimite(25))
    expect(result.current.url).toBe("")
    act(() => result.current.liste.definirTri("date", "asc"))
    expect(result.current.url).toBe("tri=date&sens=asc")
    act(() => result.current.liste.definirTri(null, "asc"))
    expect(result.current.url).toBe("")
  })

  it("additionne les réglages faits dans le même geste", () => {
    const { result } = rendre("recherche=x&offset=25")
    act(() => {
      result.current.liste.definirFiltre("statut", "actif")
      result.current.liste.definirFiltre("groupe", "ca")
      result.current.liste.definirVue("membre", "3")
    })
    const params = new URLSearchParams(result.current.url)
    expect(Object.fromEntries(params)).toEqual({
      recherche: "x",
      statut: "actif",
      groupe: "ca",
      membre: "3",
    })
  })

  it("réinitialise les filtres en gardant disposition et vue", () => {
    const { result } = rendre(
      "recherche=x&groupe=ca&tri=date&sens=desc&limit=50&offset=50&membre=3",
      { vue: ["membre"] }
    )
    expect(result.current.liste.filtresActifs).toBe(2)
    act(() => result.current.liste.reinitialiserFiltres())
    expect(result.current.url).toBe("tri=date&sens=desc&limit=50&membre=3")
    expect(result.current.liste.recherche).toBe("")
    expect(result.current.liste.filtresActifs).toBe(0)
  })

  it("recopie la recherche après la pause de frappe", () => {
    vi.useFakeTimers()
    try {
      const { result, ecritures } = rendre("offset=50")
      act(() => result.current.liste.saisirRecherche("dup"))
      expect(result.current.liste.recherche).toBe("dup")
      // Comptée dès la frappe, écrite seulement après la pause.
      expect(result.current.liste.filtresActifs).toBe(1)
      expect(ecritures).toEqual([])
      act(() => vi.advanceTimersByTime(300))
      expect(result.current.url).toBe("recherche=dup")
    } finally {
      vi.useRealTimers()
    }
  })

  it("garde les mêmes fonctions d'un rendu à l'autre et n'écrit pas une URL inchangée", () => {
    const { result, ecritures } = rendre("")
    const avant = result.current.liste
    act(() => result.current.liste.definirDecalage(25))
    const apres = result.current.liste
    for (const cle of [
      "definirDecalage",
      "definirLimite",
      "definirTri",
      "definirFiltre",
      "definirVue",
      "reinitialiserFiltres",
    ] as const) {
      expect(apres[cle], cle).toBe(avant[cle])
    }
    act(() => result.current.liste.definirDecalage(25))
    expect(ecritures).toEqual(["offset=25"])
  })
})
