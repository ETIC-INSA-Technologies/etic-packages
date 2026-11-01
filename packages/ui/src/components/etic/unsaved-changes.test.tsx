import { renderHook, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  Button,
  UnsavedChangesDialog,
  useUnsavedChangesWarning,
  type UnsavedChangesBlocage,
} from "@etic-ui/index"

/** Envoie un `beforeunload` annulable ; vrai si la page l'a retenu. */
function quitterLaPage() {
  const event = new Event("beforeunload", { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe("useUnsavedChangesWarning", () => {
  it("retient la fermeture de l'onglet tant que la page est modifiée", () => {
    const { rerender, unmount } = renderHook(
      ({ modifie }) => useUnsavedChangesWarning(modifie),
      { initialProps: { modifie: false } }
    )
    expect(quitterLaPage()).toBe(false)
    rerender({ modifie: true })
    expect(quitterLaPage()).toBe(true)
    rerender({ modifie: false })
    expect(quitterLaPage()).toBe(false)
    rerender({ modifie: true })
    unmount()
    expect(quitterLaPage()).toBe(false)
  })

  it("lit une fonction au moment de quitter, sans nouveau rendu", () => {
    let nonEnregistre = false
    const { unmount } = renderHook(() =>
      useUnsavedChangesWarning(() => nonEnregistre)
    )
    expect(quitterLaPage()).toBe(false)
    nonEnregistre = true
    expect(quitterLaPage()).toBe(true)
    unmount()
    expect(quitterLaPage()).toBe(false)
  })
})

/** Un routeur minimal : « Paramètres » retient la navigation vers « Accueil ». */
function Page({ proceed, reset }: { proceed: () => void; reset: () => void }) {
  const [etat, setEtat] = useState<UnsavedChangesBlocage["state"]>("unblocked")
  const blocage: UnsavedChangesBlocage =
    etat === "blocked"
      ? {
          state: "blocked",
          proceed: () => {
            proceed()
            setEtat("proceeding")
          },
          reset: () => {
            reset()
            setEtat("unblocked")
          },
        }
      : { state: etat }
  return (
    <>
      <Button onClick={() => setEtat("blocked")}>Accueil</Button>
      <UnsavedChangesDialog blocage={blocage} />
    </>
  )
}

describe("UnsavedChangesDialog", () => {
  it("s'ouvre quand la navigation est retenue ; « Quitter sans enregistrer » la laisse partir", async () => {
    const proceed = vi.fn()
    const reset = vi.fn()
    render(<Page proceed={proceed} reset={reset} />)
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Accueil" }))
    const dialogue = await screen.findByRole("alertdialog", {
      name: "Modifications non enregistrées",
    })
    expect(dialogue).toHaveAccessibleDescription(
      "Les modifications ne sont pas enregistrées. Si vous quittez la page, elles seront perdues."
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Quitter sans enregistrer" })
    )
    expect(proceed).toHaveBeenCalledOnce()
    // La fermeture qui suit n'abandonne pas la navigation.
    expect(reset).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
  })

  it("« Rester sur la page » ou Échap abandonnent la navigation", async () => {
    const proceed = vi.fn()
    const reset = vi.fn()
    render(<Page proceed={proceed} reset={reset} />)
    await userEvent.click(screen.getByRole("button", { name: "Accueil" }))
    await userEvent.click(
      await screen.findByRole("button", { name: "Rester sur la page" })
    )
    expect(reset).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )

    await userEvent.click(screen.getByRole("button", { name: "Accueil" }))
    await screen.findByRole("alertdialog")
    await userEvent.keyboard("{Escape}")
    expect(reset).toHaveBeenCalledTimes(2)
    expect(proceed).not.toHaveBeenCalled()
  })

  it("textes personnalisables", async () => {
    render(
      <UnsavedChangesDialog
        blocage={{ state: "blocked", proceed: () => {}, reset: () => {} }}
        titre="Paramètres non enregistrés"
        description="Les paramètres modifiés seront perdus."
        libelleQuitter="Abandonner"
        libelleRester="Continuer"
      />
    )
    expect(
      await screen.findByRole("alertdialog", {
        name: "Paramètres non enregistrés",
      })
    ).toHaveAccessibleDescription("Les paramètres modifiés seront perdus.")
    expect(
      screen.getByRole("button", { name: "Abandonner" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Continuer" })
    ).toBeInTheDocument()
  })
})
