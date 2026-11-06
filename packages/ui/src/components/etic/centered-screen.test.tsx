import { render, screen } from "@testing-library/react"
import { SearchXIcon } from "lucide-react"
import { describe, expect, it } from "vitest"

import { CenteredScreen, MessageScreen } from "@etic-ui/index"

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

  it("est posé sur --muted à 40 %", () => {
    render(<CenteredScreen>x</CenteredScreen>)
    expect(screen.getByRole("main")).toHaveClass("bg-muted/40")
  })

  it("laisse l'application remplacer son fond", () => {
    render(<CenteredScreen className="bg-background">x</CenteredScreen>)
    const main = screen.getByRole("main")
    expect(main).toHaveClass("bg-background")
    expect(main).not.toHaveClass("bg-muted/40")
  })
})

describe("MessageScreen", () => {
  it("titre de page, phrase, icône décorative et actions, centrés dans un <main>", () => {
    render(
      <MessageScreen
        icone={SearchXIcon}
        titre="Page introuvable"
        description="Le lien est peut-être incomplet."
        actions={<a href="/">Retour à l'accueil</a>}
      />
    )
    const main = screen.getByRole("main")
    expect(main).toHaveClass("justify-center", "min-h-svh")
    expect(
      screen.getByRole("heading", { level: 1, name: "Page introuvable" })
    ).toBeInTheDocument()
    expect(screen.getByText("Le lien est peut-être incomplet.")).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Retour à l'accueil" })
    ).toHaveAttribute("href", "/")
    expect(main.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("sans icône ni actions, ni pastille ni rangée vide", () => {
    render(<MessageScreen titre="Lien expiré" />)
    const message = screen
      .getByRole("main")
      .querySelector('[data-slot="message-screen"]')!
    expect(message.children).toHaveLength(1)
  })
})
