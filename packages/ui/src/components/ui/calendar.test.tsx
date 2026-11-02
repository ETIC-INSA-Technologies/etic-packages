import { useState } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Calendar } from "@etic-ui/index"

function Choix() {
  const [jour, setJour] = useState<Date | undefined>(new Date(2026, 9, 15))
  return (
    <Calendar
      mode="single"
      selected={jour}
      onSelect={setJour}
      defaultMonth={new Date(2026, 9, 1)}
    />
  )
}

describe("Calendar, listes du mois et de l'année", () => {
  it("passent par le Select de la bibliothèque, pas par un <select> natif", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Calendar
        captionLayout="dropdown"
        defaultMonth={new Date(2026, 9, 1)}
        startMonth={new Date(2020, 0, 1)}
        endMonth={new Date(2030, 11, 1)}
      />
    )
    expect(container.querySelector("select")).toBeNull()
    const annee = screen.getByRole("combobox", { name: /année/i })
    expect(annee).toHaveTextContent("2026")
    expect(screen.getByRole("combobox", { name: /mois/i })).toHaveTextContent(
      "oct."
    )

    await user.click(annee)
    await user.click(await screen.findByRole("option", { name: "2024" }))
    expect(screen.getByRole("grid")).toHaveAccessibleName("octobre 2024")
    // L'en-tête est recréé pour le nouveau mois : le focus suit la liste.
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /année/i })).toHaveFocus()
    )
    expect(screen.getByRole("combobox", { name: /année/i })).toHaveTextContent(
      "2024"
    )
  })

  it("passent au-dessus de la barre des flèches, à leur hauteur", () => {
    render(<Calendar captionLayout="dropdown" />)
    // jsdom n'applique pas les styles : la superposition se lit aux classes.
    for (const liste of screen.getAllByRole("combobox")) {
      expect(liste).toHaveClass(
        "relative",
        "z-10",
        "data-[size=sm]:h-(--cell-size)"
      )
    }
  })
})

describe("Calendar au clavier", () => {
  it("les flèches déplacent le focus d'un jour à l'autre", async () => {
    const user = userEvent.setup()
    render(<Choix />)

    await user.tab() // mois précédent
    await user.tab() // mois suivant
    await user.tab() // le jour choisi
    expect(document.activeElement).toHaveAccessibleName(/ 15 octobre 2026/)

    await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowUp}")
    expect(document.activeElement).toHaveAccessibleName(/ 6 octobre 2026/)

    await user.keyboard("{Enter}")
    expect(
      screen.getByRole("button", { name: / 6 octobre 2026/ })
    ).toHaveAttribute("data-selected-single", "true")
  })

  it("Page suivante garde le focus dans la grille du nouveau mois", async () => {
    const user = userEvent.setup()
    render(<Choix />)
    await user.tab()
    await user.tab()
    await user.tab()

    await user.keyboard("{PageDown}")
    expect(screen.getByRole("grid")).toHaveAccessibleName("novembre 2026")
    expect(document.activeElement).toHaveAccessibleName(/ 15 novembre 2026/)
  })
})
