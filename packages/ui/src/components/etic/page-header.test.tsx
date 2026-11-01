import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  DetailHeader,
  PageContainer,
  PageHeader,
  SectionCard,
  type DetailHeaderProps,
} from "@etic-ui/index"
import { trouverInfobulle } from "@etic-ui/test/infobulle"

function LienRouteur(props: ComponentProps<"a">) {
  return <a data-routeur="" {...props} />
}

function rendre(props: Partial<DetailHeaderProps> = {}) {
  return render(
    <DetailHeader
      titre="Ada Lovelace"
      chemin={[{ libelle: "Comptes", href: "/comptes" }]}
      lien={LienRouteur}
      {...props}
    />
  )
}

describe("PageHeader", () => {
  it("titre la page et range les actions à côté", () => {
    render(
      <PageHeader
        titre="Groupes"
        description="Les groupes de droits."
        actions={<button>Créer</button>}
      />
    )
    expect(
      screen.getByRole("heading", { level: 1, name: "Groupes" })
    ).toBeInTheDocument()
    expect(screen.getByText("Les groupes de droits.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument()
  })
})

describe("DetailHeader", () => {
  it("affiche un fil d'Ariane qui ramène à la liste, par le lien du routeur", () => {
    rendre()
    const fil = screen.getByRole("navigation", { name: "Fil d’Ariane" })
    expect(fil).toHaveTextContent("ComptesAda Lovelace")
    const lien = within(fil).getByRole("link", { name: "Comptes" })
    expect(lien).toHaveAttribute("href", "/comptes")
    expect(lien).toHaveAttribute("data-routeur")
    expect(within(fil).getByText("Ada Lovelace")).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(
      screen.getByRole("heading", { level: 1, name: "Ada Lovelace" })
    ).toBeInTheDocument()
  })

  it("en mode compact, ne titre la page qu'une fois, dans le fil d'Ariane", () => {
    rendre({ compact: true, actions: <button>Modifier</button> })
    const fil = screen.getByRole("navigation", { name: "Fil d’Ariane" })
    const titre = screen.getByRole("heading", {
      level: 1,
      name: "Ada Lovelace",
    })
    expect(fil).toContainElement(titre)
    expect(screen.getAllByText("Ada Lovelace")).toHaveLength(1)
    // Le titre n'est pas annoncé « lien, indisponible ».
    expect(within(titre).queryByRole("link")).toBeNull()
    expect(within(titre).getByText("Ada Lovelace")).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByRole("button", { name: "Modifier" })).toBeInTheDocument()
  })

  it("sans chemin, pas de fil d'Ariane", () => {
    rendre({ chemin: [] })
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument()
  })

  it("n'affiche « Plus d'actions » que s'il y a des actions à y ranger", () => {
    rendre()
    expect(
      screen.queryByRole("button", { name: "Plus d'actions" })
    ).not.toBeInTheDocument()
  })

  it("donne au bouton « Plus d'actions » la taille des actions", () => {
    const actionsSecondaires = [{ libelle: "Supprimer", onChoisir: vi.fn() }]
    const { unmount } = rendre({ actionsSecondaires })
    expect(screen.getByRole("button", { name: "Plus d'actions" })).toHaveClass(
      "size-8"
    )
    unmount()
    rendre({ actionsSecondaires, tailleActions: "lg" })
    expect(screen.getByRole("button", { name: "Plus d'actions" })).toHaveClass(
      "size-9"
    )
  })

  it("range les actions rares dans un menu et n'exécute pas une entrée désactivée", async () => {
    const supprimer = vi.fn()
    const archiver = vi.fn()
    rendre({
      actionsSecondaires: [
        { libelle: "Archiver", onChoisir: archiver, verrou: "Déjà archivé" },
        { libelle: "Supprimer", onChoisir: supprimer, destructif: true },
      ],
    })
    const plus = screen.getByRole("button", { name: "Plus d'actions" })
    await userEvent.hover(plus)
    expect(await trouverInfobulle()).toHaveTextContent("Plus d'actions")
    await userEvent.click(plus)
    const archiverItem = await screen.findByRole("menuitem", {
      name: /Archiver/,
    })
    expect(archiverItem).toHaveTextContent("Déjà archivé")
    // La raison n'est pas estompée avec l'entrée : elle doit rester lisible.
    expect(archiverItem).toHaveClass("data-disabled:opacity-100")
    expect(screen.getByText("Déjà archivé").closest(".opacity-50")).toBeNull()
    expect(screen.getByText("Archiver")).toHaveClass("opacity-50")
    await userEvent.click(archiverItem)
    expect(archiver).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("menuitem", { name: "Supprimer" }))
    expect(supprimer).toHaveBeenCalledOnce()
  })
})

describe("PageContainer", () => {
  it("pose marges, largeur et espacement, et relaie ses props", () => {
    render(
      <PageContainer largeur="md" aria-label="Contenu" className="gap-10">
        <PageHeader titre="Groupes" />
      </PageContainer>
    )
    const conteneur = screen.getByLabelText("Contenu")
    expect(conteneur).toHaveAttribute("data-slot", "page-container")
    expect(conteneur).toHaveClass("mx-auto", "max-w-3xl", "px-4", "gap-10")
    expect(conteneur).not.toHaveClass("gap-6")
    expect(
      screen.getByRole("heading", { level: 1, name: "Groupes" })
    ).toBeInTheDocument()
  })
})

describe("SectionCard", () => {
  it("titre la section d'un niveau 2, avec ses actions", () => {
    render(
      <SectionCard titre="Identité" actions={<button>Modifier</button>}>
        Contenu
      </SectionCard>
    )
    expect(
      screen.getByRole("heading", { level: 2, name: "Identité" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Modifier" })).toBeInTheDocument()
    expect(screen.getByText("Contenu")).toBeInTheDocument()
  })
})
