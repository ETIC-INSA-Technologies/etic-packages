import { waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect } from "vitest"

/** Pressions dans chaque sens : plus que de contrôles dans les dialogues testés. */
const TOURS = 6

/**
 * Tab et Maj+Tab font le tour d'un dialogue ouvert sans en sortir : le focus
 * revient toujours dedans, et `dehors` (un bouton de la page, derrière le
 * voile) ne le reçoit jamais. Base UI renvoie le focus depuis ses gardes
 * (`data-base-ui-focus-guard`, de part et d'autre du dialogue) un instant
 * après la tabulation : d'où l'attente après chaque pression.
 */
export async function verifierPiegeFocus(
  dialogue: HTMLElement,
  dehors: HTMLElement
) {
  let sorti = false
  const surFocus = () => (sorti = true)
  dehors.addEventListener("focus", surFocus)
  try {
    await waitFor(() =>
      expect(dialogue.contains(document.activeElement)).toBe(true)
    )
    for (const shift of [false, true]) {
      for (let i = 0; i < TOURS; i++) {
        await userEvent.tab({ shift })
        await waitFor(() =>
          expect(dialogue.contains(document.activeElement)).toBe(true)
        )
      }
    }
    expect(sorti).toBe(false)
  } finally {
    dehors.removeEventListener("focus", surFocus)
  }
}
