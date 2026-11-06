import { act, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { MOBILE_MEDIA_QUERY, useIsMobile } from "@etic-ui/index"
import { installMatchMedia, setMobileViewport } from "@etic-ui/testing"

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
