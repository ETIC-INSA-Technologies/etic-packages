import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DataTableCount,
  DataTableSelectFilter,
  DataTableToolbar,
} from "@etic-ui/index"

function simulerLargeur(mobile: boolean) {
  vi.stubGlobal("matchMedia", (requete: string) => ({
    matches: mobile && requete.includes("width <"),
    media: requete,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

const STATUTS = [
  { valeur: "actif", libelle: "Actif" },
  { valeur: "ancien", libelle: "Ancien" },
]

function Barre({
  onRecherche = vi.fn(),
}: {
  onRecherche?: (v: string) => void
}) {
  const [recherche, setRecherche] = useState("")
  const [statut, setStatut] = useState<string | null>(null)
  return (
    <DataTableToolbar
      recherche={{
        valeur: recherche,
        onValeurChange: (v) => {
          setRecherche(v)
          onRecherche(v)
        },
        placeholder: "Nom, e-mail…",
      }}
      filtres={
        <DataTableSelectFilter
          libelle="Filtrer par statut"
          valeur={statut}
          onValeurChange={setStatut}
          options={STATUTS}
          libelleTous="Tous les statuts"
        />
      }
      filtresActifs={statut ? 1 : 0}
      onReinitialiser={() => setStatut(null)}
      compteur={{ total: 128, decalage: 25, nombre: 25 }}
    >
      <button type="button">Colonnes</button>
    </DataTableToolbar>
  )
}

afterEach(() => vi.unstubAllGlobals())

describe("DataTableToolbar", () => {
  it("recherche, filtre et réinitialise", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    const onRecherche = vi.fn()
    render(<Barre onRecherche={onRecherche} />)

    await user.type(
      screen.getByRole("searchbox", { name: "Rechercher" }),
      "ada"
    )
    expect(onRecherche).toHaveBeenLastCalledWith("ada")

    const filtre = screen.getByRole("combobox", { name: "Filtrer par statut" })
    expect(filtre).toHaveTextContent("Tous les statuts")
    expect(screen.queryByRole("button", { name: "Réinitialiser" })).toBeNull()

    await user.click(filtre)
    await user.click(await screen.findByRole("option", { name: "Ancien" }))
    expect(filtre).toHaveTextContent("Ancien")

    await user.click(screen.getByRole("button", { name: "Réinitialiser" }))
    expect(filtre).toHaveTextContent("Tous les statuts")
    // Le bouton a disparu : le focus est passé au champ de recherche.
    expect(screen.queryByRole("button", { name: "Réinitialiser" })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole("searchbox"))
    expect(screen.getByText("128")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Colonnes" })).toBeInTheDocument()
  })

  it("efface la recherche par son bouton, le focus revenant au champ", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    const onRecherche = vi.fn()
    render(<Barre onRecherche={onRecherche} />)
    const champ = screen.getByRole("searchbox", { name: "Rechercher" })
    expect(
      screen.queryByRole("button", { name: "Effacer la recherche" })
    ).toBeNull()
    await user.type(champ, "ada")
    await user.click(
      screen.getByRole("button", { name: "Effacer la recherche" })
    )
    expect(onRecherche).toHaveBeenLastCalledWith("")
    expect(champ).toHaveValue("")
    expect(document.activeElement).toBe(champ)
  })

  it("sans recherche, « Réinitialiser » rend le focus au premier filtre", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    function SansRecherche() {
      const [statut, setStatut] = useState<string | null>("actif")
      return (
        <DataTableToolbar
          filtres={
            <DataTableSelectFilter
              libelle="Filtrer par statut"
              valeur={statut}
              onValeurChange={setStatut}
              options={STATUTS}
              libelleTous="Tous les statuts"
            />
          }
          filtresActifs={statut ? 1 : 0}
          onReinitialiser={() => setStatut(null)}
        />
      )
    }
    render(<SansRecherche />)
    await user.click(screen.getByRole("button", { name: "Réinitialiser" }))
    expect(document.activeElement).toBe(
      screen.getByRole("combobox", { name: "Filtrer par statut" })
    )
  })

  it("replie les filtres derrière un bouton sur mobile", async () => {
    simulerLargeur(true)
    const user = userEvent.setup()
    render(<Barre />)
    expect(
      screen.queryByRole("combobox", { name: "Filtrer par statut" })
    ).toBeNull()
    await user.click(screen.getByRole("button", { name: "Filtres" }))
    expect(
      await screen.findByRole("combobox", { name: "Filtrer par statut" })
    ).toBeInTheDocument()
    // La recherche reste visible.
    expect(screen.getByRole("searchbox")).toBeInTheDocument()
  })

  it("tient les gestionnaires de mots de passe à l'écart de la recherche, et passe les attributs donnés", () => {
    render(
      <DataTableToolbar
        recherche={{
          valeur: "",
          onValeurChange: vi.fn(),
          attributs: {
            name: "recherche-membres",
            maxLength: 80,
            className: "font-mono",
          },
        }}
      />
    )
    const champ = screen.getByRole("searchbox", { name: "Rechercher" })
    expect(champ).toHaveAttribute("autocomplete", "off")
    expect(champ).toHaveAttribute("data-1p-ignore")
    expect(champ).toHaveAttribute("data-lpignore", "true")
    expect(champ).toHaveAttribute("data-bwignore")
    expect(champ).toHaveAttribute("name", "recherche-membres")
    expect(champ).toHaveAttribute("maxlength", "80")
    // Les classes s'ajoutent à celles du champ, sans les remplacer.
    expect(champ).toHaveClass(
      "font-mono",
      "[&::-webkit-search-cancel-button]:appearance-none"
    )
  })
})

describe("DataTableCount", () => {
  it("compte les éléments et la tranche affichée, à la française", () => {
    const { rerender } = render(
      <DataTableCount total={1234} decalage={25} nombre={25} />
    )
    // Séparateur des milliers : espace fine insécable.
    expect(screen.getByText(/éléments/).textContent).toBe(
      "1 234 éléments · 26–50 affichés"
    )

    // Zone de statut : un nouveau compte (recherche, filtre) est annoncé.
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true")

    rerender(
      <DataTableCount
        total={1}
        nombre={1}
        unite={{ singulier: "personne", pluriel: "personnes" }}
        feminin
      />
    )
    expect(screen.getByText(/personne/).textContent).toBe(
      "1 personne · 1 affichée"
    )

    rerender(<DataTableCount total={0} nombre={0} />)
    expect(screen.getByText(/élément/).textContent).toBe("0 élément")
  })
})
