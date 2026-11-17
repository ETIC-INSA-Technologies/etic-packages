import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRef, forwardRef, type ComponentProps } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  creerLienRouteur,
  DataTableCellLink,
  DetailItem,
  DetailList,
  EmptyValue,
  formaterDate,
  formaterMontant,
  FormField,
  getEmptyValue,
  LienProvider,
  retablirDefautsMasque,
  setEmptyValue,
  UnitInput,
  useUnsavedChangesGuard,
} from "@etic-ui/index"

describe("EmptyValue", () => {
  it("un tiret muet, et « non renseigné » pour les lecteurs d'écran", () => {
    render(
      <p data-testid="cellule">
        <EmptyValue />
      </p>
    )
    const cellule = screen.getByTestId("cellule")
    expect(cellule).toHaveTextContent("—")
    expect(cellule.querySelector('[aria-hidden="true"]')).toHaveTextContent("—")
    expect(cellule.querySelector(".sr-only")).toHaveTextContent("non renseigné")
  })

  it("prend un autre libellé", () => {
    render(<EmptyValue libelle="aucun auteur" />)
    expect(screen.getByText("aucun auteur")).toHaveClass("sr-only")
  })
})

describe("setEmptyValue", () => {
  afterEach(() => setEmptyValue())

  it("règle à un seul endroit EmptyValue, DetailItem et les replis", () => {
    setEmptyValue("-")
    expect(getEmptyValue()).toBe("-")
    render(
      <>
        <p data-testid="cellule">
          <EmptyValue />
        </p>
        <DetailList>
          <DetailItem libelle="Auteur">{null}</DetailItem>
        </DetailList>
      </>
    )
    const cellule = screen.getByTestId("cellule")
    expect(cellule.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      /^-$/
    )
    expect(cellule.querySelector(".sr-only")).toHaveTextContent("non renseigné")
    expect(
      screen.getByText("Non renseigné").previousElementSibling
    ).toHaveTextContent(/^-$/)
    expect(formaterDate(null)).toBe("-")
    expect(formaterMontant(undefined)).toBe("-")
    // Un repli explicite reste respecté.
    expect(formaterDate(null, "jamais")).toBe("jamais")
  })

  it("sans argument, rend « — » ; refuse un texte invisible", () => {
    setEmptyValue("-")
    setEmptyValue()
    expect(getEmptyValue()).toBe("—")
    expect(formaterMontant(null)).toBe("—")
    expect(() => setEmptyValue(" ")).toThrow(RangeError)
    expect(getEmptyValue()).toBe("—")
  })
})

describe("UnitInput", () => {
  it("dans un FormField : nommé, requis, unité à droite, saisie décimale", () => {
    render(
      <FormField libelle="Acompte" obligatoire description="De 1 à 99.">
        <UnitInput unite="%" className="max-w-32" defaultValue="30" />
      </FormField>
    )
    const champ = screen.getByRole("textbox", { name: /Acompte/ })
    expect(champ).toBeRequired()
    expect(champ).toHaveAccessibleDescription("De 1 à 99.")
    expect(champ).toHaveAttribute("inputmode", "decimal")
    expect(champ).toHaveAttribute("autocomplete", "off")
    expect(champ).toHaveAttribute("data-1p-ignore")
    expect(champ.closest('[data-slot="input-group"]')).toHaveClass("max-w-32")
    expect(champ.closest('[data-slot="input-group"]')).toHaveTextContent("%")
  })

  it("les attributs passés l'emportent", () => {
    render(<UnitInput aria-label="Jours" unite="jours" inputMode="numeric" />)
    expect(screen.getByRole("textbox", { name: "Jours" })).toHaveAttribute(
      "inputmode",
      "numeric"
    )
  })
})

/** Doublure du `Link` d'un routeur : la destination dans `to`. */
const Link = forwardRef<
  HTMLAnchorElement,
  Omit<ComponentProps<"a">, "href"> & { to: string }
>(function Link({ to, ...props }, ref) {
  return <a ref={ref} href={to} data-routeur="" {...props} />
})

const LienRouteur = creerLienRouteur(Link)

