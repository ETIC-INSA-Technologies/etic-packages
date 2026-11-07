import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  CodeBlock,
  SelectField,
  SelectedFile,
  StatusBadge,
  SubSection,
} from "@etic-ui/index"

describe("SelectField", () => {
  const OPTIONS = [
    { valeur: "clair", libelle: "Clair" },
    { valeur: "sombre", libelle: "Sombre", desactive: true },
    { valeur: "auto", libelle: "Système" },
  ] as const

  function Champ() {
    const [valeur, setValeur] = useState<string | null>(null)
    return (
      <>
        <SelectField
          libelle="Thème"
          valeur={valeur}
          options={OPTIONS}
          onValeurChange={setValeur}
          obligatoire
          description="Celui de l'interface."
        />
        <output>{valeur ?? "aucun"}</output>
      </>
    )
  }

  it("nommé par son libellé ; rien de choisi, sans option « Choisir… »", async () => {
    const user = userEvent.setup()
    render(<Champ />)
    const liste = screen.getByRole("combobox", { name: /Thème/ })
    expect(liste).toHaveTextContent("Choisir…")
    await user.click(liste)
    const options = await screen.findAllByRole("option")
    expect(options.map((o) => o.textContent)).toEqual([
      "Clair",
      "Sombre",
      "Système",
    ])
    expect(screen.getByRole("option", { name: "Sombre" })).toHaveAttribute(
      "aria-disabled",
      "true"
    )
    await user.click(screen.getByRole("option", { name: "Système" }))
    expect(screen.getByRole("status")).toHaveTextContent("auto")
  })
})

describe("SubSection", () => {
  it("une section nommée par son titre", () => {
    render(
      <SubSection
        titre="Contexte"
        aCote={<StatusBadge ton="info">Lu</StatusBadge>}
      >
        <p>Contenu</p>
      </SubSection>
    )
    expect(screen.getByRole("region", { name: "Contexte" })).toHaveTextContent(
      "Contenu"
    )
    expect(
      screen.getByRole("heading", { level: 3, name: "Contexte" })
    ).toBeInTheDocument()
  })
})

describe("CodeBlock", () => {
  it("un texte tel quel, le reste en JSON indenté", () => {
    const { rerender } = render(<CodeBlock valeur="trace brute" />)
    expect(screen.getByText("trace brute").tagName).toBe("PRE")
    rerender(<CodeBlock valeur={{ a: 1 }} retourLigne />)
    const bloc = document.querySelector("pre")!
    expect(bloc.textContent).toBe('{\n  "a": 1\n}')
    expect(bloc).toHaveClass("whitespace-pre-wrap")
  })

  it("une valeur que JSON ne sait pas écrire", () => {
    render(<CodeBlock valeur={undefined} />)
    expect(document.querySelector("pre")).toHaveTextContent("undefined")
  })

  it("une valeur que JSON refuse, sans planter le rendu", () => {
    const circulaire: Record<string, unknown> = {}
    circulaire.soi = circulaire
    const { rerender } = render(<CodeBlock valeur={circulaire} />)
    expect(document.querySelector("pre")).toHaveTextContent("[object Object]")
    rerender(<CodeBlock valeur={BigInt(12)} />)
    expect(document.querySelector("pre")).toHaveTextContent("12")
  })
})

describe("SelectedFile", () => {
  it("nom, taille et « Changer de fichier »", async () => {
    const onChanger = vi.fn()
    render(
      <SelectedFile
        fichier={{ name: "rapport.pdf", size: 1536 }}
        onChanger={onChanger}
      />
    )
    expect(screen.getByText("rapport.pdf")).toHaveTextContent(
      /rapport\.pdf · 1,5\sKo/
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Changer de fichier" })
    )
    expect(onChanger).toHaveBeenCalledOnce()
  })
})
