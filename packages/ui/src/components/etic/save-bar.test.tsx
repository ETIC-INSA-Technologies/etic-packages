import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
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
    expect(screen.getAllByRole("button").map((e) => e.textContent)).toEqual([
      "Annuler",
      "Enregistrer",
    ])
    expect(barre.firstElementChild).toBe(screen.getByRole("status"))
    rerender(<SaveBar collante enregistre />)
    expect(screen.getByRole("status")).toHaveTextContent(/^Enregistré$/)
  })

  it("les deux boutons restent ensemble : seul le statut passe à la ligne", () => {
    const { container, rerender } = render(
      <SaveBar collante modifie onAnnuler={() => {}} />
    )
    const groupe = container.querySelector('[data-slot="save-bar-actions"]')
    expect(groupe).toHaveClass("shrink-0")
    expect(groupe?.children).toHaveLength(2)
    expect(container.firstElementChild).not.toHaveClass("flex-wrap")
    expect(screen.getByRole("status")).toHaveClass("min-w-0", "flex-1")
    rerender(<SaveBar modifie onAnnuler={() => {}} />)
    expect(
      container.querySelector('[data-slot="save-bar-actions"]')?.children
    ).toHaveLength(2)
  })

  it("collante sans modification : à sa place, sur sa carte ; collée pendant l'envoi", () => {
    const { container, rerender } = render(<SaveBar collante desactive />)
    const barre = container.firstElementChild!
    expect(barre).not.toHaveClass("sticky")
    // Sur sa carte même au repos : ses boutons restent alignés sur les
    // cartes de la page.
    expect(barre).toHaveClass("bg-card", "border-border", "justify-end")
    // Pendant l'envoi, la barre reste à l'écran, même sans `modifie`.
    rerender(<SaveBar collante enCours />)
    expect(barre).toHaveClass("sticky", "bg-card", "border-border")
  })

  it("masquée au repos : rien d'affiché, mais le premier message est annoncé", () => {
    const { container, rerender } = render(
      <SaveBar collante masqueeAuRepos desactive />
    )
    const barre = container.firstElementChild!
    const statut = screen.getByRole("status")
    expect(barre).toHaveClass("contents")
    expect(statut).toHaveClass("sr-only")
    expect(statut).toBeEmptyDOMElement()
    expect(screen.queryByRole("button")).toBeNull()

    rerender(<SaveBar collante masqueeAuRepos modifie />)
    // Même zone de statut, déjà présente : le message est lu.
    expect(screen.getByRole("status")).toBe(statut)
    expect(statut).toHaveTextContent("Modifications non enregistrées")
    expect(statut).not.toHaveClass("sr-only")
    expect(barre).toHaveClass("sticky", "bg-card")
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeVisible()

    rerender(<SaveBar collante masqueeAuRepos enregistre />)
    expect(barre).toHaveClass("bg-card")
    expect(barre).not.toHaveClass("sticky")
    expect(statut).toHaveTextContent(/^Enregistré$/)
  })

  it("non collante : boutons d'abord, statut après", () => {
    const { container } = render(<SaveBar modifie onAnnuler={() => {}} />)
    const barre = container.firstElementChild!
    expect(barre).not.toHaveClass("sticky")
    expect(barre).not.toHaveAttribute("data-collante")
    expect([...barre.children].map((e) => e.textContent)).toEqual([
      "EnregistrerAnnuler",
      "Modifications non enregistrées",
    ])
  })

  it("Annuler rend le focus à Enregistrer : il disparaît avec les modifications", async () => {
    const user = userEvent.setup()
    function Formulaire() {
      const [modifie, setModifie] = useState(true)
      return (
        <SaveBar
          collante
          modifie={modifie}
          desactive={!modifie}
          onAnnuler={modifie ? () => setModifie(false) : undefined}
        />
      )
    }
    render(<Formulaire />)
    await user.click(screen.getByRole("button", { name: "Annuler" }))
    expect(screen.queryByRole("button", { name: "Annuler" })).toBeNull()
    expect(screen.getByRole("button", { name: "Enregistrer" })).toHaveFocus()
  })

  it("masquée au repos, sauf quand le retour général aux défauts est offert", () => {
    const { container, rerender } = render(
      <SaveBar
        collante
        masqueeAuRepos
        desactive
        retablirDefauts={{ onRetablir() {}, masque: true }}
      />
    )
    const barre = container.firstElementChild!
    expect(barre).toHaveClass("contents")
    expect(screen.queryByRole("button")).toBeNull()

    rerender(
      <SaveBar
        collante
        masqueeAuRepos
        desactive
        retablirDefauts={{ onRetablir() {} }}
      />
    )
    expect(barre).not.toHaveClass("contents")
    expect(barre).toHaveClass("bg-card")
    expect(barre).not.toHaveClass("sticky")
    expect(
      screen.getByRole("button", {
        name: "Rétablir toutes les valeurs par défaut",
      })
    ).toBeVisible()
  })

  it("retour général aux défauts : icône à l'autre bout, absente sans écart, focus à Enregistrer", async () => {
    const user = userEvent.setup()
    function Formulaire() {
      const [auDefaut, setAuDefaut] = useState(false)
      return (
        <SaveBar
          collante
          modifie={auDefaut}
          onAnnuler={auDefaut ? () => setAuDefaut(false) : undefined}
          retablirDefauts={{
            onRetablir: () => setAuDefaut(true),
            masque: auDefaut,
          }}
        />
      )
    }
    const { unmount } = render(<Formulaire />)
    const retablir = screen.getByRole("button", {
      name: "Rétablir toutes les valeurs par défaut",
    })
    expect(screen.getAllByRole("button")[0]).toBe(retablir)
    await user.click(retablir)
    expect(screen.getByRole("button", { name: "Enregistrer" })).toHaveFocus()
    // Plus rien à rétablir : il n'est plus rendu, et sa place ne reste pas
    // vide (« Annuler » et « Enregistrer », alignés à droite, n'ont pas bougé).
    expect(retablir).not.toBeInTheDocument()
    expect(screen.getAllByRole("button").map((e) => e.textContent)).toEqual([
      "Annuler",
      "Enregistrer",
    ])
    unmount()

    // Non collante : à droite d'« Annuler ».
    const { container } = render(
      <SaveBar
        modifie
        onAnnuler={() => {}}
        retablirDefauts={{ onRetablir() {} }}
      />
    )
    expect(
      container.querySelector('[data-slot="save-bar-actions"]')
        ?.lastElementChild
    ).toHaveAccessibleName("Rétablir toutes les valeurs par défaut")
  })
})