describe("creerLienRouteur", () => {
  it("passe href au to du routeur", () => {
    render(
      <LienProvider lien={LienRouteur}>
        <DataTableCellLink href="/etudes/1">Étude</DataTableCellLink>
      </LienProvider>
    )
    const lien = screen.getByRole("link", { name: "Étude" })
    expect(lien).toHaveAttribute("href", "/etudes/1")
    expect(lien).toHaveAttribute("data-routeur")
  })

  it("sans href, un lien désactivé, jamais vers une adresse devinée", async () => {
    const onClick = vi.fn()
    render(
      <>
        <LienRouteur onClick={onClick} className="classe">
          Sans adresse
        </LienRouteur>
        <LienRouteur href="">Adresse vide</LienRouteur>
      </>
    )
    for (const nom of ["Sans adresse", "Adresse vide"]) {
      const lien = screen.getByRole("link", { name: nom })
      expect(lien).toHaveAttribute("aria-disabled", "true")
      expect(lien).not.toHaveAttribute("href")
      expect(lien).not.toHaveAttribute("data-routeur")
      expect(lien).not.toHaveAttribute("tabindex")
    }
    const sansAdresse = screen.getByRole("link", { name: "Sans adresse" })
    expect(sansAdresse).toHaveClass("classe")
    await userEvent.click(sansAdresse)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("un role ou aria-disabled passés ne rendent pas actif un lien sans adresse", () => {
    render(
      <LienRouteur role="button" aria-disabled="false">
        Forcé
      </LienRouteur>
    )
    const lien = screen.getByRole("link", { name: "Forcé" })
    expect(lien).toHaveAttribute("aria-disabled", "true")
  })

  it("transmet ref, className et les autres attributs au Link", () => {
    const ref = createRef<HTMLAnchorElement>()
    render(
      <LienRouteur ref={ref} href="/a" className="classe" aria-current="page">
        A
      </LienRouteur>
    )
    const lien = screen.getByRole("link", { name: "A" })
    expect(ref.current).toBe(lien)
    expect(lien).toHaveClass("classe")
    expect(lien).toHaveAttribute("aria-current", "page")
    expect(lien).toHaveAttribute("data-routeur")
  })
})

describe("DataTableCellLink externe", () => {
  it("un vrai lien, nouvel onglet, qui le dit, hors du routeur", () => {
    render(
      <LienProvider lien={LienRouteur}>
        <DataTableCellLink href="https://exemple.org/doc" externe>
          rapport.pdf
        </DataTableCellLink>
      </LienProvider>
    )
    const lien = screen.getByRole("link", {
      name: /^rapport\.pdf\s*\(nouvel onglet\)$/,
    })
    expect(lien).toHaveAttribute("href", "https://exemple.org/doc")
    expect(lien).toHaveAttribute("target", "_blank")
    expect(lien).toHaveAttribute("rel", "noopener noreferrer")
    expect(lien).not.toHaveAttribute("data-routeur")
    expect(lien).toHaveAttribute("data-slot", "data-table-cell-link")
  })

  it("ignore un lien explicite : jamais le routeur pour une page externe", () => {
    render(
      <DataTableCellLink
        href="https://exemple.org/doc"
        lien={LienRouteur}
        externe
      >
        rapport.pdf
      </DataTableCellLink>
    )
    const lien = screen.getByRole("link", { name: /^rapport\.pdf/ })
    expect(lien).not.toHaveAttribute("data-routeur")
    expect(lien).toHaveAttribute("target", "_blank")
  })

  it("libelleExterne dit la destination aux lecteurs d'écran", () => {
    render(
      <DataTableCellLink
        href="https://exemple.org/doc"
        externe
        libelleExterne="ouvrir sur le Drive, nouvel onglet"
      >
        rapport.pdf
      </DataTableCellLink>
    )
    const lien = screen.getByRole("link", {
      name: /^rapport\.pdf\s*\(ouvrir sur le Drive, nouvel onglet\)$/,
    })
    expect(lien).not.toHaveAttribute("libelleExterne")
  })
})

describe("useUnsavedChangesGuard", () => {
  afterEach(() => vi.restoreAllMocks())

  const navigation = (de: string, vers: string) => ({
    currentLocation: { pathname: de },
    nextLocation: { pathname: vers },
  })

  it("retient un changement de page tant que c'est modifié, pas un changement de paramètres", () => {
    const { result, rerender } = renderHook(
      ({ modifie }) => useUnsavedChangesGuard(modifie),
      { initialProps: { modifie: false } }
    )
    const garde = result.current
    expect(garde(navigation("/a", "/b"))).toBe(false)
    rerender({ modifie: true })
    // Le garde est stable, et lit le dernier rendu.
    expect(result.current).toBe(garde)
    expect(garde(navigation("/a", "/b"))).toBe(true)
    expect(garde(navigation("/a", "/a"))).toBe(false)
  })

  it("une fonction est lue au moment de naviguer", () => {
    let modifie = false
    const { result } = renderHook(() => useUnsavedChangesGuard(() => modifie))
    expect(result.current(navigation("/a", "/b"))).toBe(false)
    modifie = true
    expect(result.current(navigation("/a", "/b"))).toBe(true)
  })

  it("resteDansLaPage dit quelles navigations gardent la saisie", () => {
    const { result } = renderHook(() =>
      useUnsavedChangesGuard(true, (courante, suivante) =>
        suivante.pathname.startsWith(courante.pathname)
      )
    )
    expect(result.current(navigation("/etudes/1", "/etudes/1/documents"))).toBe(
      false
    )
    expect(result.current(navigation("/etudes/1", "/etudes"))).toBe(true)
  })

  it("retient aussi la fermeture de l'onglet", () => {
    renderHook(() => useUnsavedChangesGuard(true))
    const evenement = new Event("beforeunload", { cancelable: true })
    act(() => {
      window.dispatchEvent(evenement)
    })
    expect(evenement.defaultPrevented).toBe(true)
  })
})

describe("retablirDefautsMasque", () => {
  const defauts = { a: 1, b: 2 }
  const champs = ["a", "b"] as const
  const masque = (
    saisie: Record<string, number>,
    enregistre: Record<string, number>
  ) =>
    retablirDefautsMasque(
      champs,
      (c) => saisie[c] === defauts[c],
      (c) => enregistre[c] === defauts[c]
    )

  it("masqué si la saisie vaut tous les défauts", () => {
    expect(masque({ a: 1, b: 2 }, { a: 5, b: 2 })).toBe(true)
  })

  it("masqué si l'enregistré les vaut : « Annuler » y revient déjà", () => {
    expect(masque({ a: 5, b: 2 }, { a: 1, b: 2 })).toBe(true)
  })

  it("offert quand une valeur enregistrée s'en écarte", () => {
    expect(masque({ a: 5, b: 2 }, { a: 5, b: 2 })).toBe(false)
  })
})
