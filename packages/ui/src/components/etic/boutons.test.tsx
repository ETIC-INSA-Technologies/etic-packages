import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LockIcon } from "lucide-react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CopyButton, IconToggle, TooltipButton } from "@etic-ui/index"
import { trouverInfobulle } from "@etic-ui/test/infobulle"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Texte de la zone d'annonce du bouton de copie, espaces normalisées. */
const annonce = () =>
  screen.getByRole("status").textContent?.replace(/\s/g, " ") ?? ""

describe("CopyButton", () => {
  it("est une icône sans texte visible, nommée par son libellé, avec infobulle", async () => {
    render(<CopyButton valeur="x" libelle="Copier l'adresse" />)
    const bouton = screen.getByRole("button", { name: "Copier l'adresse" })
    expect(bouton.querySelector("svg")).not.toBeNull()
    expect(bouton).not.toHaveTextContent("Copier")
    await userEvent.hover(bouton)
    expect(await trouverInfobulle()).toHaveTextContent("Copier l'adresse")
  })

  it("copie la valeur, l'annonce hors du bouton et prévient l'appelant", async () => {
    // user-event installe son propre presse-papiers à chaque setup.
    const utilisateur = userEvent.setup()
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue()
    const onCopie = vi.fn()
    render(<CopyButton valeur="https://exemple.org" onCopie={onCopie} />)
    const bouton = screen.getByRole("button", { name: "Copier" })
    // La zone d'annonce est montée d'avance, vide, à côté du bouton.
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
    expect(bouton).not.toContainElement(screen.getByRole("status"))
    await utilisateur.click(bouton)
    expect(writeText).toHaveBeenCalledWith("https://exemple.org")
    await waitFor(() => expect(annonce()).toBe("Copié !"))
    // Le nom du bouton ne change pas : l'annonce suffit.
    expect(bouton).toHaveAccessibleName("Copier")
    expect(bouton).toHaveAttribute("data-copie")
    expect(onCopie).toHaveBeenCalledOnce()
  })

  it("dit quand la copie est refusée, et prévient l'appelant", async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("Permission refusée")
    )
    // jsdom n'a pas execCommand : l'ancienne méthode échoue aussi.
    const onEchec = vi.fn()
    const onCopie = vi.fn()
    render(<CopyButton valeur="secret" onEchec={onEchec} onCopie={onCopie} />)
    await utilisateur.click(screen.getByRole("button", { name: "Copier" }))
    await waitFor(() =>
      expect(annonce()).toBe("Copie impossible : copiez le texte à la main")
    )
    expect(screen.getByRole("button", { name: "Copier" })).toHaveAttribute(
      "data-echec"
    )
    expect(onEchec).toHaveBeenCalledOnce()
    expect(onCopie).not.toHaveBeenCalled()
  })

  it("revient à son état après deux secondes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const utilisateur = userEvent.setup({
        advanceTimers: vi.advanceTimersByTime,
      })
      vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
      render(<CopyButton valeur="x" />)
      await utilisateur.click(screen.getByRole("button", { name: "Copier" }))
      await waitFor(() => expect(annonce()).toBe("Copié !"))
      vi.advanceTimersByTime(2000)
      await waitFor(() => expect(annonce()).toBe(""))
      expect(
        screen.getByRole("button", { name: "Copier" })
      ).not.toHaveAttribute("data-copie")
    } finally {
      vi.useRealTimers()
    }
  })

  it("verrouillé, ne copie pas et dit pourquoi", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText")
    render(<CopyButton valeur="x" verrou="Secret déjà copié" />)
    const bouton = screen.getByRole("button", { name: "Copier" })
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(bouton).toHaveAccessibleDescription("Secret déjà copié")
    await userEvent.click(bouton)
    expect(writeText).not.toHaveBeenCalled()
  })
})

