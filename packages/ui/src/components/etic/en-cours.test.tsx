// Un seul état « en cours » : les boutons occupés de la bibliothèque passent
// tous par `Button enCours` (roue muette à la place de l'icône, `aria-busy`,
// focalisable, `data-en-cours`).
import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LockIcon } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import {
  ConfirmDialog,
  DraftResumeDialog,
  ErrorBanner,
  FileUploadButton,
  IconToggle,
} from "@etic-ui/index"
import { useAction } from "@etic-ui/components/etic/action"

/** Le bouton est en cours à la manière de `Button` : une seule roue, muette,
 *  et plus aucune autre icône. */
function attendreEnCours(bouton: HTMLElement) {
  expect(bouton).toHaveAttribute("data-en-cours")
  expect(bouton).toHaveAttribute("aria-busy", "true")
  expect(bouton).toHaveAttribute("aria-disabled", "true")
  expect(bouton).not.toBeDisabled()
  const icones = bouton.querySelectorAll("svg")
  expect(icones).toHaveLength(1)
  expect(icones[0]).toHaveAttribute("data-slot", "spinner")
  expect(icones[0]).toHaveAttribute("aria-hidden", "true")
  expect(icones[0]).not.toHaveAttribute("aria-label")
  expect(icones[0]).not.toHaveAttribute("role")
}

describe("état en cours commun", () => {
  it("ConfirmDialog : la confirmation, gardant son data-slot", async () => {
    render(
      <ConfirmDialog
        ouvert
        titre="Supprimer"
        description="Le groupe sera supprimé."
        libelleConfirmer="Supprimer"
        onConfirmer={() => new Promise(() => {})}
      />
    )
    const confirmer = await screen.findByRole("button", { name: "Supprimer" })
    await userEvent.click(confirmer)
    attendreEnCours(confirmer)
    expect(confirmer).toHaveAttribute("data-slot", "alert-dialog-action")
    expect(confirmer).toHaveFocus()
  })

  it("ErrorBanner : « Réessayer », sa flèche remplacée par la roue", () => {
    const { rerender } = render(
      <ErrorBanner erreur="Échec" onReessayer={() => {}} />
    )
    const bouton = screen.getByRole("button", { name: "Réessayer" })
    expect(bouton.querySelector("svg")).not.toHaveAttribute(
      "data-slot",
      "spinner"
    )
    rerender(<ErrorBanner erreur="Échec" onReessayer={() => {}} enCours />)
    attendreEnCours(bouton)
  })

  it("FileUploadButton : sa roue est celle du Button, sans nom", () => {
    render(
      <FileUploadButton onChoisir={() => {}} enCours>
        Importer
      </FileUploadButton>
    )
    const bouton = screen.getByRole("button", { name: "Envoi en cours…" })
    attendreEnCours(bouton)
  })

  it("IconToggle : l'icône cède la place à la roue, le clic est ignoré", async () => {
    const onActifChange = vi.fn()
    render(
      <IconToggle
        actif={false}
        onActifChange={onActifChange}
        icone={LockIcon}
        libelle="Critique"
        enCours
      />
    )
    const bouton = screen.getByRole("button", { name: "Critique" })
    attendreEnCours(bouton)
    await userEvent.click(bouton)
    expect(onActifChange).not.toHaveBeenCalled()
  })

  it("DraftResumeDialog : « Repartir de zéro »", async () => {
    render(
      <DraftResumeDialog
        titre="Brouillon"
        description="Un import est en cours."
        reprenable
        libelleRepartir="Repartir de zéro"
        onReprendre={() => {}}
        onRepartir={() => new Promise(() => {})}
        onQuitter={() => {}}
      />
    )
    const bouton = await screen.findByRole("button", {
      name: "Repartir de zéro",
    })
    await userEvent.click(bouton)
    attendreEnCours(bouton)
  })
})

describe("useAction", () => {
  it("se lance sans rappel de succès", async () => {
    const { result } = renderHook(() => useAction())
    const action = vi.fn(() => Promise.resolve("ok"))
    await act(() => result.current.lancer(action))
    expect(action).toHaveBeenCalledOnce()
    expect(result.current.enCours).toBe(false)
    expect(result.current.erreur).toBeNull()
  })

  it("appelle le rappel donné, sauf si l'action renvoie false", async () => {
    const { result } = renderHook(() => useAction())
    const succes = vi.fn()
    await act(() => result.current.lancer(() => false, succes))
    expect(succes).not.toHaveBeenCalled()
    await act(() => result.current.lancer(() => undefined, succes))
    expect(succes).toHaveBeenCalledOnce()
  })
})
