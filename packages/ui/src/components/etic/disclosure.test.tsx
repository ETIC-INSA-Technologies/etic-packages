import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  Collapsible,
  CollapsibleContent,
  Disclosure,
  DisclosureTrigger,
  type DisclosureVariante,
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

  it("s'ouvre au clavier ; son chevron est décoratif", async () => {
    render(
      <Disclosure titre="Historique">
        <p>Contenu</p>
      </Disclosure>
    )
    const bouton = screen.getByRole("button", { name: "Historique" })
    expect(bouton.querySelector("svg")).toHaveAttribute("aria-hidden", "true")

    await userEvent.tab()
    expect(bouton).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    expect(bouton).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Contenu")).toBeVisible()
  })

  it.each<DisclosureVariante>(["lien", "discret", "carte"])(
    "variante %s : un bouton nommé par son titre, qui s'ouvre",
    async (variante) => {
      render(
        <Disclosure titre="Détails" variante={variante}>
          <p>Contenu</p>
        </Disclosure>
      )
      const bouton = screen.getByRole("button", { name: "Détails" })
      await userEvent.click(bouton)
      expect(bouton).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByText("Contenu")).toBeVisible()
    }
  )

  it("ouvert d'emblée avec `defautOuvert`", () => {
    render(
      <Disclosure titre="Créations" defautOuvert>
        <p>Ada</p>
      </Disclosure>
    )
    expect(screen.getByRole("button", { name: "Créations" })).toHaveAttribute(
      "aria-expanded",
      "true"
    )
    expect(screen.getByText("Ada")).toBeVisible()
  })

  it("contrôlé : reste fermé tant que le parent ne l'ouvre pas", async () => {
    const onOuvertChange = vi.fn()
    render(
      <Disclosure
        titre="Créations"
        ouvert={false}
        onOuvertChange={onOuvertChange}
      >
        <p>Ada</p>
      </Disclosure>
    )
    const bouton = screen.getByRole("button", { name: "Créations" })
    await userEvent.click(bouton)
    expect(onOuvertChange).toHaveBeenCalledWith(true, expect.anything())
    expect(bouton).toHaveAttribute("aria-expanded", "false")
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

  it("variante carte : un bloc encadré sur le fond des cartes", () => {
    const { container } = render(
      <Disclosure titre="Groupe" variante="carte">
        <p>…</p>
      </Disclosure>
    )
    expect(container.querySelector('[data-slot="disclosure"]')).toHaveClass(
      "rounded-lg",
      "border",
      "bg-card"
    )
  })

  it("lit le compteur avec le titre", () => {
    render(
      <Disclosure titre="Ignorés" compteur={12} variante="carte">
        <p>…</p>
      </Disclosure>
    )
    expect(
      screen.getByRole("button", { name: "Ignorés 12" })
    ).toBeInTheDocument()
  })

  it("passe ses classes au déclencheur et au panneau", async () => {
    render(
      <Disclosure
        titre="Détails"
        variante="discret"
        classNameDeclencheur="-ml-2"
        classNameContenu="pl-5"
      >
        <p>Contenu</p>
      </Disclosure>
    )
    const bouton = screen.getByRole("button", { name: "Détails" })
    expect(bouton).toHaveClass("-ml-2")
    await userEvent.click(bouton)
    expect(
      screen.getByText("Contenu").closest('[data-slot="collapsible-content"]')
    ).toHaveClass("pl-5")
  })
})

describe("DisclosureTrigger", () => {
  it("sert de déclencheur à un Collapsible composé à la main", async () => {
    render(
      <Collapsible>
        <div>
          <DisclosureTrigger taille="xs">Détails</DisclosureTrigger>
        </div>
        <CollapsibleContent>
          <pre>{"{}"}</pre>
        </CollapsibleContent>
      </Collapsible>
    )
    const bouton = screen.getByRole("button", { name: "Détails" })
    await userEvent.click(bouton)
    expect(bouton).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("{}")).toBeVisible()
  })

  it("ne laisse pas remplacer le Button de sa variante (`render` refusé)", () => {
    render(
      <Collapsible>
        <DisclosureTrigger
          // @ts-expect-error `render` est retiré des props.
          render={<a href="#ailleurs" />}
        >
          Détails
        </DisclosureTrigger>
      </Collapsible>
    )
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByRole("button", { name: "Détails" }).tagName).toBe(
      "BUTTON"
    )
  })
})
