import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  Button,
  Checkbox,
  FormDialog,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type FormDialogProps,
} from "@etic-ui/index"
import { trouverInfobulle } from "@etic-ui/test/infobulle"
import { verifierPiegeFocus } from "@etic-ui/test/piege-focus"

function rendre(props: Partial<FormDialogProps> = {}) {
  render(
    <FormDialog
      titre="Nouveau groupe"
      onEnvoyer={() => {}}
      declencheur={<Button>Créer</Button>}
      {...props}
    >
      <Label>
        <Checkbox /> Actif
      </Label>
      <Label htmlFor="nom">
        Nom <span aria-hidden>*</span>
      </Label>
      <Input id="nom" name="nom" />
      <Label htmlFor="courriel">Adresse</Label>
      <Input id="courriel" name="courriel" type="email" />
    </FormDialog>
  )
  return userEvent.click(screen.getByRole("button", { name: "Créer" }))
}

describe("FormDialog", () => {
  it("s'ouvre le curseur dans le premier champ à remplir", async () => {
    await rendre()
    expect(
      await screen.findByRole("dialog", { name: "Nouveau groupe" })
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText(/Nom/))
    )
  })

  it("ne prend pas pour premier champ l'entrée cachée d'une liste", async () => {
    render(
      <FormDialog
        titre="Choix"
        onEnvoyer={() => {}}
        declencheur={<Button>Ouvrir</Button>}
      >
        <input aria-hidden="true" tabIndex={-1} name="pole" />
        <Label htmlFor="intitule">Intitulé</Label>
        <Input id="intitule" name="intitule" />
      </FormDialog>
    )
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Intitulé"))
    )
  })

  it("envoie le formulaire avec Entrée, puis se ferme", async () => {
    const onEnvoyer = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      expect(event.defaultPrevented).toBe(true)
      expect(new FormData(event.currentTarget).get("nom")).toBe("Bureau")
    })
    await rendre({ onEnvoyer })
    await userEvent.type(await screen.findByLabelText(/Nom/), "Bureau{Enter}")
    expect(onEnvoyer).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
  })

  it("pendant l'envoi, fige les champs et le pied sans perdre le focus ; en échec, affiche l'erreur et reste ouvert", async () => {
    let rejeter: (raison: unknown) => void = () => {}
    await rendre({
      libelleEnvoyer: "Créer le groupe",
      onEnvoyer: () => new Promise((_, r) => (rejeter = r)),
    })
    const champ = await screen.findByLabelText(/Nom/)
    const envoyer = screen.getByRole("button", { name: "Créer le groupe" })
    // Entrée depuis le champ : le champ est désactivé, le focus passe au
    // bouton d'envoi, occupé mais focalisable.
    await userEvent.type(champ, "Bureau{Enter}")
    expect(champ).toBeDisabled()
    expect(envoyer).toHaveAttribute("aria-busy", "true")
    expect(envoyer).toHaveAttribute("aria-disabled", "true")
    expect(document.activeElement).toBe(envoyer)
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveAttribute(
      "aria-disabled",
      "true"
    )
    expect(screen.getByRole("button", { name: "Fermer" })).toHaveAttribute(
      "aria-disabled",
      "true"
    )
    await userEvent.keyboard("{Escape}")
    await userEvent.click(screen.getByRole("button", { name: "Fermer" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    rejeter(new Error("Ce nom est déjà pris."))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ce nom est déjà pris."
    )
    expect(champ).toBeEnabled()
    expect(champ).toHaveValue("Bureau")
    expect(document.activeElement).toBe(envoyer)
  })

  it("liste en français les champs à corriger, sans bulle du navigateur, et n'envoie pas", async () => {
    const onEnvoyer = vi.fn()
    await rendre({ onEnvoyer })
    const formulaire = (await screen.findByRole("dialog")).querySelector("form")
    expect(formulaire).toHaveAttribute("novalidate")
    const nom = screen.getByLabelText(/Nom/)
    nom.setAttribute("required", "")
    await userEvent.type(screen.getByLabelText("Adresse"), "pas-une-adresse")
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))
    expect(onEnvoyer).not.toHaveBeenCalled()
    const alerte = await screen.findByRole("alert")
    expect(alerte).toHaveTextContent("Le formulaire est incomplet.")
    const elements = within(alerte).getAllByRole("listitem")
    // Espace insécable avant « : », ramenée à une espace pour comparer.
    expect(elements.map((e) => e.textContent?.replace(/\s/g, " "))).toEqual([
      "Nom : obligatoire",
      "Adresse : format invalide",
    ])
    expect(document.activeElement).toBe(nom)

    expect(nom).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Adresse")).toHaveAttribute(
      "aria-invalid",
      "true"
    )

    await userEvent.type(nom, "Bureau")
    expect(nom).not.toHaveAttribute("aria-invalid")
    await userEvent.clear(screen.getByLabelText("Adresse"))
    expect(screen.getByLabelText("Adresse")).not.toHaveAttribute("aria-invalid")
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))
    expect(onEnvoyer).toHaveBeenCalledOnce()
  })

  it("nomme une liste obligatoire par le libellé de son FormField, et marque son déclencheur", async () => {
    render(
      <FormDialog
        titre="Choix"
        onEnvoyer={() => {}}
        declencheur={<Button>Ouvrir</Button>}
      >
        <FormField libelle="Pôle" obligatoire>
          <Select name="pole" required>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un pôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dsi">DSI</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </FormDialog>
    )
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
    await userEvent.click(
      await screen.findByRole("button", { name: "Enregistrer" })
    )
    const alerte = await screen.findByRole("alert")
    expect(
      within(alerte)
        .getAllByRole("listitem")
        .map((e) => e.textContent?.replace(/\s/g, " "))
    ).toEqual(["Pôle : obligatoire"])
    const declencheur = screen.getByRole("combobox", { name: "Pôle" })
    expect(declencheur).toHaveAttribute("aria-invalid", "true")
    expect(document.activeElement).toBe(declencheur)
  })

  it("reste ouvert sans erreur quand l'envoi renvoie false", async () => {
    await rendre({ onEnvoyer: async () => false })
    await userEvent.click(
      await screen.findByRole("button", { name: "Enregistrer" })
    )
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enregistrer" })
      ).not.toHaveAttribute("aria-busy")
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("efface l'erreur à la réouverture", async () => {
    await rendre({ onEnvoyer: () => Promise.reject(new Error("Refusé")) })
    await userEvent.click(
      await screen.findByRole("button", { name: "Enregistrer" })
    )
    expect(await screen.findByRole("alert")).toHaveTextContent("Refusé")
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole("button", { name: "Créer" }))
    await screen.findByRole("dialog")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("respecte envoiDesactive, et dit pourquoi avec verrouEnvoi", async () => {
    const onEnvoyer = vi.fn()
    await rendre({ envoiDesactive: true, onEnvoyer })
    const envoyer = await screen.findByRole("button", { name: "Enregistrer" })
    expect(envoyer).toHaveAttribute("aria-disabled", "true")
    // Entrée dans un champ n'envoie pas non plus.
    await userEvent.type(screen.getByLabelText(/Nom/), "x{Enter}")
    expect(onEnvoyer).not.toHaveBeenCalled()
  })

  it("verrouEnvoi : bouton focalisable, raison en infobulle et en description", async () => {
    await rendre({ verrouEnvoi: "Aucune modification à enregistrer" })
    const envoyer = await screen.findByRole("button", { name: "Enregistrer" })
    expect(envoyer).toHaveAccessibleDescription(
      "Aucune modification à enregistrer"
    )
    await userEvent.hover(envoyer)
    expect(await trouverInfobulle()).toHaveTextContent("Aucune modification")
  })

  it("sans champ à remplir, s'ouvre sur la première case active", async () => {
    render(
      <FormDialog
        titre="Groupes du membre"
        onEnvoyer={() => {}}
        declencheur={<Button>Ouvrir</Button>}
      >
        <Label>
          <Checkbox disabled /> Bureau (figé)
        </Label>
        <Label>
          <Checkbox /> DSI
        </Label>
        <Label>
          <Checkbox /> Trésorerie
        </Label>
      </FormDialog>
    )
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("checkbox", { name: "DSI" })
      )
    )
  })

  it("ne donne pas le focus initial à un contrôle masqué", async () => {
    render(
      <FormDialog
        titre="Options"
        onEnvoyer={() => {}}
        declencheur={<Button>Ouvrir</Button>}
      >
        {/* Panneau replié : champ et case masqués par CSS. */}
        <div style={{ display: "none" }}>
          <Label htmlFor="cache">Caché</Label>
          <Input id="cache" />
          <Label>
            <Checkbox /> Case cachée
          </Label>
        </div>
        <Label>
          <Checkbox /> Visible
        </Label>
      </FormDialog>
    )
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("checkbox", { name: "Visible" })
      )
    )
  })

  it("sans champ à remplir, s'ouvre sur une liste si elle vient d'abord", async () => {
    render(
      <FormDialog
        titre="Changer de pôle"
        onEnvoyer={() => {}}
        declencheur={<Button>Ouvrir</Button>}
      >
        <FormField libelle="Pôle">
          <Select name="pole" defaultValue="dsi">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dsi">DSI</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <Label>
          <Checkbox /> Prévenir le membre
        </Label>
      </FormDialog>
    )
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("combobox", { name: "Pôle" })
      )
    )
  })

  it("libelleAnnuler et actionSecondaire : une troisième sortie dans le pied, occupée pendant l'envoi", async () => {
    const onChoisir = vi.fn()
    await rendre({
      libelleAnnuler: "Plus tard",
      actionSecondaire: { libelle: "Se déconnecter", onChoisir },
      onEnvoyer: () => new Promise(() => {}),
    })
    const pied = (await screen.findByRole("dialog")).querySelector(
      '[data-slot="dialog-footer"]'
    ) as HTMLElement
    expect(
      within(pied)
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toEqual(["Se déconnecter", "Plus tard", "Enregistrer"])
    await userEvent.click(
      screen.getByRole("button", { name: "Se déconnecter" })
    )
    expect(onChoisir).toHaveBeenCalledOnce()
    // Elle ne ferme pas le dialogue d'elle-même.
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))
    expect(
      screen.getByRole("button", { name: "Se déconnecter" })
    ).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(
      screen.getByRole("button", { name: "Se déconnecter" })
    )
    expect(onChoisir).toHaveBeenCalledOnce()
  })

  it("« Plus tard » (libelleAnnuler) ferme le dialogue", async () => {
    await rendre({ libelleAnnuler: "Plus tard" })
    await userEvent.click(
      await screen.findByRole("button", { name: "Plus tard" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
  })

  it("seul le corps défile : titre, croix et pied restent hors de la zone qui défile", async () => {
    await rendre()
    const dialogue = await screen.findByRole("dialog")
    const corps = dialogue.querySelector('[data-slot="dialog-body"]')
    expect(corps).toHaveClass("min-h-0", "overflow-y-auto")
    expect(corps).toContainElement(screen.getByLabelText(/Nom/))
    expect(corps?.closest("form")).toHaveClass("min-h-0")
    for (const horsCorps of [
      screen.getByRole("heading", { name: "Nouveau groupe" }),
      screen.getByRole("button", { name: "Fermer" }),
      screen.getByRole("button", { name: "Enregistrer" }),
    ]) {
      expect(corps).not.toContainElement(horsCorps)
    }
  })

  it("Tab ne sort pas du dialogue", async () => {
    await rendre()
    await verifierPiegeFocus(
      await screen.findByRole("dialog"),
      screen.getByRole("button", { name: "Créer", hidden: true })
    )
  })

  it("pendant l'envoi, le bouton d'envoi est un Button en cours (roue muette)", async () => {
    await rendre({ onEnvoyer: () => new Promise(() => {}) })
    await userEvent.click(
      await screen.findByRole("button", { name: "Enregistrer" })
    )
    const envoyer = screen.getByRole("button", { name: "Enregistrer" })
    expect(envoyer).toHaveAttribute("data-en-cours")
    expect(envoyer.querySelector('[data-slot="spinner"]')).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    // Les autres sorties sont seulement indisponibles.
    expect(screen.getByRole("button", { name: "Annuler" })).not.toHaveAttribute(
      "data-en-cours"
    )
  })

  it("action secondaire en promesse : occupée, dialogue figé, erreur affichée", async () => {
    let rejeter: (raison: unknown) => void = () => {}
    const onEnvoyer = vi.fn()
    await rendre({
      onEnvoyer,
      actionSecondaire: {
        libelle: "Se déconnecter",
        onChoisir: () => new Promise((_, r) => (rejeter = r)),
      },
    })
    const sortie = await screen.findByRole("button", {
      name: "Se déconnecter",
    })
    await userEvent.click(sortie)
    expect(sortie).toHaveAttribute("aria-busy", "true")
    expect(sortie).toHaveAttribute("data-en-cours")
    expect(sortie).toHaveFocus()
    const envoyer = screen.getByRole("button", { name: "Enregistrer" })
    expect(envoyer).toHaveAttribute("aria-disabled", "true")
    expect(envoyer).not.toHaveAttribute("data-en-cours")
    expect(screen.getByLabelText(/Nom/)).toBeDisabled()
    // Impossible à fermer, ni à envoyer, pendant l'action.
    await userEvent.keyboard("{Escape}")
    await userEvent.click(envoyer)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(onEnvoyer).not.toHaveBeenCalled()

    rejeter(new Error("Déconnexion impossible."))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Déconnexion impossible."
    )
    await waitFor(() => expect(sortie).not.toHaveAttribute("aria-busy"))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("action secondaire destructive : grise, rouge au survol seulement", async () => {
    await rendre({
      actionSecondaire: {
        libelle: "Supprimer le brouillon",
        onChoisir: () => {},
        destructif: true,
      },
    })
    const sortie = await screen.findByRole("button", {
      name: "Supprimer le brouillon",
    })
    expect(sortie).toHaveClass(
      "text-muted-foreground",
      "hover:bg-destructive/10",
      "hover:text-destructive"
    )
    expect(sortie.className).not.toMatch(/(^|\s)text-destructive(\s|$)/)
  })
})
