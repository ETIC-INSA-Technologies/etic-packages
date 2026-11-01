import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatGrid, StatTile } from "@etic-ui/index"

const colonnes = (grille: HTMLElement) =>
  grille.getAttribute("style")?.replace(/\s+/g, " ")

describe("StatGrid", () => {
  it("range les tuiles en colonnes de 190 px au moins, sans déborder", () => {
    const { container } = render(
      <StatGrid aria-label="Résumé">
        <StatTile libelle="Membres" valeur={128} />
        <StatTile libelle="Groupes" valeur={12} />
      </StatGrid>
    )
    const grille = container.firstElementChild as HTMLElement
    expect(grille).toHaveAttribute("data-slot", "stat-grid")
    expect(grille).toHaveClass("grid", "gap-3")
    expect(colonnes(grille)).toContain(
      "grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr))"
    )
    expect(grille).toHaveAttribute("aria-label", "Résumé")
    expect(screen.getByText("Groupes")).toBeInTheDocument()
  })

  it("largeurMin règle la colonne, className s'ajoute", () => {
    const { container } = render(
      <StatGrid largeurMin="7rem" className="gap-2" />
    )
    const grille = container.firstElementChild as HTMLElement
    expect(colonnes(grille)).toContain("minmax(min(7rem, 100%), 1fr)")
    expect(grille).toHaveClass("gap-2")
    expect(grille).not.toHaveClass("gap-3")
  })

  it("largeurMin exige une unité (vérifié par tsc)", () => {
    // @ts-expect-error : sans unité, la colonne serait invalide en CSS.
    render(<StatGrid largeurMin="190" />)
    // @ts-expect-error : une unité inconnue de StatGrid.
    render(<StatGrid largeurMin="190vw" />)
    render(<StatGrid largeurMin="12.5rem" />)
  })
})
