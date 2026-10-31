import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { CheckboxList, FormField } from "@etic-ui/index"

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

  it("dit quand il n'y a rien à cocher", () => {
    render(<CheckboxList options={[]} valeurs={[]} onValeursChange={vi.fn()} />)
    expect(screen.getByText("Aucun élément disponible.")).toBeVisible()
  })
})
