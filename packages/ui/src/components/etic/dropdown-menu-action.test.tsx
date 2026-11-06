import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ArchiveIcon } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import {
  DataTableRowActions,
  DropdownMenuAction,
  TooltipProvider,
} from "@etic-ui/index"

function ouvrirMenu() {
  return userEvent.click(screen.getByRole("button", { name: "Actions" }))
}

describe("DropdownMenuAction", () => {
  it("verrouillée : grisée, sans effet, raison lisible sous le libellé", async () => {
    const archiver = vi.fn()
    const supprimer = vi.fn()
    render(
      <TooltipProvider>
        <DataTableRowActions libelle="Actions">
          <DropdownMenuAction
            libelle="Archiver"
            icone={ArchiveIcon}
            verrou="Déjà archivé"
            onChoisir={archiver}
          />
          <DropdownMenuAction
            libelle="Supprimer"
            destructif
            onChoisir={supprimer}
          />
        </DataTableRowActions>
      </TooltipProvider>
    )
    await ouvrirMenu()
    const archiverItem = await screen.findByRole("menuitem", {
      name: /Archiver/,
    })
    expect(archiverItem).toHaveAttribute("aria-disabled", "true")
    expect(archiverItem).toHaveTextContent("Déjà archivé")
    // Seuls l'icône et le libellé s'estompent : la raison reste lisible.
    expect(archiverItem).toHaveClass("data-disabled:opacity-100")
    expect(screen.getByText("Déjà archivé").closest(".opacity-50")).toBeNull()
    expect(screen.getByText("Archiver")).toHaveClass("opacity-50")
    expect(archiverItem.querySelector("svg")).toHaveClass("opacity-50")
    await userEvent.click(archiverItem)
    expect(archiver).not.toHaveBeenCalled()

    const supprimerItem = screen.getByRole("menuitem", { name: "Supprimer" })
    expect(supprimerItem).toHaveAttribute("data-variant", "destructive")
    await userEvent.click(supprimerItem)
    expect(supprimer).toHaveBeenCalledOnce()
  })

  it("active : une description discrète sous le libellé, onClick relayé", async () => {
    const onChoisir = vi.fn()
    const onClick = vi.fn()
    render(
      <TooltipProvider>
        <DataTableRowActions libelle="Actions">
          <DropdownMenuAction
            libelle="Régénérer"
            description="Remplace le fichier actuel"
            onChoisir={onChoisir}
            onClick={onClick}
          />
        </DataTableRowActions>
      </TooltipProvider>
    )
    await ouvrirMenu()
    const item = await screen.findByRole("menuitem", { name: /Régénérer/ })
    expect(item).toHaveTextContent("Remplace le fichier actuel")
    expect(screen.getByText("Régénérer")).not.toHaveClass("opacity-50")
    await userEvent.click(item)
    expect(onChoisir).toHaveBeenCalledOnce()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("rend un lien par render, comme DropdownMenuItem", async () => {
    render(
      <TooltipProvider>
        <DataTableRowActions libelle="Actions">
          <DropdownMenuAction
            libelle="Ouvrir"
            render={<a href="https://example.org/fichier" />}
          />
        </DataTableRowActions>
      </TooltipProvider>
    )
    await ouvrirMenu()
    const lien = await screen.findByRole("menuitem", { name: "Ouvrir" })
    expect(lien).toHaveAttribute("href", "https://example.org/fichier")
  })
})
