import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SaveBar } from "@etic-ui/index"

describe("SaveBar", () => {
  it("sans gestionnaire, soumet le formulaire qui l'entoure", async () => {
    const user = userEvent.setup()
    const envoyer = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={envoyer}>
        <SaveBar />
      </form>
    )
    const bouton = screen.getByRole("button", { name: "Enregistrer" })
    expect(bouton).toHaveAttribute("type", "submit")
    await user.click(bouton)
    expect(envoyer).toHaveBeenCalledTimes(1)
  })

  it("en cours : occupé, garde le focus, ne soumet pas deux fois", async () => {
    const user = userEvent.setup()
    const onEnregistrer = vi.fn()
    const { rerender } = render(<SaveBar onEnregistrer={onEnregistrer} />)
    const bouton = screen.getByRole("button", { name: "Enregistrer" })
    await user.click(bouton)
    expect(onEnregistrer).toHaveBeenCalledTimes(1)

    rerender(<SaveBar onEnregistrer={onEnregistrer} enCours />)
    expect(bouton).toHaveAccessibleName("Enregistrement…")
    expect(bouton).toHaveAttribute("aria-busy", "true")
    expect(bouton).toHaveAttribute("data-en-cours")
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(bouton).toHaveFocus()
    await user.click(bouton)
    expect(onEnregistrer).toHaveBeenCalledTimes(1)

    // Rien à enregistrer après coup : le focus reste sur le bouton.
    rerender(<SaveBar onEnregistrer={onEnregistrer} desactive enregistre />)
    expect(bouton).toHaveFocus()
    expect(bouton).toHaveAccessibleName("Enregistrer")
    expect(bouton).not.toHaveAttribute("aria-busy")
    expect(bouton).toHaveAttribute("aria-disabled", "true")
  })

  it("en cours : Annuler attend la fin de l'enregistrement", async () => {
    const user = userEvent.setup()
    const onAnnuler = vi.fn()
    render(<SaveBar enCours onAnnuler={onAnnuler} />)
    const annuler = screen.getByRole("button", { name: "Annuler" })
    expect(annuler).toHaveAttribute("aria-disabled", "true")
    await user.click(annuler)
    expect(onAnnuler).not.toHaveBeenCalled()
  })

  it("annonce « Enregistré » dans une zone status déjà présente", () => {
    const { rerender } = render(<SaveBar />)
    const statut = screen.getByRole("status")
    expect(statut).toBeEmptyDOMElement()
    rerender(<SaveBar enregistre />)
    expect(statut).toHaveTextContent("Enregistré")
  })

  it("une modification après l'enregistrement l'emporte sur « Enregistré »", () => {
    render(<SaveBar enregistre modifie />)
    expect(screen.getByRole("status")).toHaveTextContent(
      /^Modifications non enregistrées$/
    )
  })

  it("Annuler seulement avec onAnnuler", async () => {
    const user = userEvent.setup()
    const onAnnuler = vi.fn()
    const { rerender } = render(<SaveBar />)
    expect(screen.queryByRole("button", { name: "Annuler" })).toBeNull()
    rerender(<SaveBar onAnnuler={onAnnuler} />)
    await user.click(screen.getByRole("button", { name: "Annuler" }))
    expect(onAnnuler).toHaveBeenCalledTimes(1)
  })

  it("collante : statut à gauche, boutons à droite, dans l'ordre du DOM", () => {
    const { container, rerender } = render(
      <SaveBar collante modifie onAnnuler={() => {}} />
    )
    const barre = container.firstElementChild!
    expect(barre).toHaveClass("sticky")
    expect(barre).toHaveAttribute("data-collante", "true")
    expect(screen.getByRole("status")).toHaveTextContent(
      "Modifications non enregistrées"
    )
    expect([...barre.children].map((e) => e.textContent)).toEqual([
      "Modifications non enregistrées",
      "Annuler",
      "Enregistrer",
    ])
    rerender(<SaveBar collante enregistre />)
    expect(screen.getByRole("status")).toHaveTextContent(/^Enregistré$/)
  })

  it("collante sans modification : à sa place, sans carte ; collée pendant l'envoi", () => {
    const { container, rerender } = render(<SaveBar collante desactive />)
    const barre = container.firstElementChild!
    expect(barre).not.toHaveClass("sticky")
    expect(barre).not.toHaveClass("bg-card")
    expect(barre).toHaveClass("border-transparent", "justify-end")
    // Pendant l'envoi, la barre reste à l'écran, même sans `modifie`.
    rerender(<SaveBar collante enCours />)
    expect(barre).toHaveClass("sticky", "bg-card", "border-border")
    expect(barre).not.toHaveClass("border-transparent")
  })

  it("non collante : boutons d'abord, statut après", () => {
    const { container } = render(<SaveBar modifie onAnnuler={() => {}} />)
    const barre = container.firstElementChild!
    expect(barre).not.toHaveClass("sticky")
    expect(barre).not.toHaveAttribute("data-collante")
    expect([...barre.children].map((e) => e.textContent)).toEqual([
      "Enregistrer",
      "Annuler",
      "Modifications non enregistrées",
    ])
  })
})
