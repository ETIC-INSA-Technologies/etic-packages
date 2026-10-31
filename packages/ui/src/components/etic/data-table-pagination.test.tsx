import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { DataTablePagination } from "@etic-ui/index"

const pages = () =>
  within(screen.getByRole("navigation", { name: "Pagination" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent)

describe("DataTablePagination", () => {
  it("affiche une fenêtre de pages autour de la page courante", () => {
    render(
      <DataTablePagination
        total={500}
        decalage={125}
        limite={25}
        onDecalageChange={vi.fn()}
      />
    )
    // Page 6 sur 20.
    expect(pages()).toEqual([
      "Précédente",
      "1",
      "Autres pages",
      "5",
      "6",
      "7",
      "Autres pages",
      "20",
      "Suivante",
    ])
    expect(screen.getByRole("button", { name: "Page 6" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("navigue par décalage et borne les extrémités", async () => {
    const user = userEvent.setup()
    const onDecalageChange = vi.fn()
    const { rerender } = render(
      <DataTablePagination
        total={60}
        decalage={0}
        limite={25}
        onDecalageChange={onDecalageChange}
      />
    )
    expect(
      screen.getByRole("button", { name: "Page précédente" })
    ).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("button", { name: "Page précédente" }))
    expect(onDecalageChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Page suivante" }))
    expect(onDecalageChange).toHaveBeenLastCalledWith(25)
    await user.click(screen.getByRole("button", { name: "Page 3" }))
    expect(onDecalageChange).toHaveBeenLastCalledWith(50)

    rerender(
      <DataTablePagination
        total={60}
        decalage={50}
        limite={25}
        onDecalageChange={onDecalageChange}
      />
    )
    expect(
      screen.getByRole("button", { name: "Page suivante" })
    ).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("button", { name: "Page précédente" }))
    expect(onDecalageChange).toHaveBeenLastCalledWith(25)
  })

  it("garde le focus sur « Page suivante » en arrivant à la dernière page, et annonce la page", async () => {
    const user = userEvent.setup()
    function Pages() {
      const [decalage, setDecalage] = useState(0)
      return (
        <DataTablePagination
          total={60}
          decalage={decalage}
          limite={25}
          onDecalageChange={setDecalage}
        />
      )
    }
    render(<Pages />)
    const suivante = screen.getByRole("button", { name: "Page suivante" })
    suivante.focus()
    await user.keyboard("{Enter}")
    await user.keyboard("{Enter}")
    expect(suivante).toHaveAttribute("aria-disabled", "true")
    expect(document.activeElement).toBe(suivante)
    expect(screen.getByText("Page 3 sur 3")).toHaveAttribute(
      "aria-live",
      "polite"
    )
    // Encore Entrée : rien ne bouge, le focus non plus.
    await user.keyboard("{Enter}")
    expect(document.activeElement).toBe(suivante)
    expect(screen.getByText("Page 3 sur 3")).toBeInTheDocument()
  })

  it("ne ramène rien tant que le total n'est pas connu (chargement)", () => {
    const onDecalageChange = vi.fn()
    // Page 3 demandée : pendant la requête, le total retombe à 0.
    const { rerender } = render(
      <DataTablePagination
        total={0}
        decalage={50}
        limite={25}
        onDecalageChange={onDecalageChange}
      />
    )
    rerender(
      <DataTablePagination
        total={137}
        decalage={50}
        limite={25}
        onDecalageChange={onDecalageChange}
      />
    )
    expect(onDecalageChange).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("change le nombre par page et revient à la première page", async () => {
    const user = userEvent.setup()
    const onDecalageChange = vi.fn()
    const onLimiteChange = vi.fn()
    render(
      <DataTablePagination
        total={300}
        decalage={50}
        limite={25}
        onDecalageChange={onDecalageChange}
        onLimiteChange={onLimiteChange}
      />
    )
    await user.click(screen.getByRole("combobox", { name: "Lignes par page" }))
    await user.click(await screen.findByRole("option", { name: "100" }))
    expect(onLimiteChange).toHaveBeenCalledWith(100)
    expect(onDecalageChange).toHaveBeenLastCalledWith(0)
  })

  it("ne s'affiche pas quand tout tient sur une page", () => {
    const { container, rerender } = render(
      <DataTablePagination
        total={8}
        decalage={0}
        limite={25}
        onDecalageChange={vi.fn()}
        onLimiteChange={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()

    // Une seule page, mais assez de lignes pour choisir une taille plus petite.
    rerender(
      <DataTablePagination
        total={20}
        decalage={0}
        limite={25}
        onDecalageChange={vi.fn()}
        onLimiteChange={vi.fn()}
      />
    )
    expect(screen.queryByRole("navigation")).toBeNull()
    expect(
      screen.getByRole("combobox", { name: "Lignes par page" })
    ).toBeInTheDocument()
  })

  it("ramène sur la dernière page un décalage passé au-delà de la fin", () => {
    const onDecalageChange = vi.fn()
    // La seule ligne de la page 4 vient d'être supprimée : 75 éléments.
    render(
      <DataTablePagination
        total={75}
        decalage={75}
        limite={25}
        onDecalageChange={onDecalageChange}
      />
    )
    expect(onDecalageChange).toHaveBeenCalledTimes(1)
    expect(onDecalageChange).toHaveBeenCalledWith(50)
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })
})
