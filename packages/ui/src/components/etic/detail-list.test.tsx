import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  DetailItem,
  DetailList,
  type DetailListDisposition,
} from "@etic-ui/index"

function Exemple({ disposition }: { disposition?: DetailListDisposition }) {
  return (
    <DetailList disposition={disposition} aria-label="Détails">
      <DetailItem libelle="Acteur">ada</DetailItem>
      <DetailItem libelle="User-Agent">{null}</DetailItem>
    </DetailList>
  )
}

describe("DetailList et DetailItem", () => {
  it("rend des paires libellé / valeur, avec un tiret pour une valeur absente", () => {
    render(
      <DetailList>
        <DetailItem libelle="Adresse">ada@example.org</DetailItem>
        <DetailItem libelle="Téléphone">{null}</DetailItem>
        <DetailItem libelle="Ville">{""}</DetailItem>
        <DetailItem libelle="Enfants">{0}</DetailItem>
        <DetailItem libelle="Mandat">{false}</DetailItem>
        <DetailItem libelle="Promotion" />
      </DetailList>
    )
    const termes = screen.getAllByRole("term")
    const definitions = screen.getAllByRole("definition")
    expect(termes.map((t) => t.textContent)).toEqual([
      "Adresse",
      "Téléphone",
      "Ville",
      "Enfants",
      "Mandat",
      "Promotion",
    ])
    expect(definitions[0]).toHaveTextContent("ada@example.org")
    expect(definitions[1]).toHaveTextContent("—Non renseigné")
    expect(definitions[2]).toHaveTextContent("Non renseigné")
    // Zéro est une valeur ; `false` (motif `{cond && x}`) n'en est pas une.
    expect(definitions[3]).toHaveTextContent("0")
    expect(definitions[4]).toHaveTextContent("Non renseigné")
    expect(definitions[5]).toHaveTextContent("Non renseigné")
    // Le tiret est décoratif : seul « Non renseigné » est lu.
    expect(definitions[1].querySelector("[aria-hidden]")).toHaveTextContent("—")
  })

  it("est en grille par défaut", () => {
    render(<Exemple />)
    const liste = screen.getByLabelText("Détails")
    expect(liste).toHaveAttribute("data-disposition", "grille")
    // Quatre colonnes au plus : un quart de la largeur, écarts déduits.
    expect(liste.className).toContain("calc((100%-4.5rem)/4-1px)")
  })

  it.each<DetailListDisposition>(["grille", "pile", "ligne"])(
    "en %s, reste une liste de définitions <dl> / <dt> / <dd>",
    (disposition) => {
      const { container } = render(<Exemple disposition={disposition} />)
      const liste = container.querySelector("dl")
      expect(liste).toHaveAttribute("data-slot", "detail-list")
      expect(liste).toHaveAttribute("data-disposition", disposition)
      expect(liste).toHaveAccessibleName("Détails")
      const paires = liste!.querySelectorAll(
        ':scope > [data-slot="detail-item"]'
      )
      expect(paires).toHaveLength(2)
      for (const paire of paires) {
        expect(paire.children[0].tagName).toBe("DT")
        expect(paire.children[1].tagName).toBe("DD")
      }
      expect(screen.getAllByRole("term")).toHaveLength(2)
      expect(screen.getAllByRole("definition")[1]).toHaveTextContent(
        "Non renseigné"
      )
    }
  )

  it.each<DetailListDisposition>(["grille", "pile"])(
    "en %s, le libellé est seul, au-dessus de la valeur",
    (disposition) => {
      render(<Exemple disposition={disposition} />)
      const [acteur] = screen.getAllByRole("term")
      expect(acteur).toHaveTextContent(/^Acteur$/)
      expect(acteur.parentElement).toHaveTextContent(/^Acteurada$/)
    }
  )

  it("en ligne, écrit « libellé : valeur »", () => {
    render(<Exemple disposition="ligne" />)
    const [acteur, agent] = screen.getAllByRole("term")
    expect(acteur.parentElement).toHaveTextContent("Acteur : ada")
    expect(agent.parentElement).toHaveTextContent("User-Agent : —")
  })

  it("garde la className de l'application", () => {
    render(
      <DetailList disposition="pile" className="mt-2" aria-label="Détails">
        <DetailItem libelle="Acteur">ada</DetailItem>
      </DetailList>
    )
    expect(screen.getByLabelText("Détails")).toHaveClass("mt-2")
  })
})
