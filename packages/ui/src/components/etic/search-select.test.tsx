import { createRef, useState } from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SearchSelect, type SearchSelectProps } from "@etic-ui/index"

interface Personne {
  id: string
  nom: string
}

const PERSONNES: Personne[] = [
  { id: "1", nom: "Ada Lovelace" },
  { id: "2", nom: "Alan Turing" },
  { id: "3", nom: "Grace Hopper" },
]

function chercherDans(liste: Personne[]) {
  return vi.fn(async (texte: string) =>
    liste.filter((p) => p.nom.toLowerCase().includes(texte.toLowerCase()))
  )
}

function Demo({
  initiale = null,
  surChangement,
  delai = 300,
  ...props
}: Omit<
  Partial<SearchSelectProps<Personne>>,
  "rechercher" | "valeur" | "onValeurChange"
> & {
  rechercher: (texte: string, signal: AbortSignal) => Promise<Personne[]>
  initiale?: Personne | null
  surChangement?: (p: Personne | null) => void
}) {
  const [valeur, setValeur] = useState<Personne | null>(initiale)
  return (
    <SearchSelect<Personne>
      aria-label="Membre"
      libelleElement={(p) => p.nom}
      idElement={(p) => p.id}
      delai={delai}
      {...props}
      valeur={valeur}
      onValeurChange={(p) => {
        setValeur(p)
        surChangement?.(p)
      }}
    />
  )
}

// Minuteurs simulés : l'anti-rebond ne dépend pas de la vitesse de la machine.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
})

const utilisateur = () =>
  userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

async function avancer(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await Promise.resolve()
  })
}

