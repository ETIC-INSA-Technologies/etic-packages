import { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FileDropZone, FileUploadButton, FormField } from "@etic-ui/index"

const fichier = (nom: string, type: string, taille = 10) =>
  new File(["x".repeat(taille)], nom, { type })

const champFichier = (conteneur: HTMLElement) =>
  conteneur.querySelector<HTMLInputElement>("input[type=file]")!

/** Ce qu'un glisser-déposer transporte, tel que react-dropzone le lit. */
const transport = (fichiers: File[]) => ({
  dataTransfer: {
    files: fichiers,
    types: ["Files"],
    items: fichiers.map((f) => ({
      kind: "file",
      type: f.type,
      getAsFile: () => f,
    })),
  },
})

// Espaces insécables avant le deux-points et entre un nombre et son unité.
const nbsp = (texte: string) => texte.replace(/ (?=:|[KMG]?o\b)/g, "\u00a0")

describe("FileUploadButton", () => {
  it("transmet le fichier choisi, et vide le champ avant chaque choix", async () => {
    const user = userEvent.setup()
    const onChoisir = vi.fn()
    const { container } = render(
      <FileUploadButton
        accepter={{ "text/csv": [".csv"] }}
        onChoisir={onChoisir}
      >
        Importer
      </FileUploadButton>
    )
    const csv = fichier("membres.csv", "text/csv")

    await user.upload(champFichier(container), csv)
    await waitFor(() => expect(onChoisir).toHaveBeenCalledWith([csv]))
    // Vidé, le champ signale aussi le même fichier choisi une seconde fois.
    await user.click(screen.getByRole("button", { name: "Importer" }))
    expect(champFichier(container).value).toBe("")
  })

  it("refuse un type ou une taille hors limites, en français", async () => {
    const onChoisir = vi.fn()
    const onRefuser = vi.fn()
    const { container } = render(
      <FileUploadButton
        accepter={{ "application/pdf": [".pdf"] }}
        tailleMax={2 * 1024 * 1024}
        onChoisir={onChoisir}
        onRefuser={onRefuser}
      >
        Joindre
      </FileUploadButton>
    )
    // `user.upload` filtre déjà selon `accept` : l'événement brut passe.
    fireEvent.change(champFichier(container), {
      target: { files: [fichier("photo.png", "image/png")] },
    })
    await waitFor(() =>
      expect(onRefuser).toHaveBeenLastCalledWith([
        nbsp("photo.png : type de fichier non accepté (attendu : .pdf)."),
      ])
    )
    fireEvent.change(champFichier(container), {
      target: {
        files: [fichier("gros.pdf", "application/pdf", 3 * 1024 * 1024)],
      },
    })
    await waitFor(() =>
      expect(onRefuser).toHaveBeenLastCalledWith([
        nbsp("gros.pdf : fichier trop volumineux (2 Mo au plus)."),
      ])
    )
    expect(onChoisir).not.toHaveBeenCalled()
    // Avec `onRefuser`, l'application affiche les refus elle-même.
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("sans onRefuser, affiche les refus après le bouton, sans rien dans le flux avant", async () => {
    const { container } = render(
      <FileUploadButton
        accepter={{ "application/pdf": [".pdf"] }}
        onChoisir={vi.fn()}
      >
        Joindre
      </FileUploadButton>
    )
    // Zone d'annonce montée, mais hors du flux : pas d'élément de flex en
    // trop dans une barre d'outils.
    expect(screen.getByRole("alert")).toHaveClass("sr-only")
    expect(screen.getByRole("alert")).toBeEmptyDOMElement()
    // L'input du sélecteur n'est ni tabulable ni exposé.
    expect(champFichier(container)).toHaveAttribute("tabindex", "-1")
    expect(champFichier(container)).toHaveAttribute("aria-hidden", "true")

    fireEvent.change(champFichier(container), {
      target: { files: [fichier("photo.png", "image/png")] },
    })
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "photo.png : type de fichier non accepté (attendu : .pdf)."
      )
    )
    expect(screen.getByRole("alert")).not.toHaveClass("sr-only")
    expect(screen.getByRole("alert")).toHaveClass("text-destructive")
  })

  it("pendant l'envoi, reste focalisé, indisponible, et l'annonce", async () => {
    const user = userEvent.setup()
    function Envoi() {
      const [enCours, setEnCours] = useState(false)
      return (
        <>
          <FileUploadButton onChoisir={vi.fn()} enCours={enCours}>
            Importer
          </FileUploadButton>
          <button type="button" onClick={() => setEnCours((e) => !e)}>
            Basculer
          </button>
        </>
      )
    }
    render(<Envoi />)
    const basculer = screen.getByRole("button", { name: "Basculer" })
    const bouton = screen.getByRole("button", { name: "Importer" })

    // Le bouton a le focus quand l'envoi commence (sélecteur refermé).
    bouton.focus()
    fireEvent.click(basculer)
    expect(bouton).toHaveAccessibleName("Envoi en cours…")
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(bouton).toHaveAttribute("aria-busy", "true")
    expect(document.activeElement).toBe(bouton)
    expect(screen.getByRole("status")).toHaveTextContent("Envoi en cours…")

    await user.click(basculer)
    expect(screen.getByRole("status")).toHaveTextContent("Envoi terminé.")
    expect(bouton).toBeEnabled()
  })

  it("dans un FormField, le bouton reçoit le libellé et la description", () => {
    render(
      <FormField libelle="Pièce jointe" description="Un PDF, 5 Mo au plus.">
        <FileUploadButton onChoisir={vi.fn()}>Joindre</FileUploadButton>
      </FormField>
    )
    const bouton = screen.getByRole("button", { name: "Pièce jointe" })
    expect(bouton).toHaveAccessibleDescription("Un PDF, 5 Mo au plus.")
  })
})

