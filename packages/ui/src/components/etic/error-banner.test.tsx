import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ErrorBanner, ErrorBoundary } from "@etic-ui/index"

describe("ErrorBanner", () => {
  it("ne rend rien sans erreur", () => {
    const { container } = render(<ErrorBanner erreur={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("lit le message, le code et le détail d'une erreur de forme inconnue", async () => {
    render(
      <ErrorBanner
        erreur={{
          message: "Requête invalide",
          code: "VALIDATION",
          details: { champ: "email" },
        }}
      />
    )
    const alerte = screen.getByRole("alert")
    expect(alerte).toHaveTextContent(/VALIDATION\s:\sRequête invalide/)
    // Détail replié, puis dévoilé.
    expect(screen.queryByText(/"champ"/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Détails" }))
    expect(screen.getByText(/"champ": "email"/)).toBeVisible()
  })

  it("accepte une Error, une chaîne, et omet un détail vide", () => {
    const { rerender } = render(
      <ErrorBanner erreur={new Error("Panne réseau")} />
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Panne réseau")
    rerender(<ErrorBanner erreur="Accès refusé" detail={{}} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Accès refusé")
    expect(
      screen.queryByRole("button", { name: "Détails" })
    ).not.toBeInTheDocument()
  })

  it("propose « Réessayer », occupé pendant la nouvelle tentative", async () => {
    const onReessayer = vi.fn()
    const { rerender } = render(
      <ErrorBanner erreur="Échec" onReessayer={onReessayer} />
    )
    const bouton = screen.getByRole("button", { name: "Réessayer" })
    await userEvent.click(bouton)
    expect(onReessayer).toHaveBeenCalledOnce()
    rerender(<ErrorBanner erreur="Échec" onReessayer={onReessayer} enCours />)
    expect(bouton).toHaveAttribute("aria-busy", "true")
    expect(document.activeElement).toBe(bouton)
    await userEvent.click(bouton)
    expect(onReessayer).toHaveBeenCalledOnce()
  })

  it("affiche un détail circulaire ou contenant un BigInt sans planter", async () => {
    const circulaire: Record<string, unknown> = { nom: "boucle" }
    circulaire.soi = circulaire
    const { rerender } = render(
      <ErrorBanner erreur={{ message: "Échec", details: circulaire }} />
    )
    await userEvent.click(screen.getByRole("button", { name: "Détails" }))
    expect(screen.getByText(/référence circulaire/)).toBeInTheDocument()

    rerender(
      <ErrorBanner erreur={{ message: "Échec", details: { taille: 12n } }} />
    )
    expect(screen.getByText(/"taille": "12n"/)).toBeInTheDocument()
  })

  it("sans message, dit quoi faire", () => {
    render(<ErrorBanner erreur={{ code: "INCONNU" }} />)
    expect(screen.getByRole("alert")).toHaveTextContent(/Réessayez/)
  })
})

function Bombe({ exploser }: { exploser: boolean }) {
  if (exploser) throw new Error("Rendu impossible")
  return <p>Contenu</p>
}

describe("ErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks())

  it("remplace la page blanche par un message, le détail replié et des issues", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const onErreur = vi.fn()
    render(
      <ErrorBoundary portee="la page" onErreur={onErreur} accueil="/accueil">
        <Bombe exploser />
      </ErrorBoundary>
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Une erreur inattendue s'est produite dans la page."
    )
    expect(onErreur).toHaveBeenCalledOnce()
    await userEvent.click(
      screen.getByRole("button", { name: "Détails techniques" })
    )
    expect(screen.getByText(/Rendu impossible/)).toBeVisible()
    const accueil = screen.getByRole("link", { name: "Retour à l'accueil" })
    expect(accueil).toHaveAttribute("href", "/accueil")
    // Hors de la description, dont les liens sont soulignés : il a
    // l'allure d'un bouton.
    expect(accueil.closest('[data-slot="alert-description"]')).toBeNull()
  })

  it("met le focus sur le message quand l'élément focalisé a cassé", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    function Page() {
      const [casse, setCasse] = useState(false)
      return (
        <ErrorBoundary>
          <button onClick={() => setCasse(true)}>Casser</button>
          <Bombe exploser={casse} />
        </ErrorBoundary>
      )
    }
    render(<Page />)
    await userEvent.click(screen.getByRole("button", { name: "Casser" }))
    const alerte = screen.getByRole("alert")
    await waitFor(() => expect(document.activeElement).toBe(alerte))
  })

  it("met le focus sur le message d'une limite montée en erreur, et après un « Réessayer » qui échoue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    function Demo() {
      const [casse, setCasse] = useState(false)
      // Le bouton est remplacé par la limite, déjà en erreur à son montage.
      return casse ? (
        <ErrorBoundary>
          <Bombe exploser />
        </ErrorBoundary>
      ) : (
        <button onClick={() => setCasse(true)}>Provoquer</button>
      )
    }
    render(<Demo />)
    await userEvent.click(screen.getByRole("button", { name: "Provoquer" }))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("alert"))
    )

    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("alert"))
    )
  })

  it("ne déplace pas le focus resté ailleurs dans la page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    function Page({ casse }: { casse: boolean }) {
      return (
        <>
          <input aria-label="Recherche" />
          <ErrorBoundary>
            <Bombe exploser={casse} />
          </ErrorBoundary>
        </>
      )
    }
    const { rerender } = render(<Page casse={false} />)
    const recherche = screen.getByRole("textbox", { name: "Recherche" })
    recherche.focus()
    rerender(<Page casse />)
    expect(document.activeElement).toBe(recherche)
  })

  it("se réinitialise quand sa clé change, ou par « Réessayer »", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    function Page() {
      const [chemin, setChemin] = useState("/a")
      const [casse, setCasse] = useState(true)
      return (
        <>
          <button onClick={() => setChemin("/b")}>Naviguer</button>
          <button onClick={() => setCasse(false)}>Réparer</button>
          <ErrorBoundary cleReinitialisation={chemin}>
            <Bombe exploser={casse && chemin === "/a"} />
          </ErrorBoundary>
        </>
      )
    }
    render(<Page />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Naviguer" }))
    expect(screen.getByText("Contenu")).toBeInTheDocument()

    render(
      <ErrorBoundary>
        <Bombe exploser />
      </ErrorBoundary>
    )
    // « Réessayer » relance le rendu, qui échoue encore ici : le message
    // revient, sans boucle.
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }))
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("accepte un affichage de secours", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    render(
      <ErrorBoundary secours={(erreur) => <p>Oups : {erreur.message}</p>}>
        <Bombe exploser />
      </ErrorBoundary>
    )
    expect(screen.getByText("Oups : Rendu impossible")).toBeInTheDocument()
  })
})
