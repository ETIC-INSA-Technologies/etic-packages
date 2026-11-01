import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DraftResumeDialog, type DraftResumeDialogProps } from "@etic-ui/index"

function rendre(props: Partial<DraftResumeDialogProps> = {}) {
  const rappels = {
    onReprendre: vi.fn(),
    onRepartir: vi.fn(),
    onQuitter: vi.fn(),
  }
  render(
    <DraftResumeDialog
      titre="Un import est en cours"
      description="Commencé hier par Ada Lovelace."
      reprenable
      libelleRepartir="Repartir de zéro"
      {...rappels}
      {...props}
    >
      <p>Le brouillon garde les 12 lignes déjà vérifiées.</p>
    </DraftResumeDialog>
  )
  return rappels
}

describe("DraftResumeDialog", () => {
  it("situe le brouillon et propose ses trois sorties", async () => {
    const { onReprendre, onQuitter } = rendre()
    const dialogue = await screen.findByRole("dialog", {
      name: "Un import est en cours",
    })
    expect(dialogue).toHaveAccessibleDescription(
      "Commencé hier par Ada Lovelace."
    )
    expect(dialogue).toHaveTextContent("12 lignes déjà vérifiées")
    await userEvent.click(
      screen.getByRole("button", { name: "Reprendre au même point" })
    )
    expect(onReprendre).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole("button", { name: "Quitter" }))
    expect(onQuitter).toHaveBeenCalledOnce()
  })

  it("sans `reprenable`, ne propose pas de reprendre", async () => {
    rendre({ reprenable: false })
    await screen.findByRole("dialog")
    expect(
      screen.queryByRole("button", { name: "Reprendre au même point" })
    ).not.toBeInTheDocument()
  })

  it("Échap quitte, comme le bouton", async () => {
    const { onQuitter } = rendre()
    await screen.findByRole("dialog")
    await userEvent.keyboard("{Escape}")
    expect(onQuitter).toHaveBeenCalledOnce()
  })

  it("pendant la suppression : bouton occupé, impossible de quitter ; l'échec s'affiche", async () => {
    let rejeter: (raison: unknown) => void = () => {}
    const { onQuitter, onReprendre } = rendre({
      onRepartir: () => new Promise((_, r) => (rejeter = r)),
    })
    const repartir = await screen.findByRole("button", {
      name: "Repartir de zéro",
    })
    await userEvent.click(repartir)
    expect(repartir).toHaveAttribute("aria-busy", "true")
    expect(document.activeElement).toBe(repartir)
    await userEvent.keyboard("{Escape}")
    await userEvent.click(screen.getByRole("button", { name: "Quitter" }))
    await userEvent.click(
      screen.getByRole("button", { name: "Reprendre au même point" })
    )
    expect(onQuitter).not.toHaveBeenCalled()
    expect(onReprendre).not.toHaveBeenCalled()

    rejeter(new Error("Le serveur ne répond pas."))
    const alerte = await screen.findByRole("alert")
    expect(alerte).toHaveTextContent("Échec de la suppression du brouillon.")
    await waitFor(() => expect(repartir).not.toHaveAttribute("aria-busy"))
  })

  it("affiche l'échec d'une suppression lancée hors du dialogue (`erreur`)", async () => {
    rendre({ erreur: new Error("Purge impossible.") })
    await screen.findByRole("dialog")
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Échec de la suppression du brouillon."
    )
  })

  it("oublie l'échec venu d'ailleurs dès que la suppression est relancée d'ici", async () => {
    let resoudre: () => void = () => {}
    rendre({
      erreur: new Error("Purge impossible."),
      onRepartir: () => new Promise<void>((r) => (resoudre = r)),
    })
    await screen.findByRole("alert")
    await userEvent.click(
      screen.getByRole("button", { name: "Repartir de zéro" })
    )
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    resoudre()
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Repartir de zéro" })
      ).not.toHaveAttribute("aria-busy")
    )
    // Réussie : aucun « Échec de la suppression » ne revient.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("n'a pas de croix : « Quitter » est la seule sortie, occupée pendant l'action", async () => {
    rendre()
    await screen.findByRole("dialog")
    expect(
      screen.queryByRole("button", { name: "Fermer" })
    ).not.toBeInTheDocument()
  })
})