describe("SearchSelect", () => {
  it("propose des suggestions à l'ouverture, puis cherche ce qui est tapé", async () => {
    const user = utilisateur()
    const rechercher = chercherDans(PERSONNES)
    render(<Demo rechercher={rechercher} />)

    await user.click(screen.getByRole("combobox", { name: "Membre" }))
    expect(
      await screen.findByRole("option", { name: "Grace Hopper" })
    ).toBeInTheDocument()
    expect(rechercher).toHaveBeenLastCalledWith("", expect.any(AbortSignal))

    await user.type(screen.getByRole("combobox"), "tur")
    await avancer(300)
    expect(
      await screen.findByRole("option", { name: "Alan Turing" })
    ).toBeVisible()
    expect(screen.queryByRole("option", { name: "Ada Lovelace" })).toBeNull()
    // Anti-rebond : une seule recherche pour les trois frappes.
    expect(rechercher).toHaveBeenCalledTimes(2)
    expect(rechercher).toHaveBeenLastCalledWith("tur", expect.any(AbortSignal))
  })

  it("pendant l'anti-rebond, les anciens résultats ne se choisissent pas", async () => {
    const user = utilisateur()
    const surChangement = vi.fn()
    render(
      <Demo
        rechercher={chercherDans(PERSONNES)}
        surChangement={surChangement}
      />
    )
    const champ = screen.getByRole("combobox")
    await user.click(champ)
    await screen.findByRole("option", { name: "Ada Lovelace" })

    await user.type(champ, "gra")
    // La réponse à « gra » n'est pas encore là : liste vide et occupée.
    expect(screen.queryByRole("option")).toBeNull()
    expect(screen.getByRole("listbox", { hidden: true })).toHaveAttribute(
      "aria-busy",
      "true"
    )
    expect(screen.getByRole("status")).toHaveTextContent("Recherche…")
    await user.keyboard("{ArrowDown}{Enter}")
    expect(surChangement).not.toHaveBeenCalled()

    await user.clear(champ)
    await user.type(champ, "gra")
    await avancer(300)
    expect(
      await screen.findByRole("option", { name: "Grace Hopper" })
    ).toBeVisible()
    await user.keyboard("{ArrowDown}{Enter}")
    expect(surChangement).toHaveBeenLastCalledWith(PERSONNES[2])
  })

  it("rouverte, la liste ne remontre pas les résultats d'avant", async () => {
    const user = utilisateur()
    const rechercher = chercherDans(PERSONNES)
    render(<Demo rechercher={rechercher} />)
    const champ = screen.getByRole("combobox")
    await user.click(champ)
    await user.type(champ, "tur")
    await avancer(300)
    await screen.findByRole("option", { name: "Alan Turing" })
    await user.keyboard("{Escape}")

    // Recherche vide en attente : rien de « tur » ne s'affiche.
    rechercher.mockImplementationOnce(() => new Promise(() => {}))
    await user.click(champ)
    expect(screen.queryByRole("option", { name: "Alan Turing" })).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("Recherche…")
  })

  it("choisit une suggestion et affiche son libellé", async () => {
    const user = utilisateur()
    const surChangement = vi.fn()
    const rechercher = chercherDans(PERSONNES)
    render(<Demo rechercher={rechercher} surChangement={surChangement} />)

    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Alan Turing" }))

    expect(surChangement).toHaveBeenLastCalledWith(PERSONNES[1])
    expect(screen.getByRole("combobox")).toHaveValue("Alan Turing")
    // Le libellé posé dans le champ ne relance pas de recherche.
    expect(rechercher).toHaveBeenCalledTimes(1)
  })

  it("affiche la valeur initiale même absente des résultats, et l'efface", async () => {
    const user = utilisateur()
    const surChangement = vi.fn()
    render(
      <Demo
        rechercher={chercherDans([])}
        initiale={{ id: "9", nom: "Katherine Johnson" }}
        surChangement={surChangement}
      />
    )
    expect(screen.getByRole("combobox")).toHaveValue("Katherine Johnson")

    await user.click(screen.getByRole("button", { name: "Effacer" }))
    expect(surChangement).toHaveBeenLastCalledWith(null)
    expect(screen.getByRole("combobox")).toHaveValue("")
    expect(screen.queryByRole("button", { name: "Effacer" })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole("combobox"))
  })

  it("dit quand rien ne correspond", async () => {
    const user = utilisateur()
    render(<Demo rechercher={chercherDans([])} vide="Aucun membre." />)
    await user.click(screen.getByRole("combobox"))
    expect(await screen.findByText("Aucun membre.")).toBeVisible()
  })

  it("un échec se voit, se signale à l'application et se réessaie", async () => {
    const user = utilisateur()
    const onErreur = vi.fn()
    const rechercher = vi.fn(async (): Promise<Personne[]> => {
      throw new Error("réseau")
    })
    render(<Demo rechercher={rechercher} onErreur={onErreur} />)
    await user.click(screen.getByRole("combobox"))
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La recherche a échoué."
      )
    )
    expect(onErreur).toHaveBeenCalledWith(new Error("réseau"))

    rechercher.mockImplementation(async () => PERSONNES)
    await user.click(screen.getByRole("button", { name: "Réessayer" }))
    expect(
      await screen.findByRole("option", { name: "Ada Lovelace" })
    ).toBeVisible()
    expect(rechercher).toHaveBeenCalledTimes(2)
    expect(document.activeElement).toBe(screen.getByRole("combobox"))
  })

  it("après un échec, Entrée dans le champ relance la même recherche", async () => {
    const user = utilisateur()
    const rechercher = vi.fn(async (): Promise<Personne[]> => {
      throw new Error("réseau")
    })
    render(<Demo rechercher={rechercher} onErreur={() => {}} />)
    const champ = screen.getByRole("combobox")
    await user.click(champ)
    await user.type(champ, "gra")
    await avancer(300)
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La recherche a échoué. Entrée pour réessayer."
      )
    )
    const appels = rechercher.mock.calls.length

    // Même texte, nouvel échec : la recherche repart quand même.
    await user.keyboard("{Enter}")
    await waitFor(() => expect(rechercher).toHaveBeenCalledTimes(appels + 1))
    expect(rechercher).toHaveBeenLastCalledWith("gra", expect.any(AbortSignal))
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La recherche a échoué."
      )
    )

    rechercher.mockImplementation(async () => [PERSONNES[2]])
    await user.keyboard("{Enter}")
    expect(
      await screen.findByRole("option", { name: "Grace Hopper" })
    ).toBeVisible()
    expect(champ).toHaveValue("gra")
    expect(document.activeElement).toBe(champ)
  })

  it("Entrée ou Tab pendant la recherche n'effacent pas le texte saisi", async () => {
    const user = utilisateur()
    const rechercher = vi.fn(
      (texte: string) =>
        new Promise<Personne[]>((resolve) => {
          if (texte === "") resolve(PERSONNES)
        })
    )
    render(<Demo rechercher={rechercher} />)
    const champ = screen.getByRole("combobox")
    await user.click(champ)
    await user.type(champ, "gra")
    await user.keyboard("{Enter}")
    await avancer(500)
    expect(champ).toHaveValue("gra")

    await user.click(champ)
    expect(champ).toHaveValue("gra")
    await user.type(champ, "c")
    await user.tab()
    await avancer(500)
    expect(champ).toHaveValue("grac")

    // Rouverte, la recherche reprend sur le texte gardé.
    await user.click(champ)
    await avancer(300)
    expect(rechercher).toHaveBeenLastCalledWith("grac", expect.any(AbortSignal))
  })

  it("relaie form à l'entrée cachée qui porte la valeur, hors du formulaire", () => {
    render(
      <>
        <form id="inscription" aria-label="Inscription" />
        <Demo
          rechercher={chercherDans(PERSONNES)}
          name="parrain"
          form="inscription"
          initiale={PERSONNES[0]}
        />
      </>
    )
    const formulaire = screen.getByRole("form", {
      name: "Inscription",
    }) as HTMLFormElement
    expect(new FormData(formulaire).get("parrain")).toBe("1")
  })

  it("une exception levée avant la promesse est un échec comme un autre", async () => {
    const user = utilisateur()
    const console = vi.spyOn(globalThis.console, "error").mockReturnValue()
    render(
      <Demo
        rechercher={() => {
          throw new Error("synchrone")
        }}
      />
    )
    await user.click(screen.getByRole("combobox"))
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La recherche a échoué."
      )
    )
    // Sans `onErreur`, l'erreur part dans la console.
    expect(console).toHaveBeenCalledWith(
      "SearchSelect : la recherche a échoué.",
      new Error("synchrone")
    )
    console.mockRestore()
  })

  it("montre le chargement, et ignore une réponse périmée", async () => {
    const user = utilisateur()
    const reponses: Record<string, (r: Personne[]) => void> = {}
    const rechercher = vi.fn(
      (texte: string) =>
        new Promise<Personne[]>((resolve) => {
          reponses[texte] = resolve
        })
    )
    render(<Demo rechercher={rechercher} />)

    await user.click(screen.getByRole("combobox"))
    expect(await screen.findByText("Recherche…")).toBeVisible()
    await waitFor(() => expect(reponses[""]).toBeDefined())

    await user.type(screen.getByRole("combobox"), "gr")
    await avancer(300)
    await waitFor(() => expect(reponses["gr"]).toBeDefined())
    await act(async () => {
      reponses["gr"]([PERSONNES[2]])
      // La réponse à la recherche vide arrive après : elle est ignorée.
      reponses[""](PERSONNES)
    })
    expect(
      await screen.findByRole("option", { name: "Grace Hopper" })
    ).toBeVisible()
    expect(screen.queryByRole("option", { name: "Ada Lovelace" })).toBeNull()
  })

  it("relaie au champ ref, onBlur et les autres attributs", async () => {
    const user = utilisateur()
    const ref = createRef<HTMLInputElement>()
    const onBlur = vi.fn()
    render(
      <Demo
        rechercher={chercherDans(PERSONNES)}
        ref={ref}
        onBlur={onBlur}
        autoComplete="new-password"
        data-1p-ignore="true"
        name="parrain"
        initiale={PERSONNES[0]}
      />
    )
    const champ = screen.getByRole("combobox")
    expect(ref.current).toBe(champ)
    expect(champ).toHaveAttribute("autocomplete", "new-password")
    expect(champ).toHaveAttribute("data-1p-ignore", "true")
    await user.click(champ)
    await user.tab()
    expect(onBlur).toHaveBeenCalled()
    // `name` soumet l'identifiant, pas le libellé.
    expect(
      document.querySelector<HTMLInputElement>("input[name=parrain]")?.value
    ).toBe("1")
  })
})
