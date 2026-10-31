import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import type { ComponentProps } from "react"
import userEvent from "@testing-library/user-event"
import { UsersIcon } from "lucide-react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AppShell, type AppShellProps } from "@etic-ui/index"

function simulerLargeur(mobile: boolean) {
  vi.stubGlobal("matchMedia", (requete: string) => ({
    matches: mobile && requete.includes("width <"),
    media: requete,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

/** Lien de routeur factice : jsdom ne sait pas naviguer. */
function LienRouteur(props: ComponentProps<"a">) {
  return (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault()
        props.onClick?.(event)
      }}
    />
  )
}

function rendre(props: Partial<AppShellProps> = {}) {
  const seDeconnecter = vi.fn()
  const changer = vi.fn()
  render(
    <AppShell
      application={{ nom: "ETIC Members", sousTitre: "Administration" }}
      sections={[
        {
          titre: "Membres",
          liens: [
            {
              libelle: "Comptes membres",
              href: "/members",
              icone: UsersIcon,
              actif: true,
            },
            { libelle: "Comptes fonctionnels", href: "/functional-accounts" },
          ],
        },
      ]}
      compte={{
        nom: "Ada Lovelace",
        initiales: "AL",
        entrees: [{ libelle: "Mon profil", href: "/profile" }],
        seDeconnecter,
      }}
      theme={{ valeur: "dark", changer }}
      lien={LienRouteur}
      {...props}
    >
      <h1>Contenu</h1>
    </AppShell>
  )
  return { seDeconnecter, changer }
}

describe("AppShell", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("affiche la navigation par rubriques, le lien actif et le contenu", () => {
    simulerLargeur(false)
    rendre()

    const nav = screen.getByRole("navigation", {
      name: "Navigation principale",
    })
    expect(nav).toHaveTextContent("Membres")
    expect(
      screen.getByRole("link", { name: "Comptes membres" })
    ).toHaveAttribute("aria-current", "page")
    expect(
      screen.getByRole("link", { name: "Comptes fonctionnels" })
    ).not.toHaveAttribute("aria-current")
    expect(screen.getByRole("heading", { name: "Contenu" })).toBeInTheDocument()
    // Pas de barre du haut sur ordinateur.
    expect(screen.queryByRole("button", { name: "Ouvrir le menu" })).toBeNull()
  })

  it("se replie en icônes et retrouve ce repli à la visite suivante", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    rendre()
    const colonne = () =>
      document.querySelector("[data-slot=sidebar][data-state]")

    expect(colonne()).toHaveAttribute("data-state", "expanded")
    await user.keyboard("{Control>}b{/Control}")
    expect(colonne()).toHaveAttribute("data-state", "collapsed")
    expect(document.cookie).toContain("sidebar_state=false")

    cleanup()
    rendre()
    expect(colonne()).toHaveAttribute("data-state", "collapsed")
    document.cookie = "sidebar_state=; max-age=0"
  })

  it("demande confirmation avant de déconnecter", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    const { seDeconnecter } = rendre()

    await user.click(screen.getByRole("button", { name: /menu du compte/ }))
    expect(
      await screen.findByRole("menuitem", { name: "Mon profil" })
    ).toHaveAttribute("href", "/profile")
    await user.click(screen.getByRole("menuitem", { name: "Se déconnecter" }))
    expect(seDeconnecter).not.toHaveBeenCalled()

    const dialogue = await screen.findByRole("alertdialog")
    await user.click(
      within(dialogue).getByRole("button", { name: "Se déconnecter" })
    )
    expect(seDeconnecter).toHaveBeenCalledOnce()
  })

  it("montre le thème choisi et enregistre un nouveau choix", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    const { changer } = rendre()

    await user.click(screen.getByRole("button", { name: "Thème : Sombre" }))
    expect(
      await screen.findByRole("menuitemradio", { name: "Sombre" })
    ).toHaveAttribute("aria-checked", "true")
    await user.click(screen.getByRole("menuitemradio", { name: "Clair" }))
    expect(changer).toHaveBeenCalledWith("light")
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
  })

  it("signale un thème non enregistré", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    rendre({
      theme: { valeur: "system", changer: () => Promise.reject(new Error()) },
    })

    await user.click(screen.getByRole("button", { name: "Thème : Système" }))
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Sombre" })
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Thème non enregistré"
    )
  })

  it("sur mobile, ouvre la navigation en tiroir et la referme en naviguant", async () => {
    simulerLargeur(true)
    const user = userEvent.setup()
    rendre()

    expect(screen.queryByRole("navigation")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }))
    const lien = await screen.findByRole("link", {
      name: "Comptes fonctionnels",
    })
    await user.click(lien)
    await waitFor(() => expect(screen.queryByRole("navigation")).toBeNull())
  })
})