describe("FileDropZone", () => {
  it("annonce les limites et accepte un fichier déposé", async () => {
    const onChoisir = vi.fn()
    const { container } = render(
      <FileDropZone
        accepter={{ "text/csv": [".csv"] }}
        tailleMax={1024 * 1024}
        onChoisir={onChoisir}
      />
    )
    expect(screen.getByText("Déposez un fichier ici")).toBeVisible()
    expect(screen.getByText(".csv · 1 Mo au plus")).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Choisir un fichier" })
    ).toBeEnabled()

    const csv = fichier("membres.csv", "text/csv")
    fireEvent.drop(
      container.querySelector("[data-slot=file-drop-zone]")!,
      transport([csv])
    )
    await waitFor(() => expect(onChoisir).toHaveBeenCalledWith([csv]))
  })

  it("affiche les refus dans la zone, même pour deux fichiers de même nom", async () => {
    const onChoisir = vi.fn()
    const erreurConsole = vi.spyOn(console, "error")
    const { container } = render(
      <FileDropZone accepter={{ "text/csv": [".csv"] }} onChoisir={onChoisir} />
    )
    const zone = container.querySelector("[data-slot=file-drop-zone]")!
    fireEvent.drop(
      zone,
      transport([fichier("a.csv", "text/csv"), fichier("b.csv", "text/csv")])
    )
    // Le premier est gardé, le second refusé.
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "b.csv : ignoré, un seul fichier à la fois."
      )
    )
    expect(onChoisir).toHaveBeenCalledWith([
      expect.objectContaining({ name: "a.csv" }),
    ])

    fireEvent.drop(
      zone,
      transport([
        fichier("a.txt", "text/plain"),
        fichier("a.txt", "text/plain"),
      ])
    )
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "a.txt : type de fichier non accepté (attendu : .csv)."
    )
    // Pas d'avertissement de clé React en double.
    expect(erreurConsole).not.toHaveBeenCalled()
    erreurConsole.mockRestore()
  })

  it("ne se teinte pas en refus pour un seul fichier en trop", async () => {
    const { container } = render(
      <FileDropZone accepter={{ "text/csv": [".csv"] }} onChoisir={vi.fn()} />
    )
    const zone = container.querySelector("[data-slot=file-drop-zone]")!
    fireEvent.dragEnter(
      zone,
      transport([fichier("a.csv", "text/csv"), fichier("b.csv", "text/csv")])
    )
    await waitFor(() => expect(zone).toHaveAttribute("data-glisse", "true"))
    expect(zone).toHaveAttribute("data-refus", "false")

    fireEvent.dragEnter(zone, transport([fichier("a.txt", "text/plain")]))
    await waitFor(() => expect(zone).toHaveAttribute("data-refus", "true"))
  })
})
