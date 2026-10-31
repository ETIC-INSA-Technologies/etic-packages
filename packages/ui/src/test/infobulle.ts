import { waitFor } from "@testing-library/react"
import { expect } from "vitest"

/** L'infobulle ouverte. Base UI ne lui donne pas de rôle `tooltip`. */
export const trouverInfobulle = () =>
  waitFor(() => {
    const infobulle = document.querySelector('[data-slot="tooltip-content"]')
    expect(infobulle).not.toBeNull()
    return infobulle as HTMLElement
  })
