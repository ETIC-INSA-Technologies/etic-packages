import { useState } from "react"
import { render, screen } from "@testing-library/react"
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
