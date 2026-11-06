import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ProgressRing } from "@etic-ui/index"

const arc = (anneau: HTMLElement) =>
  anneau.querySelector('[data-slot="progress-ring-arc"]')

/** Où l'arc commence et finit, bouts arrondis compris, en % du tour : un
 *  bout dépasse le tracé d'une demi-épaisseur (5,5 sur un rayon de 44,5). */
function etendue(anneau: HTMLElement) {
  const trace = arc(anneau)!
  const bout = (5.5 / (2 * Math.PI * 44.5)) * 100
  const depart = -Number(trace.getAttribute("stroke-dashoffset"))
  const longueur = Number(trace.getAttribute("stroke-dasharray")!.split(" ")[0])
  return { debut: depart - bout, fin: depart + longueur + bout }
}

describe("ProgressRing", () => {
  it("se nomme par son libellé, le centre étant caché aux lecteurs d'écran", () => {
    render(
      <ProgressRing valeur={45} libelle="Mémoire : 45 %">
        45 %
      </ProgressRing>
    )
    const anneau = screen.getByRole("img", { name: "Mémoire : 45 %" })
    expect(anneau).toHaveAttribute("data-slot", "progress-ring")
    expect(anneau).toHaveClass("size-28")
    expect(screen.getByText("45 %")).toHaveAttribute("aria-hidden", "true")
  })

  it.each([45, 97, 99.5])(
    "à %s %%, l'arc, bouts arrondis compris, part de midi et s'arrête à la valeur",
    (valeur) => {
      render(<ProgressRing valeur={valeur} libelle="Disque" />)
      const anneau = screen.getByRole("img", { name: "Disque" })
      expect(arc(anneau)).toHaveAttribute("stroke-linecap", "round")
      const { debut, fin } = etendue(anneau)
      expect(debut).toBeCloseTo(0)
      expect(fin).toBeCloseTo(valeur)
    }
  )

  it("plein (valeur bornée à 100) : un cercle fermé, sans bouts", () => {
    render(<ProgressRing valeur={140} libelle="Disque" />)
    const anneau = screen.getByRole("img", { name: "Disque" })
    expect(arc(anneau)).toHaveAttribute("stroke-dasharray", "100 100")
    expect(arc(anneau)).toHaveAttribute("stroke-linecap", "butt")
  })

  it.each([null, Number.NaN, -5])(
    "sans valeur positive (%s), la piste reste vide",
    (valeur) => {
      render(<ProgressRing valeur={valeur} libelle="Disque" />)
      expect(arc(screen.getByRole("img", { name: "Disque" }))).toBeNull()
    }
  )

  it("l'arc prend la couleur du ton, l'accent par défaut ; className règle la taille", () => {
    const { rerender } = render(
      <ProgressRing valeur={92} libelle="Disque" className="size-36" />
    )
    const anneau = screen.getByRole("img", { name: "Disque" })
    expect(arc(anneau)).toHaveClass("stroke-primary")
    expect(anneau).toHaveClass("size-36")
    expect(anneau).not.toHaveClass("size-28")
    rerender(<ProgressRing valeur={92} libelle="Disque" ton="destructive" />)
    expect(anneau).toHaveAttribute("data-ton", "destructive")
    expect(arc(anneau)).toHaveClass("stroke-destructive")
  })
})
