import { render, screen } from "@testing-library/react"
import { LockIcon } from "lucide-react"
import { describe, expect, it } from "vitest"

import {
  IconToggle,
  Progress,
  ProgressLabel,
  StatTile,
  StatusBadge,
  TooltipProvider,
} from "@etic-ui/index"

describe("StatusBadge", () => {
  it("teinte le badge selon le ton, avec une pastille décorative", () => {
    render(<StatusBadge ton="success">Actif</StatusBadge>)
    const badge = screen.getByText("Actif")
    expect(badge).toHaveAttribute("data-ton", "success")
    expect(badge).toHaveClass("text-success")
    const pastille = badge.querySelector("[aria-hidden]")
    expect(pastille).toHaveClass("bg-success")
  })

  it("est neutre par défaut et transmet ses props au badge", () => {
    render(<StatusBadge title="Ancien membre">Alumni</StatusBadge>)
    const badge = screen.getByText("Alumni")
    expect(badge).toHaveAttribute("data-ton", "neutral")
    expect(badge).toHaveAttribute("title", "Ancien membre")
  })

  it("a un ton info, en bleu", () => {
    render(<StatusBadge ton="info">Mis à jour</StatusBadge>)
    const badge = screen.getByText("Mis à jour")
    expect(badge).toHaveClass("bg-info/10", "text-info")
    expect(badge.querySelector("[aria-hidden]")).toHaveClass("bg-info")
  })
})

describe("IconToggle", () => {
  it("ton info : en bleu une fois actif", () => {
    render(
      <TooltipProvider>
        <IconToggle
          actif
          onActifChange={() => {}}
          icone={LockIcon}
          libelle="Verrou"
          ton="info"
        />
      </TooltipProvider>
    )
    expect(screen.getByRole("button", { name: "Verrou" })).toHaveClass(
      "aria-pressed:text-info"
    )
  })
})

describe("Progress", () => {
  const parties = (container: HTMLElement) => ({
    piste: container.querySelector('[data-slot="progress-track"]')!,
    indicateur: container.querySelector('[data-slot="progress-indicator"]')!,
  })

  it("garde l'accent et la piste fine de shadcn par défaut", () => {
    const { container } = render(<Progress value={40} />)
    const { piste, indicateur } = parties(container)
    expect(piste).toHaveClass("h-1", "bg-muted")
    expect(indicateur).toHaveClass("bg-primary")
  })

  it("ton et size lg colorent et épaississent la piste et le remplissage", () => {
    const { container } = render(
      <Progress value={92} ton="destructive" size="lg">
        <ProgressLabel>Disque</ProgressLabel>
      </Progress>
    )
    const { piste, indicateur } = parties(container)
    expect(piste).toHaveClass("h-2", "bg-destructive/15")
    expect(piste).not.toHaveClass("h-1")
    expect(piste).not.toHaveClass("bg-muted")
    expect(indicateur).toHaveClass("bg-destructive")
    expect(indicateur).not.toHaveClass("bg-primary")
    expect(
      screen.getByRole("progressbar", { name: "Disque" })
    ).toBeInTheDocument()
  })
})

describe("StatTile", () => {
  it("porte le ton sur la valeur, en texte, avec son contexte", () => {
    render(
      <StatTile
        libelle="Sauvegardes"
        valeur="En retard"
        ton="destructive"
        indication="Dernière il y a 9 j"
      />
    )
    const valeur = screen.getByText("En retard").parentElement!
    expect(valeur).toHaveAttribute("data-ton", "destructive")
    expect(valeur).toHaveClass("text-destructive")
    expect(valeur.querySelector("[aria-hidden]")).toHaveClass("bg-destructive")
    expect(screen.getByText("Dernière il y a 9 j")).toBeInTheDocument()
    expect(screen.getByText("Sauvegardes")).toBeInTheDocument()
  })

  it("est neutre par défaut, sans pastille", () => {
    render(<StatTile libelle="Fichiers" valeur={12} />)
    const valeur = screen.getByText("12").parentElement!
    expect(valeur).toHaveAttribute("data-ton", "neutral")
    expect(valeur.querySelector("[aria-hidden]")).toBeNull()
  })

  it("a un ton info", () => {
    render(<StatTile libelle="Mises à jour" valeur={3} ton="info" />)
    expect(screen.getByText("3").parentElement!).toHaveClass("text-info")
  })
})
