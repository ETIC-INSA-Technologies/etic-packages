import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Checkbox, CheckboxList, FormField } from "@etic-ui/index"

describe("CheckboxList", () => {
  it("coche et décoche, et respecte les cases figées", async () => {
    const user = userEvent.setup()
    const changer = vi.fn()
    render(
      <CheckboxList
        aria-label="Groupes"
        options={[
          { valeur: "bureau", libelle: "Bureau" },
          {
            valeur: "membres",
            libelle: "Membres",
            description: "Groupe obligatoire.",
            disabled: true,
          },
        ]}
        valeurs={["membres"]}
        onValeursChange={changer}
      />
    )
    expect(screen.getByRole("group", { name: "Groupes" })).toBeVisible()
    await user.click(screen.getByRole("checkbox", { name: "Bureau" }))
    expect(changer).toHaveBeenLastCalledWith(["membres", "bureau"])

    const figee = screen.getByRole("checkbox", { name: "Membres" })
    expect(figee).toBeChecked()
    expect(figee).toHaveAttribute("aria-disabled", "true")
    // La raison est reliée à la case, pas seulement affichée à côté.
    expect(figee).toHaveAccessibleDescription("Groupe obligatoire.")
  })

  it("disabled fige toute la liste", () => {
    render(
      <CheckboxList
        aria-label="Groupes"
        options={[{ valeur: "bureau", libelle: "Bureau" }]}
        valeurs={[]}
        onValeursChange={vi.fn()}
        disabled
      />
    )
    expect(screen.getByRole("checkbox", { name: "Bureau" })).toHaveAttribute(
      "aria-disabled",
      "true"
    )
  })

  it("obligatoire : le groupe le dit dans son nom, sans aria-required", () => {
    render(
      <FormField libelle="Groupes" obligatoire>
        <CheckboxList
          options={[{ valeur: "dsi", libelle: "DSI" }]}
          valeurs={[]}
          onValeursChange={vi.fn()}
        />
      </FormField>
    )
    const groupe = screen.getByRole("group", { name: "Groupes obligatoire" })
    expect(groupe).not.toHaveAttribute("aria-required")
    // Une case n'est pas obligatoire à elle seule.
    expect(screen.getByRole("checkbox", { name: "DSI" })).not.toHaveAttribute(
      "aria-required"
    )
  })

  it("dans un FormField, une case figée n'estompe que sa ligne", () => {
    render(
      <FormField libelle="Groupes">
        <CheckboxList
          options={[
            { valeur: "bureau", libelle: "Bureau" },
            { valeur: "membres", libelle: "Membres", disabled: true },
          ]}
          valeurs={["membres"]}
          onValeursChange={vi.fn()}
        />
      </FormField>
    )
    const libre = screen.getByRole("checkbox", { name: "Bureau" })
    const figee = screen.getByRole("checkbox", { name: "Membres" })
    // jsdom ne calcule pas les variantes Tailwind : la case s'estompe
    // d'après son propre état (data-disabled), plus d'après le champ
    // englobant, qui contient l'entrée désactivée de sa voisine.
    expect(libre).not.toHaveClass("group-has-disabled/field:opacity-50")
    expect(libre).toHaveClass("data-disabled:opacity-50")
    expect(libre).not.toHaveAttribute("data-disabled")
    expect(libre).not.toHaveAttribute("aria-disabled")
    expect(figee).toHaveAttribute("data-disabled")
    // Le libellé suit sa ligne seule.
    expect(libre.closest('[data-slot="field"]')).not.toHaveAttribute(
      "data-disabled"
    )
    expect(figee.closest('[data-slot="field"]')).toHaveAttribute(
      "data-disabled",
      "true"
    )
  })

  it("une case aria-disabled (lecture seule) a l'apparence figée", () => {
    render(<Checkbox aria-label="Importer" aria-disabled="true" readOnly />)
    expect(screen.getByRole("checkbox", { name: "Importer" })).toHaveClass(
      "aria-disabled:opacity-50",
      "aria-disabled:cursor-not-allowed"
    )
  })

  it("dans un fieldset désactivé, la case est vraiment inactive, et en a l'air", async () => {
    // Base UI coche par son entrée cachée, que le fieldset désactive : ni
    // clic ni Espace n'y font rien. L'apparence suit cet état réel.
    const user = userEvent.setup()
    render(
      <fieldset disabled>
        <Checkbox aria-label="Envoi en cours" />
      </fieldset>
    )
    const caseFigee = screen.getByRole("checkbox", { name: "Envoi en cours" })
    await user.click(caseFigee)
    expect(caseFigee).not.toBeChecked()
    caseFigee.focus()
    await user.keyboard(" ")
    expect(caseFigee).not.toBeChecked()
    expect(caseFigee).toHaveClass(
      "in-[fieldset:disabled]:opacity-50",
      "in-[fieldset:disabled]:cursor-not-allowed"
    )
  })

  it("dit quand il n'y a rien à cocher", () => {
    render(<CheckboxList options={[]} valeurs={[]} onValeursChange={vi.fn()} />)
    expect(screen.getByText("Aucun élément disponible.")).toBeVisible()
  })
})
