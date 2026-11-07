import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDebouncedSearch } from "@etic-ui/index"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("useDebouncedSearch", () => {
  it("recopie la saisie après une pause, sans les espaces de bord", () => {
    const onValeurChange = vi.fn()
    const { result } = renderHook(() => useDebouncedSearch("", onValeurChange))
    act(() => result.current[1]("ada "))
    expect(result.current[0]).toBe("ada ")
    expect(onValeurChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(300))
    expect(onValeurChange).toHaveBeenLastCalledWith("ada")
  })

  it("suit la valeur changée d'ailleurs", () => {
    const { result, rerender } = renderHook(
      ({ valeur }) => useDebouncedSearch(valeur, vi.fn()),
      { initialProps: { valeur: "ada" } }
    )
    rerender({ valeur: "" })
    expect(result.current[0]).toBe("")
  })

  it("recopierAuDemontage : la saisie en attente n'est pas perdue", () => {
    const onValeurChange = vi.fn()
    const { result, unmount } = renderHook(() =>
      useDebouncedSearch("", onValeurChange, { recopierAuDemontage: true })
    )
    act(() => result.current[1]("grace"))
    unmount()
    expect(onValeurChange).toHaveBeenLastCalledWith("grace")
  })
})
