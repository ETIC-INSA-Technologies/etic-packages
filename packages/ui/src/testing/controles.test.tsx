import { render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  Button,
  Checkbox,
  SearchSelect,
  SelectField,
  TooltipButton,
} from "@etic-ui/index"
import {
  chercher,
  choisir,
  coche,
  inactif,
  optionsDe,
  valeurAffichee,
} from "@etic-ui/testing/controles"

const OPTIONS = [
  { valeur: "clair", libelle: "Clair" },
  { valeur: "sombre", libelle: "Sombre" },
]

function Liste() {
  const [valeur, setValeur] = useState<string | null>(null)
  return (
    <SelectField
      libelle="Thème"
      valeur={valeur}
      options={OPTIONS}
      onValeurChange={setValeur}
    />
  )
}

describe("contrôles de test", () => {
  it("inactif : disabled comme verrou focalisable", () => {
    render(
      <>
        <Button disabled>Natif</Button>
        <TooltipButton verrou="Pas maintenant">Retenu</TooltipButton>
        <Button>Actif</Button>
      </>
    )
    expect(inactif(screen.getByRole("button", { name: "Natif" }))).toBe(true)
    expect(inactif(screen.getByRole("button", { name: /Retenu/ }))).toBe(true)
    expect(inactif(screen.getByRole("button", { name: "Actif" }))).toBe(false)
  })

  it("coche : case de la bibliothèque comme case native", () => {
    render(
      <>
        <Checkbox aria-label="Base UI" defaultChecked />
        <input type="checkbox" aria-label="Native" defaultChecked />
        <Checkbox aria-label="Vide" />
      </>
    )
    expect(coche(screen.getByRole("checkbox", { name: "Base UI" }))).toBe(true)
    expect(coche(screen.getByRole("checkbox", { name: "Native" }))).toBe(true)
    expect(coche(screen.getByRole("checkbox", { name: "Vide" }))).toBe(false)
  })

  it("choisir, valeurAffichee, optionsDe sur un Select", async () => {
    render(<Liste />)
    const liste = screen.getByRole("combobox", { name: "Thème" })
    expect(valeurAffichee(liste)).toBe("Choisir…")
    expect(await optionsDe(liste)).toEqual(["Clair", "Sombre"])
    await choisir(liste, "Sombre")
    expect(valeurAffichee(liste)).toBe("Sombre")
  })

  it("chercher choisit une suggestion d'un SearchSelect", async () => {
    const choix = vi.fn()
    function Recherche() {
      const [valeur, setValeur] = useState<string | null>(null)
      return (
        <SearchSelect<string>
          aria-label="Membre"
          libelleElement={(nom) => nom}
          idElement={(nom) => nom}
          delai={0}
          rechercher={async (texte) =>
            ["Ada", "Alan"].filter((nom) => nom.startsWith(texte))
          }
          valeur={valeur}
          onValeurChange={(nom) => {
            setValeur(nom)
            choix(nom)
          }}
        />
      )
    }
    render(<Recherche />)
    await chercher(
      screen.getByRole("combobox", { name: "Membre" }),
      "Al",
      "Alan"
    )
    await waitFor(() => expect(choix).toHaveBeenCalledWith("Alan"))
  })
})
