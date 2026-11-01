import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Badge, RemovableBadge, TooltipProvider } from "@etic-ui/index"

describe("Badge", () => {
  it("size lg : 28 px, la hauteur d'un badge retirable", () => {
    render(<Badge size="lg">Bureau</Badge>)
    const badge = screen.getByText("Bureau")
    expect(badge).toHaveClass("h-7")
    expect(badge).not.toHaveClass("h-5")
  })
})

describe("RemovableBadge", () => {
  it("retire l'élément par une croix nommée", async () => {
    const user = userEvent.setup()
    const onRetirer = vi.fn()
    render(
      <TooltipProvider>
        <RemovableBadge
          onRetirer={onRetirer}
          libelleRetirer="Retirer le groupe Bureau"
        >
          Bureau
        </RemovableBadge>
      </TooltipProvider>
    )
    expect(screen.getByText("Bureau").parentElement).toHaveClass(
      "h-7",
      "bg-secondary"
    )
    await user.click(
      screen.getByRole("button", { name: "Retirer le groupe Bureau" })
    )
    expect(onRetirer).toHaveBeenCalledTimes(1)
  })

  it("coupe un libellé trop long ; l'anneau de la croix reste dans le badge", () => {
    render(
      <TooltipProvider>
        <RemovableBadge onRetirer={() => {}} libelleRetirer="Retirer">
          Groupe au nom très long
        </RemovableBadge>
      </TooltipProvider>
    )
    const libelle = screen.getByText("Groupe au nom très long")
    expect(libelle).toHaveClass("truncate")
    const badge = libelle.parentElement!
    expect(badge).toHaveClass("overflow-hidden", "max-w-full")
    expect(badge).not.toHaveClass("overflow-visible")
    // jsdom n'applique pas les styles : l'anneau intérieur se lit aux classes.
    const croix = screen.getByRole("button", { name: "Retirer" })
    expect(croix).toHaveClass("focus-visible:inset-ring-2")
    expect(croix).not.toHaveClass("focus-visible:ring-3")
  })

  it("en cours : occupé, garde son nom et le focus, sans effet", async () => {
    const user = userEvent.setup()
    const onRetirer = vi.fn()
    const badge = (enCours: boolean) => (
      <TooltipProvider>
        <RemovableBadge
          onRetirer={onRetirer}
          libelleRetirer="Retirer le groupe Bureau"
          enCours={enCours}
        >
          Bureau
        </RemovableBadge>
      </TooltipProvider>
    )
    const { rerender } = render(badge(false))
    const croix = screen.getByRole("button", {
      name: "Retirer le groupe Bureau",
    })
    croix.focus()
    expect(croix).not.toHaveAttribute("aria-busy")

    rerender(badge(true))
    expect(croix).toHaveFocus()
    expect(croix).toHaveAccessibleName("Retirer le groupe Bureau")
    expect(croix).toHaveAttribute("aria-busy", "true")
    expect(croix).toHaveAttribute("data-en-cours")
    await user.click(croix)
    expect(onRetirer).not.toHaveBeenCalled()
  })

  it("verrouillé : la raison décrit la croix, qui reste sans effet", async () => {
    const user = userEvent.setup()
    const onRetirer = vi.fn()
    render(
      <TooltipProvider>
        <RemovableBadge
          onRetirer={onRetirer}
          libelleRetirer="Retirer *"
          verrou="Le joker du superadministrateur est indétachable"
        >
          *
        </RemovableBadge>
      </TooltipProvider>
    )
    const croix = screen.getByRole("button", { name: "Retirer *" })
    expect(croix).toHaveAccessibleDescription(
      "Le joker du superadministrateur est indétachable"
    )
    await user.click(croix)
    expect(onRetirer).not.toHaveBeenCalled()
  })

  it("sans onRetirer : même gabarit, sans bouton", () => {
    render(<RemovableBadge>Imposé</RemovableBadge>)
    expect(screen.getByText("Imposé").parentElement).toHaveClass("h-7")
    expect(screen.queryByRole("button")).toBeNull()
  })
})
