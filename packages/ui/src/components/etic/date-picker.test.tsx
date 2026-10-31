import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  DatePicker,
  type DatePickerDetails,
  type DatePickerProps,
} from "@etic-ui/index"

function Demo({
  initiale,
  surChangement,
  ...props
}: Partial<DatePickerProps> & {
  initiale?: Date
  surChangement?: (d: Date | undefined, details: DatePickerDetails) => void
}) {
  const [valeur, setValeur] = useState<Date | undefined>(initiale)
  return (
    <>
      <DatePicker
        aria-label="Date"
        {...props}
        valeur={valeur}
        onValeurChange={(d, details) => {
          setValeur(d)
          surChangement?.(d, details)
        }}
      />
      <button type="button" onClick={() => setValeur(new Date(2030, 0, 1))}>
        Réinitialiser
      </button>
    </>
  )
}

const valide = { invalide: false }

describe("DatePicker", () => {
  it("lit une date tapée au clavier, en français", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(<Demo surChangement={surChangement} />)

    const champ = screen.getByRole("textbox", { name: "Date" })
    await user.type(champ, "5-3-2026{Enter}")
    expect(surChangement).toHaveBeenLastCalledWith(new Date(2026, 2, 5), valide)
    expect(champ).toHaveValue("05/03/2026")
  })

  it("lit les chiffres seuls (pavé numérique sans séparateur)", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(<Demo surChangement={surChangement} />)
    const champ = screen.getByRole("textbox", { name: "Date" })

    await user.type(champ, "05032026{Enter}")
    expect(surChangement).toHaveBeenLastCalledWith(new Date(2026, 2, 5), valide)
    await user.clear(champ)
    await user.type(champ, "170726{Enter}")
    expect(surChangement).toHaveBeenLastCalledWith(
      new Date(2026, 6, 17),
      valide
    )
    expect(champ).toHaveValue("17/07/2026")
  })

  it("une saisie illisible ou hors bornes dit pourquoi et prévient l'application", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(
      <Demo
        initiale={new Date(2026, 0, 15)}
        surChangement={surChangement}
        dateMax={new Date(2026, 11, 31)}
      />
    )
    const champ = screen.getByRole("textbox", { name: "Date" })
    expect(champ).toHaveAccessibleDescription("Format : jj/mm/aaaa.")

    await user.clear(champ)
    await user.type(champ, "31/02/2026")
    await user.tab()
    expect(champ).toHaveAttribute("aria-invalid", "true")
    expect(champ).toHaveAccessibleDescription(
      "Date illisible : saisissez jj/mm/aaaa. Format : jj/mm/aaaa."
    )
    // L'application ne garde pas le 15/01 sans le savoir.
    expect(surChangement).toHaveBeenLastCalledWith(undefined, {
      invalide: true,
    })
    // Un formulaire natif refuse l'envoi, avec le même message.
    expect((champ as HTMLInputElement).validationMessage).toBe(
      "Date illisible : saisissez jj/mm/aaaa."
    )
    expect(champ).toHaveValue("31/02/2026")

    await user.clear(champ)
    expect(champ).not.toHaveAttribute("aria-invalid")
    await user.type(champ, "01/01/2027{Enter}")
    expect(champ).toHaveAttribute("aria-invalid", "true")
    expect(champ).toHaveAccessibleDescription(
      "Date hors limites : jusqu'au 31/12/2026. Format : jj/mm/aaaa."
    )

    await user.clear(champ)
    await user.type(champ, "02/03/2026{Enter}")
    expect(champ).not.toHaveAttribute("aria-invalid")
    expect((champ as HTMLInputElement).validationMessage).toBe("")
    expect(surChangement).toHaveBeenLastCalledWith(new Date(2026, 2, 2), valide)
  })

  it("garde la saisie refusée quand l'application ignore le undefined émis", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    function Tetu() {
      const [valeur, setValeur] = useState<Date | undefined>(
        new Date(2026, 0, 15)
      )
      return (
        <DatePicker
          aria-label="Date"
          valeur={valeur}
          onValeurChange={(d, details) => {
            surChangement(d, details)
            // Garde sa date tant qu'on ne lui en donne pas une autre.
            if (d) setValeur(d)
          }}
        />
      )
    }
    render(<Tetu />)
    const champ = screen.getByRole("textbox", { name: "Date" })
    await user.clear(champ)
    await user.type(champ, "31/02/2026{Enter}")
    expect(surChangement).toHaveBeenLastCalledWith(undefined, {
      invalide: true,
    })
    expect(champ).toHaveValue("31/02/2026")
    expect(champ).toHaveAttribute("aria-invalid", "true")
    await user.tab()
    expect(champ).toHaveValue("31/02/2026")
    expect(champ).toHaveAttribute("aria-invalid", "true")
    expect((champ as HTMLInputElement).validationMessage).toBe(
      "Date illisible : saisissez jj/mm/aaaa."
    )

    // Retaper efface le refus.
    await user.type(champ, "{Backspace}")
    expect(champ).not.toHaveAttribute("aria-invalid")
  })

  it("choisit dans le calendrier, qui commence le lundi", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(
      <Demo initiale={new Date(2026, 9, 1)} surChangement={surChangement} />
    )

    await user.click(
      screen.getByRole("button", { name: "Choisir dans le calendrier" })
    )
    const grille = await screen.findByRole("grid")
    expect(grille).toHaveAccessibleName("octobre 2026")
    // Le focus va au jour choisi, pas au bouton « mois précédent ».
    expect(document.activeElement).toHaveAccessibleName(/ 1 octobre 2026/)
    expect(grille.querySelector("th[scope=col]")).toHaveAttribute(
      "aria-label",
      "lundi"
    )

    await user.click(screen.getByRole("button", { name: / 15 octobre 2026/ }))
    expect(surChangement).toHaveBeenLastCalledWith(
      new Date(2026, 9, 15),
      valide
    )
    expect(screen.getByRole("textbox", { name: "Date" })).toHaveValue(
      "15/10/2026"
    )
    expect(screen.queryByRole("grid")).toBeNull()
  })

  it("au clavier : le calendrier s'ouvre sur le jour choisi, les flèches s'y déplacent", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(
      <Demo initiale={new Date(2026, 9, 15)} surChangement={surChangement} />
    )
    await user.click(screen.getByRole("textbox", { name: "Date" }))
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}")
    await screen.findByRole("grid")
    expect(document.activeElement).toHaveAccessibleName(/ 15 octobre 2026/)

    await user.keyboard("{ArrowRight}{ArrowDown}")
    expect(document.activeElement).toHaveAccessibleName(/ 23 octobre 2026/)
    await user.keyboard("{PageDown}")
    expect(document.activeElement).toHaveAccessibleName(/ 23 novembre 2026/)
    await user.keyboard("{Enter}")
    expect(surChangement).toHaveBeenLastCalledWith(
      new Date(2026, 10, 23),
      valide
    )
  })

  it("s'efface en gardant le focus dans le champ, et suit une valeur changée par l'application", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(
      <Demo initiale={new Date(2026, 9, 1)} surChangement={surChangement} />
    )
    const champ = screen.getByRole("textbox", { name: "Date" })
    expect(champ).toHaveValue("01/10/2026")

    await user.click(screen.getByRole("button", { name: "Effacer la date" }))
    expect(surChangement).toHaveBeenLastCalledWith(undefined, valide)
    expect(champ).toHaveValue("")
    expect(document.activeElement).toBe(champ)

    await user.click(screen.getByRole("button", { name: "Réinitialiser" }))
    expect(champ).toHaveValue("01/01/2030")
  })

  it("avec name, soumet la date au format ISO", () => {
    const { container } = render(
      <form>
        <DatePicker
          aria-label="Date"
          name="naissance"
          valeur={new Date(2026, 2, 5)}
          onValeurChange={vi.fn()}
        />
      </form>
    )
    const donnees = new FormData(container.querySelector("form")!)
    expect(donnees.getAll("naissance")).toEqual(["2026-03-05"])
  })
})
