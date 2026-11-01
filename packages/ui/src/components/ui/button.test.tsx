import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SaveIcon } from "lucide-react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  fermerSaufEnCours,
} from "@etic-ui/index"

describe("Button désactivé mais focalisable", () => {
  it("prend l'allure désactivée avec aria-disabled, sans couper le survol", () => {
    render(
      <Button disabled focusableWhenDisabled>
        Publier
      </Button>
    )
    const bouton = screen.getByRole("button", { name: "Publier" })
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(bouton).not.toBeDisabled()
    expect(bouton).toHaveClass(
      "aria-disabled:opacity-50",
      "aria-disabled:not-data-en-cours:cursor-not-allowed"
    )
    expect(bouton).not.toHaveAttribute("data-en-cours")
    // Ni enfoncement au clic, ni pointer-events-none (l'infobulle d'un
    // verrou doit rester survolable).
    expect(bouton.className).toContain(
      "active:not-aria-[haspopup]:not-aria-disabled:translate-y-px"
    )
    expect(bouton.className).not.toContain("aria-disabled:pointer-events-none")
  })
})

describe("Button en cours", () => {
  it("annonce l'attente, ignore les clics et garde le focus", async () => {
    const onClick = vi.fn()
    const { rerender } = render(
      <Button onClick={onClick}>
        <SaveIcon data-icon="inline-start" />
        Enregistrer
      </Button>
    )
    const bouton = screen.getByRole("button", { name: "Enregistrer" })
    await userEvent.tab()
    expect(bouton).toHaveFocus()
    expect(bouton).not.toHaveAttribute("aria-busy")

    rerender(
      <Button onClick={onClick} enCours libelleEnCours="Enregistrement…">
        <SaveIcon data-icon="inline-start" />
        Enregistrer
      </Button>
    )
    expect(bouton).toHaveAttribute("aria-busy", "true")
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(bouton).not.toBeDisabled()
    expect(bouton).toHaveFocus()
    expect(bouton).toHaveAccessibleName("Enregistrement…")
    await userEvent.click(bouton)
    await userEvent.keyboard("{Enter}")
    expect(onClick).not.toHaveBeenCalled()
  })

  it("à icône seule, la roue muette remplace l'icône", () => {
    render(
      <Button size="icon" aria-label="Enregistrer" enCours>
        <SaveIcon data-testid="icone" />
      </Button>
    )
    const bouton = screen.getByRole("button", { name: "Enregistrer" })
    const roue = bouton.querySelector('[data-slot="spinner"]')
    expect(roue).toHaveAttribute("aria-hidden", "true")
    expect(roue).not.toHaveAttribute("role")
    // L'icône n'est plus rendue du tout (pas seulement masquée).
    expect(screen.queryByTestId("icone")).toBeNull()
    expect(bouton.querySelectorAll("svg")).toHaveLength(1)
    // Pas de second statut « Chargement » annoncé.
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("à texte, la roue prend la place des icônes : les marges has-data-[icon] suivent", () => {
    render(
      <Button enCours>
        <SaveIcon data-icon="inline-start" />
        Enregistrer
        <SaveIcon data-icon="inline-end" />
      </Button>
    )
    const bouton = screen.getByRole("button", { name: "Enregistrer" })
    const icones = bouton.querySelectorAll("[data-icon]")
    // Une seule icône : la roue, en tête ; plus rien ne déclenche
    // `has-data-[icon=inline-end]:pr-2`.
    expect(icones).toHaveLength(1)
    expect(icones[0]).toHaveAttribute("data-slot", "spinner")
    expect(icones[0]).toHaveAttribute("data-icon", "inline-start")
    expect(bouton.querySelector('[data-icon="inline-end"]')).toBeNull()
    expect(bouton).toHaveTextContent("Enregistrer")
  })

  it("curseur d'attente et pas de survol ; l'interdit reste aux vrais aria-disabled", () => {
    render(
      <>
        <Button variant="outline" enCours className="hover:underline">
          Enregistrer
        </Button>
        <Button variant="outline">Annuler</Button>
      </>
    )
    const enCours = screen.getByRole("button", { name: "Enregistrer" })
    expect(enCours).toHaveAttribute("data-en-cours")
    expect(enCours).toHaveClass(
      "data-en-cours:cursor-progress",
      "aria-disabled:not-data-en-cours:cursor-not-allowed"
    )
    expect(enCours.className).not.toMatch(/(^|\s|:)hover:/)
    // Hors action, le survol est là.
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveClass(
      "hover:bg-muted"
    )
  })

  it("sans libelleEnCours, garde son contenu", () => {
    render(<Button enCours>Supprimer</Button>)
    expect(screen.getByRole("button", { name: "Supprimer" })).toHaveAttribute(
      "aria-busy",
      "true"
    )
  })
})

describe("Button rendu par un autre élément", () => {
  // Garde-fou : Base UI 1.9 garde déjà ces enfants ; le Button n'en passe
  // aucun s'il n'en reçoit pas, pour ne pas dépendre de cette fusion.
  it("garde les enfants de l'élément render quand il n'en reçoit pas", () => {
    render(
      <Button
        nativeButton={false}
        render={
          <span>
            Voir <strong>la fiche</strong>
          </span>
        }
      />
    )
    const bouton = screen.getByRole("button", { name: "Voir la fiche" })
    expect(bouton.querySelector("strong")).toHaveTextContent("la fiche")
  })
})

describe("Button en ligne", () => {
  it("size inline : sans hauteur ni marge de bouton, cible de 24 px gardée", () => {
    render(
      <Button variant="link" size="inline">
        Voir le détail
      </Button>
    )
    const bouton = screen.getByRole("button", { name: "Voir le détail" })
    expect(bouton).toHaveClass("h-auto", "min-h-6", "px-0")
    expect(bouton).not.toHaveClass("h-8")
  })
})

describe("fermerSaufEnCours", () => {
  it("laisse passer l'ouverture, refuse la fermeture pendant l'action", () => {
    const onOuvertChange = vi.fn()
    fermerSaufEnCours(true, onOuvertChange)(false)
    expect(onOuvertChange).not.toHaveBeenCalled()
    // Un `DialogTrigger` doit pouvoir ouvrir, même pendant l'action.
    fermerSaufEnCours(true, onOuvertChange)(true)
    expect(onOuvertChange).toHaveBeenLastCalledWith(true)
    fermerSaufEnCours(false, onOuvertChange)(false)
    expect(onOuvertChange).toHaveBeenLastCalledWith(false)
    expect(onOuvertChange).toHaveBeenCalledTimes(2)
  })

  it("ouvre un dialogue par son déclencheur", async () => {
    function Exemple() {
      const [ouvert, setOuvert] = useState(false)
      return (
        <Dialog
          open={ouvert}
          onOpenChange={fermerSaufEnCours(false, setOuvert)}
        >
          <DialogTrigger render={<Button />}>Ouvrir</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialogue</DialogTitle>
          </DialogContent>
        </Dialog>
      )
    }
    render(<Exemple />)
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })
})

describe("Button", () => {
  it("rend un bouton accessible par son rôle et réagit au clic", () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Exporter</Button>)

    const bouton = screen.getByRole("button", { name: "Exporter" })
    bouton.click()

    expect(onClick).toHaveBeenCalledOnce()
    expect(bouton).toHaveAttribute("data-slot", "button")
  })

  it("fusionne la className de l'application avec les variantes", () => {
    render(
      <Button variant="outline" className="w-full">
        Exporter
      </Button>
    )

    expect(screen.getByRole("button")).toHaveClass("w-full", "border-border")
  })

  it("ne déclenche pas le clic quand il est désactivé", () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Exporter
      </Button>
    )

    screen.getByRole("button").click()

    expect(onClick).not.toHaveBeenCalled()
  })
})
