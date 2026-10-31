import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  EmptyState,
  Loading,
  SkeletonCard,
  SkeletonPage,
  SkeletonTable,
} from "@etic-ui/index"
import { InboxIcon } from "lucide-react"

describe("Loading et squelettes", () => {
  it("Loading : un seul statut, sans aria-live en double, roue muette", () => {
    render(<Loading libelle="Recherche…" />)
    const statut = screen.getByRole("status")
    expect(statut).toHaveTextContent("Recherche…")
    expect(statut).not.toHaveAttribute("aria-live")
    // La roue n'est ni un second statut ni un nom lu.
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(statut.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("SkeletonPage : un seul statut « Chargement… » pour toute la fiche", () => {
    render(<SkeletonPage />)
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveTextContent("Chargement…")
  })

  it("SkeletonCard et SkeletonTable s'annoncent, sauf `annoncer={false}`", () => {
    const { rerender } = render(<SkeletonCard lignes={2} />)
    expect(screen.getAllByRole("status")).toHaveLength(1)
    rerender(<SkeletonCard annoncer={false} />)
    expect(screen.queryByRole("status")).toBeNull()
    rerender(<SkeletonTable lignes={2} colonnes={3} />)
    expect(screen.getAllByRole("status")).toHaveLength(1)
  })
})

describe("EmptyState", () => {
  it("prend l'icône lucide comme composant, dans un cadre", () => {
    const { container } = render(
      <EmptyState titre="Aucun document" icone={InboxIcon} />
    )
    expect(screen.getByText("Aucun document")).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="empty-icon"], svg')
    ).not.toBeNull()
    expect(container.firstElementChild).toHaveClass("border")
  })
})
