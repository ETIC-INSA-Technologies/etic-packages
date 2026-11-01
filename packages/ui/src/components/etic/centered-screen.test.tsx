import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CenteredScreen } from "@etic-ui/index"

describe("CenteredScreen", () => {
  it("est le <main> de la page, et en garde les attributs", () => {
    render(
      <CenteredScreen aria-labelledby="titre">
        <h1 id="titre">Connexion</h1>
      </CenteredScreen>
    )
    const main = screen.getByRole("main", { name: "Connexion" })
    expect(main).toContainElement(
      screen.getByRole("heading", { name: "Connexion" })
    )
  })

  it("laisse l'application remplacer son fond", () => {
    render(<CenteredScreen className="bg-background">x</CenteredScreen>)
    const main = screen.getByRole("main")
    expect(main).toHaveClass("bg-background")
    expect(main).not.toHaveClass("bg-muted")
  })
})
