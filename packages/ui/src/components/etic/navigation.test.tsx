import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it } from "vitest"

import {
  DetailHeader,
  DetailMeta,
  DetailMetaLink,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuExternalLink,
  DropdownMenuTrigger,
  ExternalLink,
  LienProvider,
  NavTabs,
} from "@etic-ui/index"

/** Lien de routeur factice, reconnaissable. */
function LienRouteur(props: ComponentProps<"a">) {
  return <a data-routeur="" {...props} />
}

describe("NavTabs", () => {
  it("des liens, l'actif annoncé, sans débordement vertical", () => {
    render(
      <LienProvider lien={LienRouteur}>
        <NavTabs
          libelle="Paramètres"
          liens={[
            { libelle: "Généraux", href: "/parametres", actif: true },
            { libelle: "Intégrations", href: "/parametres/integrations" },
          ]}
        />
      </LienProvider>
    )
    const barre = screen.getByRole("navigation", { name: "Paramètres" })
    expect(barre).toHaveClass("overflow-x-auto", "overflow-y-hidden")
    // Le trait de base est une ombre intérieure, pas une bordure que le
    // soulignement chevaucherait par une marge négative.
    expect(barre.className).toContain("shadow-[inset_0_-1px_0_var(--border)]")
    const actif = screen.getByRole("link", { name: "Généraux" })
    expect(actif).toHaveAttribute("aria-current", "page")
    expect(actif).toHaveAttribute("data-routeur")
    expect(actif.className).not.toMatch(/-mb-/)
    expect(
      screen.getByRole("link", { name: "Intégrations" })
    ).not.toHaveAttribute("aria-current")
  })
})

describe("DetailMeta", () => {
  it("un élément par enfant, sans les absents", () => {
    const sansDate: string | null = null
    render(
      <DetailMeta>
        <span>Créée le 5 juillet</span>
        {sansDate}
        {false}
        <DetailMetaLink href="/dossiers/3">Dossier parent</DetailMetaLink>
      </DetailMeta>
    )
    const elements = document.querySelectorAll('[data-slot="detail-meta-item"]')
    expect(elements).toHaveLength(2)
    expect(elements[0]).toHaveClass("before:content-['·']")
  })

  it("ne rend rien sans élément", () => {
    const { container } = render(<DetailMeta>{null}</DetailMeta>)
    expect(container).toBeEmptyDOMElement()
  })

  it("dans la méta de DetailHeader", () => {
    render(
      <DetailHeader
        titre="Fiche"
        meta={
          <DetailMeta>
            <span>Un</span>
            <span>Deux</span>
          </DetailMeta>
        }
      />
    )
    expect(screen.getByText("Un").closest("p")).toBeInTheDocument()
  })
})

describe("DetailMetaLink", () => {
  it("lien du routeur, ou externe dans un nouvel onglet", () => {
    render(
      <LienProvider lien={LienRouteur}>
        <DetailMetaLink href="/dossiers/3">Dossier</DetailMetaLink>
        <DetailMetaLink href="https://exemple.org" externe>
          Outil
        </DetailMetaLink>
      </LienProvider>
    )
    expect(screen.getByRole("link", { name: "Dossier" })).toHaveAttribute(
      "data-routeur"
    )
    const externe = screen.getByRole("link", {
      name: /^Outil ?\(nouvel onglet\)$/,
    })
    expect(externe).not.toHaveAttribute("data-routeur")
    expect(externe).toHaveAttribute("target", "_blank")
    expect(externe).toHaveAttribute("rel", "noopener noreferrer")
  })
})

describe("ExternalLink", () => {
  it("nouvel onglet, et le dit", () => {
    render(
      <LienProvider lien={LienRouteur}>
        <ExternalLink href="https://exemple.org">Documentation</ExternalLink>
      </LienProvider>
    )
    const lien = screen.getByRole("link", {
      name: /^Documentation ?\(nouvel onglet\)$/,
    })
    expect(lien).toHaveAttribute("target", "_blank")
    expect(lien).toHaveAttribute("rel", "noopener noreferrer")
    // Jamais le lien du routeur : une adresse externe recharge.
    expect(lien).not.toHaveAttribute("data-routeur")
  })

  it("entrée de menu", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuExternalLink href="https://exemple.org">
            Ouvrir l'original
          </DropdownMenuExternalLink>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    await userEvent.click(screen.getByRole("button", { name: "Actions" }))
    const entree = await screen.findByRole("menuitem", {
      name: /^Ouvrir l'original ?\(nouvel onglet\)$/,
    })
    expect(entree).toHaveAttribute("href", "https://exemple.org")
    expect(entree).toHaveAttribute("target", "_blank")
    expect(entree).toHaveAttribute("rel", "noopener noreferrer")
  })
})
