import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  FilteredEmptyState,
  useServerPagination,
  useServerSorting,
  type ServerPageRequete,
} from "@etic-ui/index"

describe("useServerPagination", () => {
  const page = (total: number, nombre: number): ServerPageRequete => ({
    data: { total, items: Array.from({ length: nombre }) },
  })

  it("rien avant la première page", () => {
    const { result } = renderHook(() =>
      useServerPagination({
        decalage: 0,
        limite: 25,
        onDecalageChange: vi.fn(),
        requete: {},
      })
    )
    expect(result.current).toEqual({})
  })

  it("compteur et pagination de la page reçue", () => {
    const onDecalageChange = vi.fn()
    const onLimiteChange = vi.fn()
    const { result } = renderHook(() =>
      useServerPagination({
        decalage: 25,
        limite: 25,
        onDecalageChange,
        onLimiteChange,
        requete: page(60, 25),
        unite: { singulier: "membre", pluriel: "membres" },
        feminin: true,
        limites: [25, 50],
      })
    )
    expect(result.current.compteur).toEqual({
      total: 60,
      decalage: 25,
      nombre: 25,
      unite: { singulier: "membre", pluriel: "membres" },
      feminin: true,
    })
    expect(result.current.pagination).toEqual({
      total: 60,
      decalage: 25,
      limite: 25,
      limites: [25, 50],
      onDecalageChange,
      onLimiteChange,
    })
  })

  it("ramène à la dernière page un décalage au-delà du total", () => {
    const onDecalageChange = vi.fn()
    renderHook(() =>
      useServerPagination({
        decalage: 100,
        limite: 25,
        onDecalageChange,
        requete: page(60, 0),
      })
    )
    expect(onDecalageChange).toHaveBeenCalledWith(50)
  })

  it("ignore une page conservée d'une requête précédente", () => {
    const onDecalageChange = vi.fn()
    renderHook(() =>
      useServerPagination({
        decalage: 100,
        limite: 25,
        onDecalageChange,
        requete: { ...page(60, 0), isPlaceholderData: true },
      })
    )
    expect(onDecalageChange).not.toHaveBeenCalled()
  })
})

describe("useServerSorting", () => {
  it("lit et écrit le tri du serveur", () => {
    const definirTri = vi.fn()
    const { result } = renderHook(() =>
      useServerSorting({ tri: "nom", sens: "desc", definirTri })
    )
    expect(result.current.tri).toEqual([{ id: "nom", desc: true }])
    expect(result.current.triManuel).toBe(true)

    act(() => result.current.onTriChange([{ id: "date", desc: false }]))
    expect(definirTri).toHaveBeenLastCalledWith("date", "asc")
    act(() => result.current.onTriChange(() => []))
    expect(definirTri).toHaveBeenLastCalledWith(null, "asc")
  })
})

describe("FilteredEmptyState", () => {
  it("propose de retirer les filtres", async () => {
    const onReinitialiser = vi.fn()
    render(<FilteredEmptyState onReinitialiser={onReinitialiser} />)
    expect(
      screen.getByText("Aucun résultat pour ces filtres")
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "Réinitialiser les filtres" })
    )
    expect(onReinitialiser).toHaveBeenCalledOnce()
  })
})
