import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CenteredScreen } from "@etic-ui/index"

describe("CenteredScreen", () => {
  it("est le <main> de la page, contenu centré sur toute la hauteur", () => {
    render(
      <CenteredScreen aria-labelledby="titre">
        <h1 id="titre">Connexion</h1>
      </CenteredScreen>
    )
    const main = screen.getByRole("main", { name: "Connexion" })
    expect(main).toHaveAttribute("data-slot", "centered-screen")
    expect(main).toHaveClass(
      "flex",
      "min-h-svh",
      "items-center",
      "justify-center",
      "bg-muted"
    )
  })

  it("accepte les classes de l'application", () => {
    render(<CenteredScreen className="bg-background">x</CenteredScreen>)
    const main = screen.getByRole("main")
    expect(main).toHaveClass("bg-background")
    expect(main).not.toHaveClass("bg-muted")
  })
})
