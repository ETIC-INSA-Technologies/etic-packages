import { act, render, renderHook, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  MOBILE_MEDIA_QUERY,
  useDebouncedValue,
  useIsMobile,
} from "@etic-ui/index"
import {
  installMatchMedia,
  setMobileViewport,
  setSearchDelay,
} from "@etic-ui/testing"

describe("pause de frappe des recherches (@etic-insa/ui/test)", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    setSearchDelay()
    vi.useRealTimers()
  })

  function differee(delai?: number) {
    return renderHook(({ valeur }) => useDebouncedValue(valeur, delai), {
      initialProps: { valeur: "a" },
    })
  }

  it("règle la pause par défaut, sans attente une fois à 0", () => {
    setSearchDelay(0)
    const { result, rerender } = differee()
    rerender({ valeur: "ab" })
    act(() => vi.advanceTimersByTime(0))
    expect(result.current).toBe("ab")
  })

  it("garde 300 ms par défaut, et respecte un délai explicite", () => {
    const parDefaut = differee()
    parDefaut.rerender({ valeur: "ab" })
    act(() => vi.advanceTimersByTime(299))
    expect(parDefaut.result.current).toBe("a")

    setSearchDelay(0)
    const explicite = differee(150)
    explicite.rerender({ valeur: "ab" })
    act(() => vi.advanceTimersByTime(149))
    expect(explicite.result.current).toBe("a")
    act(() => vi.advanceTimersByTime(1))
    expect(explicite.result.current).toBe("ab")
  })

  it("refuse une pause qui n'est pas un nombre de millisecondes", () => {
    expect(() => setSearchDelay(-1)).toThrow(RangeError)
    expect(() => setSearchDelay(Number.NaN)).toThrow(RangeError)
  })
})

function Affichage() {
  return <p>{useIsMobile() ? "mobile" : "bureau"}</p>
}

describe("doublure de matchMedia (@etic-insa/ui/test)", () => {
  beforeEach(() => {
    installMatchMedia()
    setMobileViewport(false)
  })

  it("part du bureau et bascule les composants montés", () => {
    render(<Affichage />)
    expect(screen.getByText("bureau")).toBeInTheDocument()
    act(() => setMobileViewport(true))
    expect(screen.getByText("mobile")).toBeInTheDocument()
    act(() => setMobileViewport(false))
    expect(screen.getByText("bureau")).toBeInTheDocument()
  })

  it("ne connaît que la requête mobile de la bibliothèque", () => {
    setMobileViewport(true)
    expect(window.matchMedia(MOBILE_MEDIA_QUERY).matches).toBe(true)
    expect(window.matchMedia("(prefers-color-scheme: dark)").matches).toBe(
      false
    )
  })

  it("une liste gardée suit l'état courant", () => {
    const liste = window.matchMedia(MOBILE_MEDIA_QUERY)
    expect(liste.matches).toBe(false)
    setMobileViewport(true)
    expect(liste.matches).toBe(true)
  })
})
