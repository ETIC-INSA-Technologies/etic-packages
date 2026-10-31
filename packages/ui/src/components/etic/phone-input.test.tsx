import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
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
})
