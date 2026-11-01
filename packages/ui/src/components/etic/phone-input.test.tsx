import { useState } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  FormField,
  formaterTelephone,
  PhoneInput,
  type PhoneInputDetails,
  type PhoneInputProps,
} from "@etic-ui/index"

function Demo({
  initiale = "",
  surChangement,
  ...props
}: Partial<PhoneInputProps> & {
  initiale?: string
  surChangement?: (valeur: string, details: PhoneInputDetails) => void
}) {
  const [valeur, setValeur] = useState(initiale)
  return (
    <>
      <PhoneInput
        aria-label="Téléphone"
        {...props}
        valeur={valeur}
        onValeurChange={(v, d) => {
          setValeur(v)
          surChangement?.(v, d)
        }}
      />
      <output>{valeur}</output>
      <button type="button" onClick={() => setValeur("+32470123456")}>
        Recharger
      </button>
    </>
  )
}

describe("PhoneInput", () => {
  it("rend un numéro français en E.164 et le met en forme en quittant le champ", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(<Demo surChangement={surChangement} />)

    const champ = screen.getByRole("textbox", { name: "Téléphone" })
    expect(champ).toHaveAttribute("placeholder", "06 12 34 56 78")
    await user.type(champ, "0612345678")
    expect(surChangement).toHaveBeenLastCalledWith("+33612345678", {
      valide: true,
      pays: "FR",
    })
    await user.tab()
    expect(champ).toHaveValue("06 12 34 56 78")
  })

  it("signale un numéro incomplet", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(<Demo surChangement={surChangement} />)

    await user.type(screen.getByRole("textbox"), "06123")
    expect(surChangement).toHaveBeenLastCalledWith("06123", {
      valide: false,
      pays: "FR",
    })
    await user.clear(screen.getByRole("textbox"))
    expect(surChangement).toHaveBeenLastCalledWith("", {
      valide: false,
      pays: "FR",
    })
  })

  it("un numéro tapé avec son indicatif choisit le pays", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(<Demo surChangement={surChangement} />)

    await user.type(screen.getByRole("textbox"), "+44 7400 123456")
    expect(surChangement).toHaveBeenLastCalledWith("+447400123456", {
      valide: true,
      pays: "GB",
    })
    expect(screen.getByLabelText("Pays")).toHaveTextContent("+44")
  })

  it("change de pays par la liste, et relit le numéro", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(<Demo pays={["FR", "BE", "CH"]} surChangement={surChangement} />)
    await user.type(screen.getByRole("textbox"), "0470123456")

    await user.click(screen.getByLabelText("Pays"))
    await user.click(await screen.findByRole("option", { name: /Belgique/ }))
    expect(surChangement).toHaveBeenLastCalledWith("+32470123456", {
      valide: true,
      pays: "BE",
    })
  })

  it("remet le numéro en forme pour le nouveau pays", async () => {
    const user = userEvent.setup()
    render(<Demo pays={["FR", "BE", "CH"]} />)
    const champ = screen.getByRole("textbox", { name: "Téléphone" })
    await user.type(champ, "0470123456")
    await user.tab()
    expect(champ).toHaveValue("04 70 12 34 56")

    await user.click(screen.getByLabelText("Pays"))
    await user.click(await screen.findByRole("option", { name: /Belgique/ }))
    expect(champ).toHaveValue("0470 12 34 56")
  })

  it("Entrée choisit le premier pays trouvé par la recherche", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(<Demo surChangement={surChangement} />)

    await user.click(screen.getByLabelText("Pays"))
    const recherche = await screen.findByRole("combobox", {
      name: "Rechercher un pays",
    })
    await user.type(recherche, "suis")
    await user.keyboard("{Enter}")
    expect(surChangement).toHaveBeenLastCalledWith("", {
      valide: false,
      pays: "CH",
    })
  })

  it("trie les pays par leur nom, à la française", async () => {
    const user = userEvent.setup()
    render(<Demo pays={["SX", "MF", "SA"]} />)
    await user.click(screen.getByLabelText("Pays"))
    const noms = (await screen.findAllByRole("option")).map((o) =>
      o.textContent?.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}/u, "")
    )
    expect(noms).toEqual([
      "Arabie saoudite +966",
      "Saint-Martin +590",
      "Saint-Martin (partie néerlandaise) +1",
    ])
  })

  it("cherche un pays par son nom ou son indicatif", async () => {
    const user = userEvent.setup()
    const surChangement = vi.fn()
    render(<Demo surChangement={surChangement} />)

    await user.click(screen.getByLabelText("Pays"))
    const recherche = await screen.findByRole("combobox", {
      name: "Rechercher un pays",
    })
    await user.type(recherche, "suis")
    expect(
      await screen.findByRole("option", { name: /Suisse \+41/ })
    ).toBeVisible()
    expect(screen.queryByRole("option", { name: /France/ })).toBeNull()

    await user.clear(recherche)
    await user.type(recherche, "+32")
    await user.click(await screen.findByRole("option", { name: /Belgique/ }))
    expect(surChangement).toHaveBeenLastCalledWith("", {
      valide: false,
      pays: "BE",
    })
    expect(screen.getByLabelText("Pays")).toHaveTextContent("+32")
  })

  it("affiche une valeur reçue dans le format de son pays, et la suit", async () => {
    const user = userEvent.setup()
    render(<Demo initiale="+41781234567" />)
    expect(screen.getByRole("textbox")).toHaveValue("078 123 45 67")
    expect(screen.getByLabelText("Pays")).toHaveTextContent("+41")

    await user.click(screen.getByRole("button", { name: "Recharger" }))
    expect(screen.getByRole("textbox")).toHaveValue("0470 12 34 56")
    expect(screen.getByLabelText("Pays")).toHaveTextContent("+32")
  })

  it("avec name, soumet la valeur E.164, pas le texte affiché", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <form>
        <Demo name="telephone" />
      </form>
    )
    await user.type(screen.getByRole("textbox"), "06 12 34 56 78")
    const donnees = new FormData(container.querySelector("form")!)
    expect(donnees.getAll("telephone")).toEqual(["+33612345678"])
  })

  it("en erreur, le groupe est traité comme un seul champ : bordures rouges, un halo", () => {
    // Dérivé en CSS de l'`aria-invalid` du numéro. jsdom ne compile pas
    // Tailwind mais évalue ses sélecteurs : le groupe porte les règles, ses
    // enfants ont les `data-slot` visés, et la condition suit l'erreur.
    const enErreur = (groupe: Element) => {
      expect(groupe).toHaveClass(
        "has-[[data-slot=input][aria-invalid=true]]:ring-3",
        "has-[[data-slot=input][aria-invalid=true]]:ring-destructive/20",
        "has-[[data-slot=input][aria-invalid=true]]:*:data-[slot=combobox-trigger]:border-destructive",
        // Le halo propre du numéro cède à celui du groupe.
        "*:data-[slot=input]:aria-invalid:ring-0"
      )
      const pays = screen.getByRole("combobox", { name: "Pays" })
      expect(pays.parentElement).toBe(groupe)
      expect(pays).toHaveAttribute("data-slot", "combobox-trigger")
      expect(
        screen.getByRole("textbox", { name: "Téléphone" })
      ).toHaveAttribute("data-slot", "input")
      // Pas d'aria-invalid sur un bouton.
      expect(pays).not.toHaveAttribute("aria-invalid")
      return groupe.matches(':has([data-slot="input"][aria-invalid="true"])')
    }
    const { container, rerender } = render(
      <FormField libelle="Téléphone" erreur="Numéro incomplet.">
        <PhoneInput valeur="" onValeurChange={vi.fn()} />
      </FormField>
    )
    const groupe = container.querySelector('[data-slot="button-group"]')!
    expect(screen.getByRole("textbox", { name: "Téléphone" })).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(enErreur(groupe)).toBe(true)

    rerender(
      <FormField libelle="Téléphone">
        <PhoneInput valeur="" onValeurChange={vi.fn()} />
      </FormField>
    )
    expect(enErreur(groupe)).toBe(false)
  })

  it("la liste des pays reste ancrée sur son bouton, pas sur sa recherche", async () => {
    // Le `ComboboxInput` de recherche, dans la liste, ne s'en fait pas
    // l'ancre (il ancre la liste d'un champ, comme celle de SearchSelect).
    const mesurer = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const largeur =
          this.getAttribute("aria-label") === "Pays"
            ? 90
            : this.dataset.slot === "input-group"
              ? 280
              : 0
        return DOMRect.fromRect({ x: 10, y: 40, width: largeur, height: 32 })
      })
    try {
      const user = userEvent.setup()
      render(<Demo />)
      await user.click(screen.getByRole("combobox", { name: "Pays" }))
      await screen.findByRole("combobox", { name: "Rechercher un pays" })
      const positionneur = document.querySelector<HTMLElement>(
        '[data-slot="combobox-content"]'
      )!.parentElement!
      await waitFor(() =>
        expect(positionneur.style.getPropertyValue("--anchor-width")).toBe(
          "90px"
        )
      )
    } finally {
      mesurer.mockRestore()
    }
  })
})