describe("TooltipButton", () => {
  it("sans infobulle ni verrou, est un simple bouton", () => {
    render(<TooltipButton>Valider</TooltipButton>)
    expect(screen.getByRole("button", { name: "Valider" })).toBeEnabled()
  })

  it("verrouillé, ne fait rien mais reste focalisable et décrit", async () => {
    const onClick = vi.fn()
    render(
      <TooltipButton verrou="Droits insuffisants" onClick={onClick}>
        Publier
      </TooltipButton>
    )
    const bouton = screen.getByRole("button", { name: "Publier" })
    expect(bouton).toHaveAccessibleDescription("Droits insuffisants")
    await userEvent.tab()
    expect(document.activeElement).toBe(bouton)
    await userEvent.click(bouton)
    expect(onClick).not.toHaveBeenCalled()
    expect(await trouverInfobulle()).toHaveTextContent("Droits insuffisants")
  })
})

describe("IconToggle", () => {
  function Bascule({
    verrou,
    enCours,
    onActifChange,
  }: {
    verrou?: string
    enCours?: boolean
    onActifChange?: (actif: boolean) => void
  }) {
    const [actif, setActif] = useState(false)
    return (
      <IconToggle
        actif={actif}
        onActifChange={onActifChange ?? setActif}
        icone={LockIcon}
        libelle="Groupe critique"
        infobulles={{
          activer: "Marquer ce groupe comme critique",
          desactiver: "Retirer le marqueur critique",
        }}
        verrou={verrou}
        enCours={enCours}
      />
    )
  }

  it("porte son état par aria-pressed, et son infobulle dit ce que ferait un clic", async () => {
    render(<Bascule />)
    const bouton = screen.getByRole("button", { name: "Groupe critique" })
    expect(bouton).toHaveAttribute("aria-pressed", "false")
    await userEvent.hover(bouton)
    expect(await trouverInfobulle()).toHaveTextContent(
      "Marquer ce groupe comme critique"
    )
    await userEvent.click(bouton)
    expect(bouton).toHaveAttribute("aria-pressed", "true")
    // Le clic referme l'infobulle ; elle revient au survol suivant.
    await userEvent.unhover(bouton)
    await userEvent.hover(bouton)
    await waitFor(async () =>
      expect(await trouverInfobulle()).toHaveTextContent(
        "Retirer le marqueur critique"
      )
    )
  })

  it("actif, prend la couleur de son ton : jaune par défaut", () => {
    const props = {
      actif: true,
      onActifChange: () => {},
      icone: LockIcon,
    }
    render(
      <>
        <IconToggle {...props} libelle="Critique" />
        <IconToggle {...props} libelle="Neutre" ton="neutral" />
      </>
    )
    expect(screen.getByRole("button", { name: "Critique" })).toHaveClass(
      "aria-pressed:text-warning"
    )
    const neutre = screen.getByRole("button", { name: "Neutre" })
    expect(neutre).toHaveClass("aria-pressed:text-foreground")
    expect(neutre.className).not.toContain("warning")
  })

  it("inactif, est gris", () => {
    render(
      <IconToggle
        actif={false}
        onActifChange={() => {}}
        icone={LockIcon}
        libelle="Critique"
      />
    )
    expect(screen.getByRole("button", { name: "Critique" })).toHaveClass(
      "text-muted-foreground"
    )
  })

  it("verrouillé, ne bascule pas et dit pourquoi", async () => {
    render(<Bascule verrou="Indispensable à l'application" />)
    const bouton = screen.getByRole("button", { name: "Groupe critique" })
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(bouton).toHaveAccessibleDescription("Indispensable à l'application")
    await userEvent.click(bouton)
    expect(bouton).toHaveAttribute("aria-pressed", "false")
  })

  it("en cours d'enregistrement, est occupé, ignore les clics et garde le focus", async () => {
    const onActifChange = vi.fn()
    const { rerender } = render(<Bascule onActifChange={onActifChange} />)
    const bouton = screen.getByRole("button", { name: "Groupe critique" })
    await userEvent.tab()
    await userEvent.keyboard(" ")
    expect(onActifChange).toHaveBeenCalledOnce()

    rerender(<Bascule onActifChange={onActifChange} enCours />)
    expect(bouton).not.toBeDisabled()
    expect(bouton).toHaveAttribute("aria-busy", "true")
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(document.activeElement).toBe(bouton)
    await userEvent.keyboard(" ")
    expect(onActifChange).toHaveBeenCalledOnce()
  })
})
