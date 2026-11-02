import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@etic-ui/index"

function liste() {
  return document.querySelector<HTMLElement>('[data-slot="select-content"]')!
}

function vide() {
  return document.querySelector<HTMLElement>('[data-slot="select-empty"]')!
}

function Ouvert({ children }: { children: ReactNode }) {
  return (
    <Select defaultOpen>
      <SelectTrigger aria-label="Pôle">
        <SelectValue />
      </SelectTrigger>
      {children}
    </Select>
  )
}

/** La règle de `select-empty` (masqué dès qu'une option est dans la liste)
 *  telle que le navigateur l'applique : jsdom ne compile pas Tailwind, mais
 *  sait évaluer son sélecteur. */
function videMasque() {
  expect(vide()).toHaveClass(
    "in-[[data-slot=select-content]:has([data-slot=select-item])]:hidden"
  )
  return liste().matches(':has([data-slot="select-item"])')
}

describe("Select", () => {
  it("s'ouvre sous le champ, alignée à gauche, sans s'y superposer", async () => {
    render(
      <Ouvert>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="a">Alpha</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Ouvert>
    )
    await screen.findByRole("option", { name: "Alpha" })
    expect(liste()).toHaveAttribute("data-align-trigger", "false")
    expect(liste()).toHaveAttribute("data-side", "bottom")
    expect(liste()).toHaveAttribute("data-align", "start")
  })

  it("garde les réglages de l'application", async () => {
    render(
      <Ouvert>
        <SelectContent align="end" alignItemWithTrigger>
          <SelectItem value="a">Alpha</SelectItem>
        </SelectContent>
      </Ouvert>
    )
    await screen.findByRole("option", { name: "Alpha" })
    expect(liste()).toHaveAttribute("data-align-trigger", "true")
  })

  it("options posées sans SelectGroup : même marge que dans un groupe", async () => {
    render(
      <Ouvert>
        <SelectContent>
          <SelectItem value="a">Alpha</SelectItem>
        </SelectContent>
      </Ouvert>
    )
    const option = await screen.findByRole("option", { name: "Alpha" })
    // L'option est un enfant direct de la liste, qui porte la marge.
    expect(option.parentElement).toHaveClass(
      "has-[>[data-slot=select-item]]:p-1"
    )
  })

  it("sans option, dit qu'il n'y en a pas : sans groupe", async () => {
    render(
      <Ouvert>
        <SelectContent>{[]}</SelectContent>
      </Ouvert>
    )
    // Zone de statut : annoncée aux lecteurs d'écran.
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Aucune option."
    )
    expect(videMasque()).toBe(false)
  })

  it("sans option, dit qu'il n'y en a pas : groupe vide (forme conseillée)", async () => {
    render(
      <Ouvert>
        <SelectContent>
          <SelectGroup>{[]}</SelectGroup>
        </SelectContent>
      </Ouvert>
    )
    // Zone de statut : annoncée aux lecteurs d'écran.
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Aucune option."
    )
    expect(videMasque()).toBe(false)
  })

  it("avec des options, le message est masqué, avec ou sans groupe", async () => {
    const { unmount } = render(
      <Ouvert>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="a">Alpha</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Ouvert>
    )
    await screen.findByRole("option", { name: "Alpha" })
    expect(videMasque()).toBe(true)
    unmount()

    render(
      <Ouvert>
        <SelectContent>
          <SelectItem value="a">Alpha</SelectItem>
        </SelectContent>
      </Ouvert>
    )
    await screen.findByRole("option", { name: "Alpha" })
    expect(videMasque()).toBe(true)
  })

  it("vide se règle", async () => {
    render(
      <Ouvert>
        <SelectContent vide="Aucun pôle cette année." />
      </Ouvert>
    )
    expect(await screen.findByText("Aucun pôle cette année.")).toBeVisible()
  })

  it("une option figée dit pourquoi, reliée à l'option ; le libellé seul s'estompe", async () => {
    render(
      <Ouvert>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="actif">Actif</SelectItem>
            <SelectItem
              value="desactive"
              disabled
              description="Nul ne désactive son propre compte."
            >
              Désactivé
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Ouvert>
    )
    // Le nom reste le libellé ; la raison est la description.
    const figee = await screen.findByRole("option", { name: "Désactivé" })
    expect(figee).toHaveAttribute("data-disabled")
    expect(figee).toHaveAccessibleDescription(
      "Nul ne désactive son propre compte."
    )
    // L'option garde son opacité ; seul le libellé s'estompe.
    expect(figee).toHaveClass("data-disabled:opacity-100")
    const libelle = figee.querySelector(
      '[data-slot="select-item-description"]'
    )?.previousElementSibling
    expect(libelle).toHaveClass("group-data-disabled/select-item:opacity-50")
    // Le libellé passe à la ligne : ni coupé, ni recouvert par la coche.
    expect(libelle).toHaveClass("min-w-0")
    expect(libelle).not.toHaveClass("shrink-0")
    expect(libelle).not.toHaveClass("whitespace-nowrap")
    // Une option sans description garde l'apparence de shadcn.
    expect(screen.getByRole("option", { name: "Actif" })).not.toHaveAttribute(
      "aria-describedby"
    )
  })
})
