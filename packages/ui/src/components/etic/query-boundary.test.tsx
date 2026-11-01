import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  EmptyState,
  Loading,
  QueryBoundary,
  QueryErrorBanner,
  type QueryBoundaryRequete,
} from "@etic-ui/index"

const requete = <T,>(
  etat: Partial<QueryBoundaryRequete<T>>
): QueryBoundaryRequete<T> => ({
  data: undefined,
  error: null,
  isError: false,
  isLoading: false,
  ...etat,
})

describe("QueryBoundary", () => {
  it("affiche un squelette, avec un statut « Chargement… », pendant le chargement", () => {
    render(
      <QueryBoundary requete={requete({ isLoading: true })}>
        {() => "données"}
      </QueryBoundary>
    )
    expect(screen.getByRole("status")).toHaveTextContent("Chargement…")
    expect(screen.queryByText("données")).not.toBeInTheDocument()
  })

  it("prend le squelette fourni, et le force pour une requête en attente", () => {
    render(
      <QueryBoundary
        requete={requete({ data: [1] })}
        enAttente
        squelette={<Loading libelle="Recherche…" />}
      >
        {() => "données"}
      </QueryBoundary>
    )
    expect(screen.getByRole("status")).toHaveTextContent("Recherche…")
  })

  it("affiche l'erreur avec « Réessayer »", async () => {
    const refetch = vi.fn()
    render(
      <QueryBoundary
        requete={requete({
          isError: true,
          error: new Error("Serveur injoignable"),
          refetch,
        })}
      >
        {() => "données"}
      </QueryBoundary>
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Serveur injoignable")
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it("garde les données sous l'erreur d'une nouvelle tentative en arrière-plan", () => {
    const erreur = { isError: true, error: new Error("Hors ligne") }
    const { rerender } = render(
      <QueryBoundary
        requete={requete({ data: ["Bureau"], ...erreur, refetch: () => {} })}
      >
        {(groupes) => <p>{groupes.join(", ")}</p>}
      </QueryBoundary>
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Hors ligne")
    expect(screen.getByText("Bureau")).toBeInTheDocument()

    // Nouvel essai en cours : les données restent, sans squelette, et le
    // bandeau aussi, son bouton occupé.
    rerender(
      <QueryBoundary
        requete={requete({
          data: ["Bureau"],
          ...erreur,
          isFetching: true,
          refetch: () => {},
        })}
      >
        {(groupes) => <p>{groupes.join(", ")}</p>}
      </QueryBoundary>
    )
    expect(screen.getByRole("button", { name: "Réessayer" })).toHaveAttribute(
      "aria-busy",
      "true"
    )
    expect(screen.queryByText("Chargement…")).toBeNull()
    expect(screen.getByText("Bureau")).toBeInTheDocument()
  })

  it("ne remonte pas le contenu quand une actualisation échoue, puis réussit", () => {
    let montages = 0
    function Contenu() {
      // Un état local (saisie, sélection) qui doit survivre.
      useEffect(() => {
        montages++
      }, [])
      return <p>Bureau</p>
    }
    const rendu = (etat: Partial<QueryBoundaryRequete<string[]>>) => (
      <QueryBoundary requete={requete({ data: ["Bureau"], ...etat })}>
        {() => <Contenu />}
      </QueryBoundary>
    )
    const { rerender } = render(rendu({}))
    rerender(rendu({ isError: true, error: new Error("Hors ligne") }))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    rerender(rendu({}))
    expect(screen.queryByRole("alert")).toBeNull()
    expect(montages).toBe(1)
  })

  it("ne rend aucune enveloppe : le contenu reste enfant direct du parent (grille…)", () => {
    const rendu = (etat: Partial<QueryBoundaryRequete<string[]>>) => (
      <div data-testid="grille" className="grid grid-cols-2">
        <QueryBoundary requete={requete({ data: ["a", "b"], ...etat })}>
          {(lettres) => lettres.map((l) => <p key={l}>{l}</p>)}
        </QueryBoundary>
      </div>
    )
    const { rerender } = render(rendu({}))
    const grille = screen.getByTestId("grille")
    const [a, b] = Array.from(grille.children)
    expect(Array.from(grille.children).map((e) => e.tagName)).toEqual([
      "P",
      "P",
    ])

    // L'erreur arrive en sœur, avant les mêmes éléments, non remontés.
    rerender(rendu({ isError: true, error: new Error("Hors ligne") }))
    expect(grille.children).toHaveLength(3)
    expect(grille.children[0]).toBe(screen.getByRole("alert"))
    expect(grille.children[1]).toBe(a)
    expect(grille.children[2]).toBe(b)
  })

  it("après « Réessayer », garde le bandeau et le focus sur son bouton pendant la nouvelle tentative", async () => {
    const erreur = {
      isError: true,
      error: new Error("Serveur injoignable"),
      refetch: () => {},
    }
    const { rerender } = render(
      <QueryBoundary requete={requete(erreur)}>{() => "données"}</QueryBoundary>
    )
    const bouton = screen.getByRole("button", { name: "Réessayer" })
    await userEvent.click(bouton)
    rerender(
      <QueryBoundary requete={requete({ ...erreur, isFetching: true })}>
        {() => "données"}
      </QueryBoundary>
    )
    expect(screen.getByRole("button", { name: "Réessayer" })).toBe(bouton)
    expect(bouton).toHaveAttribute("aria-busy", "true")
    expect(bouton).toHaveAttribute("aria-disabled", "true")
    expect(document.activeElement).toBe(bouton)

    // Nouvel échec : le bouton est de nouveau actif, toujours focalisé.
    rerender(
      <QueryBoundary requete={requete(erreur)}>{() => "données"}</QueryBoundary>
    )
    expect(bouton).not.toHaveAttribute("aria-busy")
    expect(document.activeElement).toBe(bouton)
  })

  it("affiche l'état vide : un titre, ou le nœud fourni", () => {
    const { rerender } = render(
      <QueryBoundary requete={requete({ data: [] })} vide="Aucun groupe.">
        {() => "données"}
      </QueryBoundary>
    )
    expect(screen.getByText("Aucun groupe.")).toBeInTheDocument()

    rerender(
      <QueryBoundary
        requete={requete({ data: { items: [] } })}
        vide={<EmptyState titre="Rien ici" action={<button>Créer</button>} />}
      >
        {() => "données"}
      </QueryBoundary>
    )
    expect(screen.getByText("Rien ici")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument()
  })

  it("sans `vide`, rend les données même vides ; `estVide` est personnalisable", () => {
    const { rerender } = render(
      <QueryBoundary requete={requete({ data: [] as number[] })}>
        {(d) => `${d.length} élément`}
      </QueryBoundary>
    )
    expect(screen.getByText("0 élément")).toBeInTheDocument()

    rerender(
      <QueryBoundary
        requete={requete({ data: { total: 0 } })}
        vide="Vide"
        estVide={(d) => d.total === 0}
      >
        {() => "données"}
      </QueryBoundary>
    )
    expect(screen.getByText("Vide")).toBeInTheDocument()
  })

  it("accepte tel quel le résultat de useQuery", async () => {
    let echec = true
    function Liste() {
      const requete = useQuery({
        queryKey: ["groupes"],
        queryFn: async () => {
          if (echec) throw new Error("Hors ligne")
          return ["Bureau", "Trésorerie"]
        },
        retry: false,
      })
      return (
        <QueryBoundary requete={requete} vide="Aucun groupe.">
          {(groupes) => <p>{groupes.join(", ")}</p>}
        </QueryBoundary>
      )
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Liste />
      </QueryClientProvider>
    )
    expect(await screen.findByRole("alert")).toHaveTextContent("Hors ligne")
    echec = false
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }))
    await waitFor(() =>
      expect(screen.getByText("Bureau, Trésorerie")).toBeInTheDocument()
    )
  })

  describe("introuvable", () => {
    const erreur404 = Object.assign(new Error("Introuvable"), { status: 404 })
    const erreur500 = Object.assign(new Error("Panne"), { status: 500 })

    it("affiche « introuvable » pour un 404, sans bandeau ni « Réessayer »", () => {
      render(
        <QueryBoundary
          requete={requete({
            isError: true,
            error: erreur404,
            refetch: () => {},
          })}
          introuvable="Groupe introuvable."
        >
          {() => "données"}
        </QueryBoundary>
      )
      expect(screen.getByText("Groupe introuvable.")).toBeInTheDocument()
      expect(screen.queryByRole("alert")).toBeNull()
      expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull()
    })

    it("rend tel quel un nœud (avec un lien de retour…)", () => {
      render(
        <QueryBoundary
          requete={requete({ isError: true, error: erreur404 })}
          introuvable={<a href="/groupes">Retour aux groupes</a>}
        >
          {() => "données"}
        </QueryBoundary>
      )
      expect(
        screen.getByRole("link", { name: "Retour aux groupes" })
      ).toBeInTheDocument()
    })

    it("n'annonce jamais une panne comme « introuvable »", () => {
      render(
        <QueryBoundary
          requete={requete({
            isError: true,
            error: erreur500,
            refetch: () => {},
          })}
          introuvable="Groupe introuvable."
        >
          {() => "données"}
        </QueryBoundary>
      )
      expect(screen.getByRole("alert")).toHaveTextContent("Panne")
      expect(screen.getByRole("button", { name: "Réessayer" })).toBeVisible()
      expect(screen.queryByText("Groupe introuvable.")).toBeNull()
    })

    it("sans `introuvable`, un 404 reste une erreur comme une autre", () => {
      render(
        <QueryBoundary requete={requete({ isError: true, error: erreur404 })}>
          {() => "données"}
        </QueryBoundary>
      )
      expect(screen.getByRole("alert")).toHaveTextContent("Introuvable")
    })

    it.each([null, false])(
      "`introuvable={%s}` vaut « non fourni » : le bandeau habituel",
      (valeur) => {
        render(
          <QueryBoundary
            requete={requete({
              isError: true,
              error: erreur404,
              refetch: () => {},
            })}
            introuvable={valeur}
          >
            {() => "données"}
          </QueryBoundary>
        )
        expect(screen.getByRole("alert")).toHaveTextContent("Introuvable")
        expect(
          screen.getByRole("button", { name: "Réessayer" })
        ).toBeInTheDocument()
      }
    )

    it("prend la place du contenu, en sœur dans le parent, puis rend la main aux données", () => {
      let montages = 0
      function Fiche() {
        const [saisie, setSaisie] = useState("")
        useEffect(() => {
          montages++
        }, [])
        return (
          <input
            aria-label="Nom"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
          />
        )
      }
      const rendu = (etat: Partial<QueryBoundaryRequete<string>>) => (
        <div data-testid="grille">
          <QueryBoundary
            requete={requete(etat)}
            introuvable={<p>Groupe introuvable.</p>}
          >
            {() => <Fiche />}
          </QueryBoundary>
        </div>
      )
      const { rerender } = render(rendu({ isError: true, error: erreur404 }))
      const grille = screen.getByTestId("grille")
      expect(grille.children).toHaveLength(1)
      expect(grille.firstElementChild).toHaveTextContent("Groupe introuvable.")

      rerender(rendu({ data: "Bureau" }))
      fireEvent.change(screen.getByRole("textbox", { name: "Nom" }), {
        target: { value: "Bureau 2" },
      })
      // Une actualisation qui échoue ensuite (500) garde la fiche montée.
      rerender(rendu({ data: "Bureau", isError: true, error: erreur500 }))
      expect(screen.getByRole("textbox", { name: "Nom" })).toHaveValue(
        "Bureau 2"
      )
      expect(montages).toBe(1)
    })

    it("lit le statut par la forme de l'erreur, pas par sa classe", () => {
      const { rerender } = render(
        <QueryBoundary
          requete={requete({
            isError: true,
            error: { status: 404, message: "Absent" },
          })}
          introuvable="Absent."
        >
          {() => "données"}
        </QueryBoundary>
      )
      expect(screen.getByText("Absent.")).toBeInTheDocument()

      // Une chaîne « 404 » n'est pas un statut.
      rerender(
        <QueryBoundary
          requete={requete({ isError: true, error: "404" })}
          introuvable="Absent."
        >
          {() => "données"}
        </QueryBoundary>
      )
      expect(screen.getByRole("alert")).toHaveTextContent("404")
    })
  })
})

describe("QueryErrorBanner", () => {
  it("ne rend rien tant que la requête n'a pas échoué", () => {
    const { container } = render(
      <QueryErrorBanner requete={{ isError: false, error: null }} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("affiche l'échec avec « Réessayer », occupé pendant la tentative", async () => {
    const refetch = vi.fn()
    const { rerender } = render(
      <QueryErrorBanner
        requete={{ isError: true, error: new Error("Hors ligne"), refetch }}
        description="Les groupes n'ont pas pu être chargés."
      />
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Hors ligne")
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Les groupes n'ont pas pu être chargés."
    )
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }))
    expect(refetch).toHaveBeenCalledOnce()
    rerender(
      <QueryErrorBanner
        requete={{
          isError: true,
          error: new Error("Hors ligne"),
          isFetching: true,
          refetch,
        }}
      />
    )
    expect(screen.getByRole("button", { name: "Réessayer" })).toHaveAttribute(
      "aria-busy",
      "true"
    )
  })
})
