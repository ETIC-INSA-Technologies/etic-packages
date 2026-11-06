import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { FormField, Input, ResetButton } from "@etic-ui/index"
import { trouverInfobulle } from "@etic-ui/test/infobulle"

/** Un champ avec une valeur par défaut, et son bouton ↶. */
function ChampAvecDefaut({
  initiale,
  libelle = "Copies conservées",
}: {
  initiale: string
  libelle?: string
}) {
  const [valeur, setValeur] = useState(initiale)
  return (
    <FormField
      libelle={libelle}
      action={
        <ResetButton
          valeur="6"
          masque={valeur === "6"}
          onRetablir={() => setValeur("6")}
        />
      }
    >
      <Input value={valeur} onChange={(e) => setValeur(e.target.value)} />
    </FormField>
  )
}

describe("ResetButton", () => {
  it("dans un champ : icône seule, la valeur en infobulle, le libellé du champ dans le nom", async () => {
    render(<ChampAvecDefaut initiale="7" />)
    const bouton = screen.getByRole("button", {
      name: "Rétablir la valeur par défaut (6) du champ Copies conservées",
    })
    expect(bouton.querySelector("svg")).not.toBeNull()
    expect(bouton).not.toHaveTextContent(/\S/)
    await userEvent.hover(bouton)
    expect(await trouverInfobulle()).toHaveTextContent(
      "Rétablir la valeur par défaut : 6"
    )
  })

  it("rétablit la valeur, se masque et rend le focus au champ", async () => {
    const user = userEvent.setup()
    render(<ChampAvecDefaut initiale="7" />)
    const champ = screen.getByRole("textbox", { name: "Copies conservées" })
    await user.click(screen.getByRole("button", { name: /Rétablir/ }))
    expect(champ).toHaveValue("6")
    expect(champ).toHaveFocus()
    expect(screen.queryByRole("button", { name: /Rétablir/ })).toBeNull()
  })

  it("masqué, garde sa place hors de la tabulation et de l'arbre d'accessibilité", () => {
    render(<ChampAvecDefaut initiale="6" />)
    expect(screen.queryByRole("button")).toBeNull()
    const bouton = screen.getByRole("button", { hidden: true })
    expect(bouton).toHaveClass("invisible")
    expect(bouton).toHaveAttribute("tabindex", "-1")
  })

  it("le champ garde le focus quand le bouton apparaît pendant la frappe", async () => {
    const user = userEvent.setup()
    render(<ChampAvecDefaut initiale="6" />)
    const champ = screen.getByRole("textbox", { name: "Copies conservées" })
    await user.clear(champ)
    await user.type(champ, "12")
    expect(champ).toHaveFocus()
    expect(champ).toHaveValue("12")
    expect(screen.getByRole("button", { name: /Rétablir/ })).toBeVisible()
  })

  it("sans valeur : le bouton général d'un formulaire", async () => {
    const onRetablir = vi.fn()
    render(<ResetButton onRetablir={onRetablir} />)
    const bouton = screen.getByRole("button", {
      name: "Rétablir toutes les valeurs par défaut",
    })
    await userEvent.click(bouton)
    expect(onRetablir).toHaveBeenCalledTimes(1)
  })

  it("hors d'un champ, focalise la cible donnée", async () => {
    render(
      <>
        <button type="button" id="suivant">
          Suivant
        </button>
        <ResetButton
          valeur="Hebdomadaire"
          cible="suivant"
          onRetablir={() => {}}
        />
      </>
    )
    await userEvent.click(
      screen.getByRole("button", {
        name: "Rétablir la valeur par défaut : Hebdomadaire",
      })
    )
    expect(screen.getByRole("button", { name: "Suivant" })).toHaveFocus()
  })
})
