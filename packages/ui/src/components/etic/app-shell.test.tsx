/// <reference types="node" />
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { ComponentProps } from "react"
import userEvent from "@testing-library/user-event"
import { UsersIcon } from "lucide-react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  AppShell,
  ThemeMenu,
  TooltipProvider,
  type AppShellProps,
} from "@etic-ui/index"

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
  const onSeDeconnecter = vi.fn()
  const onValeurChange = vi.fn()
  const onChoisir = vi.fn()
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
        entrees: [
          { libelle: "Mon profil", href: "/profile" },
          { libelle: "Raccourcis", onChoisir },
        ],
        onSeDeconnecter,
      }}
      theme={{ valeur: "dark", onValeurChange }}
      lien={LienRouteur}
      {...props}
    >
      <h1>Contenu</h1>
      <input aria-label="Éditeur" />
    </AppShell>
  )
  return { onSeDeconnecter, onValeurChange, onChoisir }
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

  it("sur ordinateur, se replie aussi par un bouton visible de l'en-tête", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    rendre()
    const colonne = () =>
      document.querySelector("[data-slot=sidebar][data-state]")

    const replier = screen.getByRole("button", { name: "Replier le menu" })
    expect(replier).toHaveAttribute("aria-keyshortcuts", "Control+B Meta+B")
    await user.click(replier)
    expect(colonne()).toHaveAttribute("data-state", "collapsed")
    const deplier = screen.getByRole("button", { name: "Déplier le menu" })
    expect(document.activeElement).toBe(deplier)
    await user.click(deplier)
    expect(colonne()).toHaveAttribute("data-state", "expanded")
    document.cookie = "sidebar_state=; max-age=0"
  })

  it("ignore Ctrl+B dans un champ de saisie (gras d'un éditeur)", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    rendre()
    const colonne = () =>
      document.querySelector("[data-slot=sidebar][data-state]")

    await user.click(screen.getByRole("textbox", { name: "Éditeur" }))
    await user.keyboard("{Control>}b{/Control}")
    expect(colonne()).toHaveAttribute("data-state", "expanded")
  })

  it("ouvre la tabulation par un lien d'évitement vers le contenu", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    rendre()

    await user.tab()
    const evitement = screen.getByRole("link", { name: "Aller au contenu" })
    expect(document.activeElement).toBe(evitement)
    await user.keyboard("{Enter}")
    expect(document.activeElement).toBe(screen.getByRole("main"))
  })

  it("demande confirmation avant de déconnecter", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    const { onSeDeconnecter } = rendre()

    await user.click(screen.getByRole("button", { name: /menu du compte/ }))
    expect(
      await screen.findByRole("menuitem", { name: "Mon profil" })
    ).toHaveAttribute("href", "/profile")
    await user.click(screen.getByRole("menuitem", { name: "Se déconnecter" }))
    expect(onSeDeconnecter).not.toHaveBeenCalled()

    const dialogue = await screen.findByRole("alertdialog")
    const valider = within(dialogue).getByRole("button", {
      name: "Se déconnecter",
    })
    // Quitter la session est destructif : validation en rouge, comme
    // ConfirmDialog.
    expect(valider).toHaveClass("text-destructive")
    await user.click(valider)
    expect(onSeDeconnecter).toHaveBeenCalledOnce()
  })

  it("lance l'action d'une entrée du menu du compte", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    const { onChoisir } = rendre()

    await user.click(screen.getByRole("button", { name: /menu du compte/ }))
    await user.click(
      await screen.findByRole("menuitem", { name: "Raccourcis" })
    )
    expect(onChoisir).toHaveBeenCalledOnce()
  })

  it("montre le thème choisi et enregistre un nouveau choix", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    const { onValeurChange } = rendre()

    // Espace insécable avant « : » dans le nom.
    await user.click(screen.getByRole("button", { name: /^Thème\s:\sSombre$/ }))
    expect(
      await screen.findByRole("menuitemradio", { name: "Sombre" })
    ).toHaveAttribute("aria-checked", "true")
    await user.click(screen.getByRole("menuitemradio", { name: "Clair" }))
    expect(onValeurChange).toHaveBeenCalledWith("light")
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
  })

  it("signale un thème non enregistré", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    rendre({
      theme: {
        valeur: "system",
        onValeurChange: () => Promise.reject(new Error()),
      },
    })

    await user.click(
      screen.getByRole("button", { name: /^Thème\s:\sSystème$/ })
    )
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Sombre" })
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Thème non enregistré"
    )
  })

  it("sur mobile seulement, réserve la hauteur de la barre collante aux ancres", () => {
    // jsdom n'applique pas styles.css : on vérifie que la règle vise la
    // barre et reprend sa hauteur (h-12 = 12 × --spacing), plus une marge.
    const css = readFileSync(
      resolve(import.meta.dirname, "../../styles.css"),
      "utf8"
    )
    expect(css).toMatch(
      /html:has\(\[data-slot="app-shell-mobile-bar"\]\) \{\s*scroll-padding-top: calc\(var\(--spacing\) \* 12 \+/
    )

    simulerLargeur(true)
    rendre()
    const barre = document.querySelector('[data-slot="app-shell-mobile-bar"]')
    expect(barre).toHaveClass("sticky", "top-0", "h-12")
    cleanup()

    simulerLargeur(false)
    rendre()
    expect(
      document.querySelector('[data-slot="app-shell-mobile-bar"]')
    ).toBeNull()
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

describe("ThemeMenu", () => {
  it("seul, efface « Thème non enregistré » au bout de quelques secondes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TooltipProvider>
          <ThemeMenu
            valeur="light"
            onValeurChange={() => Promise.reject(new Error())}
          />
        </TooltipProvider>
      )
      await user.click(
        screen.getByRole("button", { name: /^Thème\s:\sClair$/ })
      )
      await user.click(
        await screen.findByRole("menuitemradio", { name: "Sombre" })
      )
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Thème non enregistré"
      )
      vi.advanceTimersByTime(5000)
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
    } finally {
      vi.useRealTimers()
    }
  })
})
