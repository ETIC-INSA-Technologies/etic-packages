import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRef, useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  Button,
  ConfirmDialog,
  DeleteButton,
  type ConfirmDialogProps,
} from "@etic-ui/index"
import { trouverInfobulle } from "@etic-ui/test/infobulle"
import { verifierPiegeFocus } from "@etic-ui/test/piege-focus"

function Controle(props: Partial<ConfirmDialogProps>) {
  const [ouvert, setOuvert] = useState(true)
  return (
    <ConfirmDialog
      titre="Supprimer plusieurs éléments"
      description="Les éléments suivants seront supprimés définitivement."
      libelleConfirmer="Supprimer définitivement"
      onConfirmer={() => {}}
      ouvert={ouvert}
      onOuvertChange={setOuvert}
      {...props}
    />
  )
}

const SAISIE = {
  attendu: "14",
  libelle: "Saisissez en chiffres le nombre d'éléments à supprimer",
  messageErreur: "Ce n'est pas le nombre d'éléments sélectionnés.",
  numerique: true,
}

describe("ConfirmDialog", () => {
  it("nomme l'action et ce qu'elle touche, puis confirme", async () => {
    const onConfirmer = vi.fn()
    render(<Controle onConfirmer={onConfirmer} />)
    const dialogue = await screen.findByRole("alertdialog", {
      name: "Supprimer plusieurs éléments",
    })
    expect(dialogue).toHaveAccessibleDescription(
      "Les éléments suivants seront supprimés définitivement."
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Supprimer définitivement" })
    )
    expect(onConfirmer).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
  })

  it("s'ouvre par son déclencheur et se ferme par « Annuler »", async () => {
    const onConfirmer = vi.fn()
    render(
      <ConfirmDialog
        titre="Archiver"
        description="Le dossier sera archivé."
        destructif={false}
        onConfirmer={onConfirmer}
        declencheur={<Button>Archiver le dossier</Button>}
      />
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Archiver le dossier" })
    )
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }))
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(onConfirmer).not.toHaveBeenCalled()
  })

  it("attend la promesse, le focus sur le bouton occupé, puis affiche l'erreur dans le dialogue resté ouvert", async () => {
    let rejeter: (raison: unknown) => void = () => {}
    const onConfirmer = vi.fn(() => new Promise((_, r) => (rejeter = r)))
    render(<Controle onConfirmer={onConfirmer} />)
    const confirmer = await screen.findByRole("button", {
      name: "Supprimer définitivement",
    })
    await userEvent.click(confirmer)
    // Occupé mais focalisable : le focus ne tombe pas sur <body>.
    expect(confirmer).toHaveAttribute("aria-disabled", "true")
    expect(confirmer).toHaveAttribute("aria-busy", "true")
    expect(document.activeElement).toBe(confirmer)
    const annuler = screen.getByRole("button", { name: "Annuler" })
    expect(annuler).toHaveAttribute("aria-disabled", "true")
    // Ni Échap ni « Annuler » ne ferment pendant l'action.
    await userEvent.keyboard("{Escape}")
    await userEvent.click(annuler)
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    // Un second clic ne relance pas l'action.
    await userEvent.click(confirmer)
    expect(onConfirmer).toHaveBeenCalledOnce()

    rejeter({ message: "Élément introuvable", code: "NOT_FOUND" })
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /NOT_FOUND\s:\sÉlément introuvable/
    )
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(confirmer).toHaveAttribute("aria-disabled", "false")
    expect(document.activeElement).toBe(confirmer)
  })

  it("se ferme quand la promesse aboutit", async () => {
    render(<Controle onConfirmer={() => Promise.resolve()} />)
    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer définitivement" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
  })

  it("reste ouvert sans erreur quand l'action renvoie false (suppression en deux temps)", async () => {
    function DeuxTemps() {
      const [conflit, setConflit] = useState(false)
      return (
        <Controle
          libelleConfirmer={conflit ? "Supprimer quand même" : "Supprimer"}
          onConfirmer={async () => {
            if (conflit) return
            setConflit(true)
            return false
          }}
        />
      )
    }
    render(<DeuxTemps />)
    const bouton = await screen.findByRole("button", { name: "Supprimer" })
    await userEvent.click(bouton)
    expect(
      await screen.findByRole("button", { name: "Supprimer quand même" })
    ).toBe(bouton)
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(document.activeElement).toBe(bouton)
    // La description, qui change avec la question, est une région polie.
    expect(
      screen
        .getByRole("alertdialog")
        .querySelector('[data-slot="alert-dialog-description"]')
    ).toHaveAttribute("aria-live", "polite")

    await userEvent.click(bouton)
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
  })

  it("rend le focus à `finalFocus` quand l'action a fait disparaître le déclencheur", async () => {
    function Liste() {
      const [present, setPresent] = useState(true)
      const titre = useRef<HTMLHeadingElement>(null)
      return (
        <>
          <h2 ref={titre} tabIndex={-1}>
            Groupes
          </h2>
          {present ? (
            <DeleteButton
              libelle="le groupe Bureau"
              confirmation={{ description: "Le groupe sera supprimé." }}
              finalFocus={titre}
              onSupprimer={async () => setPresent(false)}
            />
          ) : null}
        </>
      )
    }
    render(<Liste />)
    await userEvent.click(
      screen.getByRole("button", { name: "Supprimer le groupe Bureau" })
    )
    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "Groupes" })
      )
    )
  })

  describe("saisie de confirmation", () => {
    it("bloque la confirmation sans jamais afficher la valeur attendue", async () => {
      render(<Controle saisie={SAISIE} />)
      const champ = await screen.findByLabelText(SAISIE.libelle)
      await waitFor(() => expect(document.activeElement).toBe(champ))
      expect(champ).toHaveAttribute("inputmode", "numeric")
      // Pas un identifiant : les gestionnaires de mots de passe s'abstiennent.
      expect(champ).toHaveAttribute("autocomplete", "off")
      expect(champ).toHaveAttribute("data-1p-ignore")
      expect(champ).toHaveAttribute("data-lpignore", "true")
      expect(champ).toHaveAttribute("data-bwignore")
      expect(
        screen.getByRole("button", { name: "Supprimer définitivement" })
      ).toHaveAttribute("aria-disabled", "true")
      expect(screen.getByRole("alertdialog")).not.toHaveTextContent("14")
    })

    it("ne signale l'erreur qu'une fois la saisie complète, sans l'interrompre", async () => {
      render(<Controle saisie={SAISIE} />)
      const champ = await screen.findByLabelText(SAISIE.libelle)
      await userEvent.type(champ, "1")
      expect(screen.queryByText(SAISIE.messageErreur)).not.toBeInTheDocument()
      await userEvent.type(champ, "5")
      const erreur = screen.getByText(SAISIE.messageErreur)
      // Zone polie et non alerte : elle ne coupe pas la frappe.
      expect(erreur).toHaveAttribute("aria-live", "polite")
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      expect(champ).toHaveAttribute("aria-invalid", "true")
      expect(champ).toHaveAccessibleDescription(SAISIE.messageErreur)
    })

    it("confirme à la bonne valeur, avec Entrée comme au clic, et garde le focus dans le champ", async () => {
      const onConfirmer = vi.fn(() => new Promise(() => {}))
      render(<Controle saisie={SAISIE} onConfirmer={onConfirmer} />)
      const champ = await screen.findByLabelText(SAISIE.libelle)
      await userEvent.type(champ, "{Enter}")
      expect(onConfirmer).not.toHaveBeenCalled()
      await userEvent.type(champ, " 14 {Enter}")
      expect(onConfirmer).toHaveBeenCalledOnce()
      // Pendant l'action, le champ passe en lecture seule sans perdre le focus.
      expect(champ).toHaveAttribute("readonly")
      expect(document.activeElement).toBe(champ)
    })

    it("repart d'un champ vide à la réouverture", async () => {
      render(
        <ConfirmDialog
          titre="Supprimer"
          description="Sûr ?"
          saisie={SAISIE}
          onConfirmer={() => {}}
          declencheur={<Button>Ouvrir</Button>}
        />
      )
      await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
      await userEvent.type(await screen.findByLabelText(SAISIE.libelle), "9")
      await userEvent.click(screen.getByRole("button", { name: "Annuler" }))
      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
      )
      await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
      expect(await screen.findByLabelText(SAISIE.libelle)).toHaveValue("")
    })

    it("vide la saisie quand l'attendu change, sans remonter le dialogue", async () => {
      const { rerender } = render(<Controle saisie={SAISIE} />)
      const champ = await screen.findByLabelText(SAISIE.libelle)
      await userEvent.type(champ, "14")
      expect(
        screen.getByRole("button", { name: "Supprimer définitivement" })
      ).toHaveAttribute("aria-disabled", "false")
      // Le nombre a changé côté serveur (409) : la page passe le nouveau.
      rerender(<Controle saisie={{ ...SAISIE, attendu: "15" }} />)
      const apres = screen.getByLabelText(SAISIE.libelle)
      expect(apres).toBe(champ)
      expect(apres).toHaveValue("")
      expect(document.activeElement).toBe(champ)
      expect(
        screen.getByRole("button", { name: "Supprimer définitivement" })
      ).toHaveAttribute("aria-disabled", "true")
      await userEvent.type(champ, "15")
      expect(
        screen.getByRole("button", { name: "Supprimer définitivement" })
      ).toHaveAttribute("aria-disabled", "false")
    })
  })

  it("verrou : confirmation focalisable mais refusée, raison annoncée et en infobulle", async () => {
    const onConfirmer = vi.fn()
    render(
      <Controle
        verrou="Chargement des conséquences…"
        onConfirmer={onConfirmer}
      />
    )
    const bouton = await screen.findByRole("button", {
      name: "Supprimer définitivement",
    })
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(bouton).toHaveAccessibleDescription("Chargement des conséquences…")
    bouton.focus()
    expect(await trouverInfobulle()).toHaveTextContent(
      "Chargement des conséquences…"
    )
    await userEvent.click(bouton)
    expect(onConfirmer).not.toHaveBeenCalled()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("libelleAnnuler renomme « Annuler », qui ferme toujours", async () => {
    render(<Controle libelleAnnuler="Revenir au tableau" />)
    await userEvent.click(
      await screen.findByRole("button", { name: "Revenir au tableau" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
  })

  it("onAnnuler : appelé par « Annuler » et Échap, pas après une réussite", async () => {
    const onAnnuler = vi.fn()
    const onOuvertChange = vi.fn()
    render(
      <ConfirmDialog
        titre="Archiver"
        description="Le dossier sera archivé."
        onConfirmer={() => {}}
        onAnnuler={onAnnuler}
        onOuvertChange={onOuvertChange}
        declencheur={<Button>Ouvrir</Button>}
      />
    )
    const ouvrir = () =>
      userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
    const ferme = () =>
      waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
      )

    await ouvrir()
    await userEvent.click(
      await screen.findByRole("button", { name: "Confirmer" })
    )
    await ferme()
    expect(onOuvertChange).toHaveBeenLastCalledWith(false)
    expect(onAnnuler).not.toHaveBeenCalled()

    await ouvrir()
    await userEvent.click(
      await screen.findByRole("button", { name: "Annuler" })
    )
    await ferme()
    expect(onAnnuler).toHaveBeenCalledOnce()

    await ouvrir()
    await screen.findByRole("alertdialog")
    await userEvent.keyboard("{Escape}")
    await ferme()
    expect(onAnnuler).toHaveBeenCalledTimes(2)
  })

  it("taille : élargit le dialogue, sur toute la largeur du téléphone", async () => {
    render(<Controle taille="lg" />)
    const dialogue = await screen.findByRole("alertdialog")
    expect(dialogue).toHaveClass(
      "data-[size=default]:sm:max-w-2xl",
      "data-[size=default]:max-w-[calc(100%-2rem)]"
    )
    expect(dialogue).not.toHaveClass(
      "data-[size=default]:sm:max-w-sm",
      "data-[size=default]:max-w-xs"
    )
  })

  it("liste nommée et défilante des éléments concernés", async () => {
    const courriel = "prenom.nom-tres-long-sans-espace@sous-domaine.example.org"
    render(
      <Controle
        elements={["Ada Lovelace", courriel]}
        libelleElements="Comptes à supprimer"
      />
    )
    const liste = await screen.findByRole("list", {
      name: "Comptes à supprimer",
    })
    // Défile au-delà d'une dizaine de lignes ; une adresse sans espace passe
    // à la ligne (overflow-wrap: anywhere) au lieu d'élargir le dialogue.
    expect(liste).toHaveClass("max-h-48", "overflow-y-auto", "wrap-anywhere")
    expect(
      within(liste)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual(["Ada Lovelace", courriel])
  })

  it("seul le corps défile : titre et pied restent hors de la zone qui défile", async () => {
    render(<Controle elements={["Ada Lovelace"]} saisie={SAISIE} />)
    const dialogue = await screen.findByRole("alertdialog")
    const corps = dialogue.querySelector('[data-slot="dialog-body"]')
    expect(corps).toHaveClass("min-h-0", "overflow-y-auto")
    expect(corps).toContainElement(screen.getByRole("list"))
    expect(corps).toContainElement(screen.getByLabelText(SAISIE.libelle))
    expect(corps).not.toContainElement(screen.getByRole("heading"))
    expect(corps).not.toContainElement(
      screen.getByRole("button", { name: "Annuler" })
    )
  })

  it("garde le focus sur la confirmation quand son verrou disparaît", async () => {
    const { rerender } = render(<Controle verrou="Chargement…" />)
    const bouton = await screen.findByRole("button", {
      name: "Supprimer définitivement",
    })
    bouton.focus()
    rerender(<Controle />)
    expect(
      screen.getByRole("button", { name: "Supprimer définitivement" })
    ).toBe(bouton)
    expect(document.activeElement).toBe(bouton)
    expect(bouton).toHaveAttribute("aria-disabled", "false")
  })

  it("Tab ne sort pas du dialogue", async () => {
    render(
      <>
        <Button>Derrière</Button>
        <Controle />
      </>
    )
    await verifierPiegeFocus(
      await screen.findByRole("alertdialog"),
      screen.getByRole("button", { name: "Derrière", hidden: true })
    )
  })
})

describe("DeleteButton", () => {
  it("est une corbeille nommée, qui ouvre une confirmation nommant la cible", async () => {
    const onSupprimer = vi.fn()
    render(
      <DeleteButton
        libelle="ce groupe"
        onSupprimer={onSupprimer}
        confirmation={{ description: "Le groupe Bureau sera supprimé." }}
      />
    )
    const bouton = screen.getByRole("button", { name: "Supprimer ce groupe" })
    expect(bouton).not.toHaveTextContent("Supprimer")
    await userEvent.hover(bouton)
    expect(await trouverInfobulle()).toHaveTextContent("Supprimer ce groupe")
    await userEvent.click(bouton)
    const dialogue = await screen.findByRole("alertdialog", {
      name: "Supprimer ce groupe",
    })
    expect(dialogue).toHaveTextContent("Le groupe Bureau sera supprimé.")
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }))
    expect(onSupprimer).toHaveBeenCalledOnce()
  })

  it("prévient l'application de l'ouverture et de la fermeture", async () => {
    const onOuvertChange = vi.fn()
    render(
      <DeleteButton
        libelle="ce groupe"
        onSupprimer={() => {}}
        onOuvertChange={onOuvertChange}
        confirmation={{ description: "…" }}
      />
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Supprimer ce groupe" })
    )
    await screen.findByRole("alertdialog")
    expect(onOuvertChange).toHaveBeenLastCalledWith(true)
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }))
    expect(onOuvertChange).toHaveBeenLastCalledWith(false)
  })

  it("verrouillé, reste focalisable, dit pourquoi et n'ouvre rien", async () => {
    const onSupprimer = vi.fn()
    render(
      <DeleteButton
        libelle="ce groupe"
        verrou="Groupe protégé : suppression impossible"
        onSupprimer={onSupprimer}
        confirmation={{ description: "…" }}
      />
    )
    const bouton = screen.getByRole("button", { name: "Supprimer ce groupe" })
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(bouton).toHaveAccessibleDescription(
      "Groupe protégé : suppression impossible"
    )
    await userEvent.tab()
    expect(document.activeElement).toBe(bouton)
    expect(await trouverInfobulle()).toHaveTextContent("Groupe protégé")
    await userEvent.click(bouton)
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("avec texte, écrit « Supprimer » en toutes lettres", () => {
    render(
      <DeleteButton
        avecTexte
        libelle="cette fiche"
        onSupprimer={() => {}}
        confirmation={{ description: "…" }}
      />
    )
    expect(
      screen.getByRole("button", { name: "Supprimer cette fiche" })
    ).toHaveTextContent("Supprimer")
  })
})
