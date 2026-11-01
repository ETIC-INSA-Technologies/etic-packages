import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SaveIcon } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import { Button, fermerSaufEnCours } from "@etic-ui/index"

describe("Button désactivé mais focalisable", () => {
  it("prend l'allure désactivée avec aria-disabled, sans couper le survol", () => {
    render(
      <Button disabled focusableWhenDisabled>
        Publier
      </Button>
    )
    const bouton = screen.getByRole("button", { name: "Publier" })
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(bouton).not.toBeDisabled()
    expect(bouton).toHaveClass(
      "aria-disabled:opacity-50",
      "aria-disabled:cursor-not-allowed"
    )
    // Ni enfoncement au clic, ni pointer-events-none (l'infobulle d'un
    // verrou doit rester survolable).
    expect(bouton.className).toContain(
      "active:not-aria-[haspopup]:not-aria-disabled:translate-y-px"
    )
    expect(bouton.className).not.toContain("aria-disabled:pointer-events-none")
  })
})

describe("Button en cours", () => {
  it("annonce l'attente, ignore les clics et garde le focus", async () => {
    const onClick = vi.fn()
    const { rerender } = render(
      <Button onClick={onClick}>
        <SaveIcon data-icon="inline-start" />
        Enregistrer
      </Button>
    )
    const bouton = screen.getByRole("button", { name: "Enregistrer" })
    await userEvent.tab()
    expect(bouton).toHaveFocus()
    expect(bouton).not.toHaveAttribute("aria-busy")

    rerender(
      <Button onClick={onClick} enCours libelleEnCours="Enregistrement…">
        <SaveIcon data-icon="inline-start" />
        Enregistrer
      </Button>
    )
    expect(bouton).toHaveAttribute("aria-busy", "true")
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(bouton).not.toBeDisabled()
    expect(bouton).toHaveFocus()
    expect(bouton).toHaveAccessibleName("Enregistrement…")
    await userEvent.click(bouton)
    await userEvent.keyboard("{Enter}")
    expect(onClick).not.toHaveBeenCalled()
  })

  it("remplace ses icônes par une roue muette", () => {
    render(
      <Button size="icon" aria-label="Enregistrer" enCours>
        <SaveIcon />
      </Button>
    )
    const bouton = screen.getByRole("button", { name: "Enregistrer" })
    const roue = bouton.querySelector('[data-slot="spinner"]')
    expect(roue).toHaveAttribute("aria-hidden", "true")
    expect(roue).not.toHaveAttribute("role")
    expect(bouton).toHaveClass("[&>svg:not([data-slot=spinner])]:hidden")
    // Pas de second statut « Chargement » annoncé.
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("sans libelleEnCours, garde son contenu", () => {
    render(<Button enCours>Supprimer</Button>)
    expect(screen.getByRole("button", { name: "Supprimer" })).toHaveAttribute(
      "aria-busy",
      "true"
    )
  })
})

describe("Button en ligne", () => {
  it("size inline : sans hauteur ni marge de bouton, cible de 24 px gardée", () => {
    render(
      <Button variant="link" size="inline">
        Voir le détail
      </Button>
    )
    const bouton = screen.getByRole("button", { name: "Voir le détail" })
    expect(bouton).toHaveClass("h-auto", "min-h-6", "px-0")
    expect(bouton).not.toHaveClass("h-8")
  })
})

describe("fermerSaufEnCours", () => {
  it("ne ferme pas pendant l'action, ferme sinon", () => {
    const onFermer = vi.fn()
    fermerSaufEnCours(true, onFermer)(false)
    expect(onFermer).not.toHaveBeenCalled()
    fermerSaufEnCours(false, onFermer)(true)
    expect(onFermer).not.toHaveBeenCalled()
    fermerSaufEnCours(false, onFermer)(false)
    expect(onFermer).toHaveBeenCalledOnce()
  })
})

describe("Button", () => {
  it("rend un bouton accessible par son rôle et réagit au clic", () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Exporter</Button>)

    const bouton = screen.getByRole("button", { name: "Exporter" })
    bouton.click()

    expect(onClick).toHaveBeenCalledOnce()
    expect(bouton).toHaveAttribute("data-slot", "button")
  })

  it("fusionne la className de l'application avec les variantes", () => {
    render(
      <Button variant="outline" className="w-full">
        Exporter
      </Button>
    )

    expect(screen.getByRole("button")).toHaveClass("w-full", "border-border")
  })

  it("ne déclenche pas le clic quand il est désactivé", () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Exporter
      </Button>
    )

    screen.getByRole("button").click()

    expect(onClick).not.toHaveBeenCalled()
  })
})
