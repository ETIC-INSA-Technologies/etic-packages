import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query"
import { useEffect } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  EmptyState,
  Loading,
  QueryBoundary,
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
})
