import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDebouncedValue, useDocumentTitle } from "@etic-ui/index"

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("recopie la valeur après le délai de silence, une fois par pause", () => {
    const { result, rerender } = renderHook(
      ({ valeur }: { valeur: string }) => useDebouncedValue(valeur),
      { initialProps: { valeur: "" } }
    )
    expect(result.current).toBe("")

    rerender({ valeur: "a" })
    act(() => vi.advanceTimersByTime(200))
    rerender({ valeur: "ab" })
    act(() => vi.advanceTimersByTime(299))
    // Chaque frappe relance l'attente : rien n'est encore recopié.
    expect(result.current).toBe("")

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe("ab")
  })

  it("suit le délai donné", () => {
    const { result, rerender } = renderHook(
      ({ valeur }: { valeur: number }) => useDebouncedValue(valeur, 1000),
      { initialProps: { valeur: 1 } }
    )
    rerender({ valeur: 2 })
    act(() => vi.advanceTimersByTime(999))
    expect(result.current).toBe(1)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(2)
  })
})

describe("useDocumentTitle", () => {
  it("pose le titre de l'onglet et rend le précédent au démontage", () => {
    document.title = "Application"
    const { rerender, unmount } = renderHook(
      ({ titre }: { titre: string }) => useDocumentTitle(titre),
      { initialProps: { titre: "Page introuvable" } }
    )
    expect(document.title).toBe("Page introuvable")

    rerender({ titre: "Connexion" })
    expect(document.title).toBe("Connexion")

    unmount()
    expect(document.title).toBe("Application")
  })
})
