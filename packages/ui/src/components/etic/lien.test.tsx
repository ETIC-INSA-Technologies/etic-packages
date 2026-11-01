import { render, screen, within } from "@testing-library/react"
import type { ComponentProps } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  AppShell,
  ButtonLink,
  DetailHeader,
  ErrorBoundary,
  LienProvider,
} from "@etic-ui/index"

/** Lien de routeur factice, reconnaissable. */
function LienRouteur(props: ComponentProps<"a">) {
  return <a data-routeur="" {...props} />
}

function AutreLien(props: ComponentProps<"a">) {
  return <a data-autre="" {...props} />
}

function Bombe(): never {
  throw new Error("Rendu impossible")
}

describe("LienProvider", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("donne le lien du routeur à AppShell, DetailHeader et ButtonLink", () => {
    vi.stubGlobal("matchMedia", (requete: string) => ({
      matches: false,
      media: requete,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(
      <LienProvider lien={LienRouteur}>
        <AppShell
          application={{ nom: "Members" }}
          sections={[{ liens: [{ libelle: "Groupes", href: "/groupes" }] }]}
        >
          <DetailHeader
            titre="Bureau"
            chemin={[{ libelle: "Tous les groupes", href: "/groupes" }]}
          />
          <ButtonLink href="/groupes/1">Voir la fiche</ButtonLink>
        </AppShell>
      </LienProvider>
    )
    const nav = screen.getByRole("navigation", {
      name: "Navigation principale",
    })
    expect(within(nav).getByRole("link", { name: "Groupes" })).toHaveAttribute(
      "data-routeur"
    )
    expect(
      screen.getByRole("link", { name: "Tous les groupes" })
    ).toHaveAttribute("data-routeur")
    const fiche = screen.getByRole("link", { name: "Voir la fiche" })
    expect(fiche).toHaveAttribute("data-routeur")
    expect(fiche).toHaveAttribute("data-slot", "button")
  })

  it("la prop lien reste prioritaire", () => {
    render(
      <LienProvider lien={LienRouteur}>
        <ButtonLink href="/a" lien={AutreLien}>
          Autre
        </ButtonLink>
        <ButtonLink href="/b" lien="a">
          Natif
        </ButtonLink>
        <DetailHeader
          titre="Bureau"
          chemin={[{ libelle: "Groupes", href: "/groupes" }]}
          lien={AutreLien}
        />
      </LienProvider>
    )
    expect(screen.getByRole("link", { name: "Autre" })).toHaveAttribute(
      "data-autre"
    )
    const natif = screen.getByRole("link", { name: "Natif" })
    expect(natif).not.toHaveAttribute("data-routeur")
    expect(natif).toHaveAttribute("href", "/b")
    expect(screen.getByRole("link", { name: "Groupes" })).toHaveAttribute(
      "data-autre"
    )
  })

  it("sans fournisseur, un <a>", () => {
    render(<ButtonLink href="/c">Simple</ButtonLink>)
    const lien = screen.getByRole("link", { name: "Simple" })
    expect(lien).not.toHaveAttribute("data-routeur")
    expect(lien).toHaveAttribute("href", "/c")
  })

  it("ErrorBoundary : « Retour à l'accueil » est un ButtonLink qui recharge la page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    render(
      <LienProvider lien={LienRouteur}>
        <ErrorBoundary onErreur={() => {}}>
          <Bombe />
        </ErrorBoundary>
      </LienProvider>
    )
    const accueil = screen.getByRole("link", { name: "Retour à l'accueil" })
    expect(accueil).toHaveAttribute("data-slot", "button")
    expect(accueil).toHaveAttribute("href", "/")
    // Rechargement complet voulu : pas le lien du routeur.
    expect(accueil).not.toHaveAttribute("data-routeur")
    vi.restoreAllMocks()
  })
})
