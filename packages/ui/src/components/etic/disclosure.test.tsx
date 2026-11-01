import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  Collapsible,
  CollapsibleContent,
  Disclosure,
  DisclosureTrigger,
} from "@etic-ui/index"

describe("Disclosure", () => {
  it("fermé par défaut, monte son contenu à l'ouverture", async () => {
    render(
      <Disclosure titre="Plus de champs">
        <p>Téléphone</p>
      </Disclosure>
    )
    const bouton = screen.getByRole("button", { name: "Plus de champs" })
    expect(bouton).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Téléphone")).toBeNull()

    await userEvent.click(bouton)
    expect(bouton).toHaveAttribute("aria-expanded", "true")
    expect(bouton).toHaveAttribute("data-panel-open")
    expect(screen.getByText("Téléphone")).toBeVisible()
  })

  it("s'ouvre au clavier, et son chevron tourne à l'ouverture", async () => {
    render(
      <Disclosure titre="Historique">
        <p>Contenu</p>
      </Disclosure>
    )
    const bouton = screen.getByRole("button", { name: "Historique" })
    const chevron = bouton.querySelector("svg")
    expect(chevron).toHaveAttribute("aria-hidden", "true")
    expect(chevron).toHaveClass("group-data-panel-open/disclosure:rotate-90")
    expect(bouton).toHaveClass("group/disclosure")

    await userEvent.tab()
    expect(bouton).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    expect(screen.getByText("Contenu")).toBeVisible()
  })

  it("ouvert d'emblée avec `defautOuvert`, contrôlable par `ouvert`", async () => {
    const { rerender } = render(
      <Disclosure titre="Créations" defautOuvert>
        <p>Ada</p>
      </Disclosure>
    )
    expect(screen.getByText("Ada")).toBeVisible()

    const onOuvertChange = vi.fn()
    rerender(
      <Disclosure
        key="controle"
        titre="Créations"
        ouvert={false}
        onOuvertChange={onOuvertChange}
      >
        <p>Ada</p>
      </Disclosure>
    )
    await userEvent.click(screen.getByRole("button", { name: "Créations" }))
    expect(onOuvertChange).toHaveBeenCalledWith(true)
    // Contrôlé : il reste fermé tant que le parent ne l'ouvre pas.
    expect(screen.queryByText("Ada")).toBeNull()
  })

  it("contrôlé par l'état du parent", async () => {
    function Parent() {
      const [ouvert, setOuvert] = useState(false)
      return (
        <>
          <span>{ouvert ? "ouvert" : "fermé"}</span>
          <Disclosure titre="Avancé" ouvert={ouvert} onOuvertChange={setOuvert}>
            <p>Expression CRON</p>
          </Disclosure>
        </>
      )
    }
    render(<Parent />)
    await userEvent.click(screen.getByRole("button", { name: "Avancé" }))
    expect(screen.getByText("ouvert")).toBeInTheDocument()
    expect(screen.getByText("Expression CRON")).toBeVisible()
  })

  it("affiche le compteur en pastille, lu avec le titre", () => {
    render(
      <Disclosure titre="Ignorés" compteur={12} variante="carte">
        <p>…</p>
      </Disclosure>
    )
    const bouton = screen.getByRole("button", { name: "Ignorés 12" })
    expect(bouton.querySelector('[data-slot="badge"]')).toHaveTextContent("12")
  })

  it("variantes : lien, discret et carte", () => {
    render(
      <>
        <Disclosure titre="Lien">x</Disclosure>
        <Disclosure titre="Discret" variante="discret">
          x
        </Disclosure>
        <Disclosure titre="Carte" variante="carte" className="mt-2">
          x
        </Disclosure>
      </>
    )
    const lien = screen.getByRole("button", { name: "Lien" })
    expect(lien).toHaveAttribute("data-variante", "lien")
    // Lien en ligne : sans marge, 24 px au moins (cible tactile).
    expect(lien).toHaveClass("px-0", "min-h-6", "text-primary-text")

    const discret = screen.getByRole("button", { name: "Discret" })
    expect(discret).toHaveAttribute("data-variante", "discret")
    expect(discret).toHaveClass("text-muted-foreground", "h-7")

    const carte = screen.getByRole("button", { name: "Carte" })
    expect(carte).toHaveAttribute("data-variante", "carte")
    expect(carte).toHaveClass("w-full", "focus-visible:ring-3")
    const racine = carte.closest('[data-slot="disclosure"]')
    expect(racine).toHaveClass("rounded-lg", "border", "mt-2")
  })

  it("passe ses classes au panneau", async () => {
    render(
      <Disclosure titre="Détails" classNameContenu="pl-5">
        <p>Contenu</p>
      </Disclosure>
    )
    await userEvent.click(screen.getByRole("button", { name: "Détails" }))
    expect(
      screen.getByText("Contenu").closest('[data-slot="collapsible-content"]')
    ).toHaveClass("pl-5", "pt-2")
  })
})

describe("DisclosureTrigger", () => {
  it("sert de déclencheur à un Collapsible composé à la main", async () => {
    render(
      <Collapsible>
        <div>
          <DisclosureTrigger taille="xs" className="text-current">
            Détails
          </DisclosureTrigger>
        </div>
        <CollapsibleContent>
          <pre>{"{}"}</pre>
        </CollapsibleContent>
      </Collapsible>
    )
    const bouton = screen.getByRole("button", { name: "Détails" })
    expect(bouton).toHaveClass("text-xs", "text-current")
    await userEvent.click(bouton)
    expect(screen.getByText("{}")).toBeVisible()
  })
})
