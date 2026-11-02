import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@etic-ui/index"

afterEach(() => vi.restoreAllMocks())

/** Laisse passer la micro-tâche où Base UI rend le focus, après le
 *  démontage du menu. */
const retourDuFocus = () => new Promise((fin) => setTimeout(fin, 0))

/** Un premier menu, puis un second dont l'entrée retire son propre
 *  déclencheur (une ligne supprimée par son menu « … »). */
function DeuxMenus() {
  const [present, setPresent] = useState(true)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button />}>Premier</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rien</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {present ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button />}>Second</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setPresent(false)}>
              Supprimer la ligne
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </>
  )
}

describe("DropdownMenu", () => {
  it("rend le focus à son déclencheur, mais pas à un autre menu si le sien a disparu", async () => {
    const user = userEvent.setup()
    render(<DeuxMenus />)
    const premier = screen.getByRole("button", { name: "Premier" })
    // Déclencheur présent : le focus lui revient (et le premier menu entre
    // dans l'historique de focus de Base UI).
    await user.click(premier)
    await user.click(await screen.findByRole("menuitem", { name: "Rien" }))
    await waitFor(() => expect(document.activeElement).toBe(premier))

    const focusPremier = vi.spyOn(premier, "focus")
    await user.click(screen.getByRole("button", { name: "Second" }))
    await user.click(
      await screen.findByRole("menuitem", { name: "Supprimer la ligne" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    )
    await retourDuFocus()
    // Déclencheur disparu : le focus reste sur <body>, où l'application le
    // rattrape ; « Premier », sans rapport, n'est pas refocalisé.
    expect(focusPremier).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(document.body)
  })

  // Un dialogue ouvert par une entrée garde le focus (le menu ne le lui
  // reprend pas) : happy-dom ne reproduit pas l'ordre du navigateur, où le
  // dialogue prend le focus avant le retour du menu ; vérifié au navigateur.
})
