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
    expect(
      screen.getByText("Bureau").closest('[data-slot="badge"]')
    ).toHaveClass("h-7", "bg-secondary")
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
    // Le texte nu est enveloppé : premier élément du libellé, il se coupe.
    const libelle = screen.getByText("Groupe au nom très long")
    expect(libelle.tagName).toBe("SPAN")
    expect(libelle.parentElement).toHaveAttribute(
      "data-slot",
      "removable-badge-label"
    )
    expect(libelle.parentElement).toHaveClass("*:first:truncate")
    const badge = libelle.closest<HTMLElement>('[data-slot="badge"]')!
    expect(badge).toHaveClass("overflow-hidden", "max-w-full")
    expect(badge).not.toHaveClass("overflow-visible")
    // jsdom n'applique pas les styles : l'anneau intérieur se lit aux classes.
    const croix = screen.getByRole("button", { name: "Retirer" })
    expect(croix).toHaveClass("focus-visible:inset-ring-2")
    expect(croix).not.toHaveClass("focus-visible:ring-3")
  })

  it("un marqueur après le libellé reste entier, centré à côté de lui", () => {
    render(
      <RemovableBadge>
        <span>eticmembers.directory.read</span>
        <span role="img" aria-label="Droit critique" />
      </RemovableBadge>
    )
    const libelle = screen
      .getByText("eticmembers.directory.read")
      .closest('[data-slot="removable-badge-label"]')
    // Le premier élément se coupe, les suivants ne rétrécissent pas.
    expect(libelle).toHaveClass(
      "flex",
      "items-center",
      "gap-1",
      "*:shrink-0",
      "*:first:shrink",
      "*:first:truncate"
    )
    expect(
      screen.getByRole("img", { name: "Droit critique" }).parentElement
    ).toBe(libelle)
  })

  it("texte nu suivi d'un marqueur, même dans un fragment : le texte reste coupable", () => {
    const code = "eticmembers.directory.read"
    render(
      <RemovableBadge>
        <>
          {code} ({1})
          <span role="img" aria-label="Droit critique" />
        </>
      </RemovableBadge>
    )
    const libelle = document.querySelector(
      '[data-slot="removable-badge-label"]'
    )!
    // Les textes nus forment un seul élément, premier du libellé ; le
    // marqueur vient après lui.
    expect(libelle.children).toHaveLength(2)
    expect(libelle.children[0]).toHaveTextContent(`${code} (1)`)
    expect(libelle.children[1]).toBe(
      screen.getByRole("img", { name: "Droit critique" })
    )
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
    expect(
      screen.getByText("Imposé").closest('[data-slot="badge"]')
    ).toHaveClass("h-7")
    expect(screen.queryByRole("button")).toBeNull()
  })
})
