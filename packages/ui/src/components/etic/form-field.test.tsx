import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  CheckboxList,
  DatePicker,
  FormField,
  FormSection,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  PhoneInput,
  SearchSelect,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useFormField,
} from "@etic-ui/index"

describe("FormField", () => {
  it("relie le libellé, l'aide et l'erreur au contrôle", () => {
    render(
      <FormField
        libelle="Courriel"
        obligatoire
        description="Adresse de l'association."
        erreur="Adresse invalide."
      >
        <Input />
      </FormField>
    )
    const champ = screen.getByRole("textbox", { name: "Courriel" })
    expect(champ).toHaveAttribute("aria-invalid", "true")
    expect(champ).toHaveAccessibleDescription(
      "Adresse de l'association. Adresse invalide."
    )
    // L'erreur est dans la description, sans alerte (une par champ fautif
    // ferait une rafale à l'envoi).
    expect(screen.getByText("Adresse invalide.")).not.toHaveAttribute("role")
    expect(screen.queryByRole("alert")).toBeNull()
    // L'astérisque est visuel : le nom accessible reste « Courriel ».
    expect(screen.getByTitle("Champ obligatoire")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
  })

  it("obligatoire : required sur un contrôle de saisie natif", () => {
    render(
      <>
        <FormField libelle="Nom" obligatoire>
          <Input />
        </FormField>
        <FormField libelle="Note">
          <Input />
        </FormField>
      </>
    )
    const nom = screen.getByRole("textbox", { name: "Nom" })
    expect(nom).toBeRequired()
    expect(nom).not.toHaveAttribute("aria-required")
    expect(screen.getByRole("textbox", { name: "Note" })).not.toBeRequired()
  })

  it("obligatoire : les composites posent required sur leur vrai champ", () => {
    render(
      <>
        <FormField libelle="Téléphone" obligatoire erreur="Numéro invalide.">
          <PhoneInput valeur="" onValeurChange={vi.fn()} />
        </FormField>
        <FormField libelle="Naissance" obligatoire description="Majeur.">
          <DatePicker valeur={undefined} onValeurChange={vi.fn()} />
        </FormField>
        <FormField libelle="Parrain" obligatoire>
          <SearchSelect<string>
            valeur={null}
            onValeurChange={vi.fn()}
            rechercher={async () => []}
            libelleElement={(s) => s}
            idElement={(s) => s}
          />
        </FormField>
      </>
    )
    const telephone = screen.getByRole("textbox", { name: "Téléphone" })
    expect(telephone).toBeRequired()
    expect(telephone).not.toHaveAttribute("aria-required")
    expect(telephone).toHaveAttribute("aria-invalid", "true")
    expect(telephone).toHaveAccessibleDescription("Numéro invalide.")

    const naissance = screen.getByRole("textbox", { name: "Naissance" })
    expect(naissance).toBeRequired()
    expect(naissance).not.toHaveAttribute("aria-required")
    expect(naissance).toHaveAccessibleDescription(
      "Majeur. Format : jj/mm/aaaa."
    )

    // Le Combobox valide par son champ caché ; le champ visible l'annonce.
    expect(screen.getByRole("combobox", { name: "Parrain" })).toHaveAttribute(
      "aria-required",
      "true"
    )
  })

  it("un composant de l'application lit useFormField", () => {
    function ChampMaison() {
      const champ = useFormField()
      return (
        <input
          id={champ?.id}
          required={champ?.obligatoire}
          aria-describedby={champ?.describedBy}
          aria-invalid={champ?.invalide || undefined}
          data-description={champ?.descriptionId}
          data-erreur={champ?.erreurId}
        />
      )
    }
    render(
      <FormField
        libelle="Code"
        obligatoire
        description="Six chiffres."
        erreur="Code inconnu."
      >
        <ChampMaison />
      </FormField>
    )
    const code = screen.getByRole("textbox", { name: "Code" })
    expect(code).toBeRequired()
    expect(code).toHaveAttribute("aria-invalid", "true")
    expect(code).toHaveAccessibleDescription("Six chiffres. Code inconnu.")
    expect(
      document.getElementById(code.getAttribute("data-description")!)
    ).toHaveTextContent("Six chiffres.")
    expect(
      document.getElementById(code.getAttribute("data-erreur")!)
    ).toHaveTextContent("Code inconnu.")
  })

  it("hors d'un FormField, useFormField renvoie null", () => {
    let lu: unknown = "pas lu"
    function Sonde() {
      lu = useFormField()
      return null
    }
    render(<Sonde />)
    expect(lu).toBeNull()
  })

  it("obligatoire : aria-required sur un déclencheur, « obligatoire » dans le nom d'un groupe", () => {
    render(
      <>
        <Select>
          <FormField libelle="Pôle" obligatoire>
            <SelectTrigger>
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
          </FormField>
        </Select>
        <FormField libelle="Groupes" obligatoire>
          <CheckboxList
            options={[{ valeur: "dsi", libelle: "DSI" }]}
            valeurs={[]}
            onValeursChange={vi.fn()}
          />
        </FormField>
        <FormField libelle="Statut" obligatoire>
          <SegmentedControl
            valeur={null}
            onValeurChange={vi.fn()}
            options={[{ valeur: "actif", libelle: "Actif" }]}
          />
        </FormField>
      </>
    )
    const declencheur = document.querySelector("[data-slot=select-trigger]")
    expect(declencheur).toHaveAttribute("aria-required", "true")
    expect(declencheur).not.toHaveAttribute("required")
    // `role="group"` n'admet pas aria-required (axe : aria-allowed-attr).
    for (const nom of ["Groupes obligatoire", "Statut obligatoire"]) {
      const groupe = screen.getByRole("group", { name: nom })
      expect(groupe).not.toHaveAttribute("aria-required")
      expect(groupe).not.toHaveAttribute("required")
    }
  })

  it("autour d'un InputGroup, vise son champ de saisie", () => {
    render(
      <FormField
        libelle="Taille maximale"
        obligatoire
        description="Par fichier."
        erreur="Trop grand."
      >
        <InputGroup>
          <InputGroupInput inputMode="numeric" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>Mo</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </FormField>
    )
    const champ = screen.getByRole("textbox", { name: "Taille maximale" })
    expect(champ).toBeRequired()
    expect(champ).toHaveAttribute("aria-invalid", "true")
    expect(champ).toHaveAccessibleDescription("Par fichier. Trop grand.")
    const groupe = document.querySelector("[data-slot=input-group]")!
    expect(groupe).not.toHaveAttribute("id")
    expect(groupe).not.toHaveAttribute("aria-describedby")
  })

  it("nomme par son libellé un groupe de cases ou de boutons joints", () => {
    render(
      <>
        <FormField libelle="Groupes">
          <CheckboxList
            options={[{ valeur: "dsi", libelle: "DSI" }]}
            valeurs={[]}
            onValeursChange={vi.fn()}
          />
        </FormField>
        <FormField libelle="Statut">
          <SegmentedControl
            valeur="actif"
            onValeurChange={vi.fn()}
            options={[
              { valeur: "actif", libelle: "Actif" },
              { valeur: "ancien", libelle: "Ancien" },
            ]}
          />
        </FormField>
      </>
    )
    expect(screen.getByRole("group", { name: "Groupes" })).toHaveAttribute(
      "data-slot",
      "checkbox-group"
    )
    expect(screen.getByRole("group", { name: "Statut" })).toBeInTheDocument()
  })

  it("nomme par son libellé le déclencheur d'un Select", () => {
    render(
      <FormField libelle="Pôle">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Choisir" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dsi">DSI</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
    )
    expect(screen.getByRole("combobox", { name: "Pôle" })).toBeInTheDocument()
  })

  it("sans erreur, le contrôle n'est pas invalide ; l'id fourni est gardé", () => {
    render(
      <FormField libelle="Nom">
        <Input id="nom" aria-describedby="autre" />
      </FormField>
    )
    const champ = screen.getByRole("textbox", { name: "Nom" })
    expect(champ).toHaveAttribute("id", "nom")
    expect(champ).not.toHaveAttribute("aria-invalid")
    expect(champ).toHaveAttribute("aria-describedby", "autre")
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("liste plusieurs erreurs, sans doublon", () => {
    render(
      <FormField libelle="Mot" erreur={["Trop court.", "Trop court.", "Vide."]}>
        <Input />
      </FormField>
    )
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      ["Trop court.", "Vide."]
    )
  })
})

describe("FormSection", () => {
  it("regroupe des champs sous un titre annoncé", () => {
    render(
      <FormSection titre="Identité" description="Telle qu'à l'état civil.">
        <FormField libelle="Nom">
          <Input />
        </FormField>
      </FormSection>
    )
    const groupe = screen.getByRole("group", { name: "Identité" })
    expect(groupe.tagName).toBe("FIELDSET")
    expect(screen.getByText("Telle qu'à l'état civil.")).toBeVisible()
  })
})
