import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatTile, StatusBadge } from "@etic-ui/index"

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
})
