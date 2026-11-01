import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BanIcon } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import { FormField, SegmentedControl, TooltipProvider } from "@etic-ui/index"

type Decision = "garder" | "changer" | "depart"

function Segments({ surChangement }: { surChangement: (d: Decision) => void }) {
  const [valeur, setValeur] = useState<Decision | null>(null)
  return (
    <TooltipProvider>
      <SegmentedControl<Decision>
        aria-label="Décision"
        valeur={valeur}
        onValeurChange={(d) => {
          setValeur(d)
          surChangement(d)
        }}
        options={[
          { valeur: "garder", libelle: "Conserver" },
          { valeur: "changer", libelle: "Changer" },
          {
            valeur: "depart",
            libelle: <BanIcon />,
            infobulle: "Départ",
          },
        ]}
      />
    </TooltipProvider>
  )
}

const STATUTS = [
  { valeur: "actif", libelle: "Actif" },
  { valeur: "ancien", libelle: "Ancien" },
]

describe("SegmentedControl", () => {
  it("choisit un seul segment, qui ne se désélectionne pas", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(<Segments surChangement={surChangement} />)

    expect(screen.getByRole("group", { name: "Décision" })).toBeVisible()
    const conserver = screen.getByRole("button", { name: "Conserver" })
    expect(conserver).toHaveAttribute("aria-pressed", "false")

    await user.click(conserver)
    expect(conserver).toHaveAttribute("aria-pressed", "true")
    await user.click(conserver)
    expect(conserver).toHaveAttribute("aria-pressed", "true")
    expect(surChangement).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: "Départ" }))
    expect(surChangement).toHaveBeenLastCalledWith("depart")
    expect(conserver).toHaveAttribute("aria-pressed", "false")
  })

  it("marque nettement le segment choisi, couleur propre comprise", () => {
    render(
      <SegmentedControl
        aria-label="Statut"
        valeur="actif"
        onValeurChange={vi.fn()}
        options={[
          {
            valeur: "actif",
            libelle: "Actif",
            className: "aria-pressed:bg-success/15",
          },
          { valeur: "ancien", libelle: "Ancien" },
        ]}
      />
    )
    const actif = screen.getByRole("button", { name: "Actif" })
    // jsdom n'applique pas les styles : les classes portent le liseré.
    expect(actif).toHaveClass(
      "aria-pressed:inset-ring",
      "aria-pressed:inset-ring-foreground/50",
      "aria-pressed:bg-success/15"
    )
  })

  it("ton : le segment choisi prend la couleur de l'état qu'il produit", () => {
    render(
      <SegmentedControl
        aria-label="Décision"
        valeur="changer"
        onValeurChange={vi.fn()}
        options={[
          { valeur: "garder", libelle: "Conserver", ton: "success" },
          { valeur: "changer", libelle: "Changer", ton: "info" },
          { valeur: "depart", libelle: "Départ" },
        ]}
      />
    )
    expect(screen.getByRole("button", { name: "Changer" })).toHaveClass(
      "aria-pressed:bg-info/15",
      "aria-pressed:text-info",
      "aria-pressed:inset-ring-info/60",
      "dark:aria-pressed:bg-info/25"
    )
    expect(screen.getByRole("button", { name: "Conserver" })).toHaveClass(
      "aria-pressed:text-success"
    )
    // Sans ton : le fond gris et le liseré sombre du ToggleGroup.
    const depart = screen.getByRole("button", { name: "Départ" })
    expect(depart).toHaveClass("aria-pressed:inset-ring-foreground/50")
    expect(depart.className).not.toMatch(/aria-pressed:text-(info|success)/)
  })

  it("disabled désactive tous les segments", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(
      <SegmentedControl
        aria-label="Statut"
        valeur="actif"
        onValeurChange={surChangement}
        options={STATUTS}
        disabled
      />
    )
    const ancien = screen.getByRole("button", { name: "Ancien" })
    expect(ancien).toBeDisabled()
    await user.click(ancien)
    expect(surChangement).not.toHaveBeenCalled()
  })

  it("obligatoire : le groupe le dit dans son nom, sans aria-required", () => {
    render(
      <>
        <FormField libelle="Statut" obligatoire>
          <SegmentedControl
            valeur={null}
            onValeurChange={vi.fn()}
            options={STATUTS}
          />
        </FormField>
        <SegmentedControl
          aria-label="Rôle"
          required
          valeur={null}
          onValeurChange={vi.fn()}
          options={STATUTS}
        />
      </>
    )
    const statut = screen.getByRole("group", { name: "Statut obligatoire" })
    expect(statut).not.toHaveAttribute("aria-required")
    const role = screen.getByRole("group", { name: "Rôle" })
    expect(role).toHaveAccessibleDescription("obligatoire")
    expect(role).not.toHaveAttribute("aria-required")
  })

  it("l'infobulle ne remplace pas un libellé visible", () => {
    render(
      <TooltipProvider>
        <SegmentedControl
          aria-label="Avis"
          valeur={null}
          onValeurChange={vi.fn()}
          options={[
            {
              valeur: "oui",
              libelle: <span>Validé</span>,
              infobulle: "Validé par le bureau",
            },
            { valeur: "non", libelle: <BanIcon />, infobulle: "Refusé" },
          ]}
        />
      </TooltipProvider>
    )
    expect(screen.getByRole("button", { name: "Validé" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Refusé" })).toBeInTheDocument()
  })
})