describe("formaterTelephone", () => {
  it("un numéro français au format national, comme le champ", () => {
    expect(formaterTelephone("+33655189245")).toBe("06 55 18 92 45")
    expect(formaterTelephone("+33123456789")).toBe("01 23 45 67 89")
  })

  it("un numéro d'un autre pays au format international", () => {
    expect(formaterTelephone("+442079460958")).toBe("+44 20 7946 0958")
    // Guadeloupe : un autre pays que la France pour libphonenumber.
    expect(formaterTelephone("+590590123456")).toBe("+590 590 12 34 56")
  })

  it("pays par défaut réglable, comme celui de PhoneInput", () => {
    expect(formaterTelephone("+32470123456", { paysParDefaut: "BE" })).toBe(
      "0470 12 34 56"
    )
    expect(formaterTelephone("+33655189245", { paysParDefaut: "BE" })).toBe(
      "+33 6 55 18 92 45"
    )
  })

  it("rend tel quel un numéro illisible ou invalide, et vide une valeur absente", () => {
    expect(formaterTelephone("+3312345")).toBe("+3312345")
    expect(formaterTelephone("pas un numéro")).toBe("pas un numéro")
    expect(formaterTelephone("")).toBe("")
    expect(formaterTelephone(null)).toBe("")
    expect(formaterTelephone(undefined)).toBe("")
  })
})
