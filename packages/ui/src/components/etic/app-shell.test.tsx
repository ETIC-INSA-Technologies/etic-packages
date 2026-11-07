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

  it("logo de la marque : 32 px, ramené à 24 px centré dans la barre repliée", () => {
    simulerLargeur(false)
    rendre({
      application: {
        nom: "ETIC Members",
        logo: <svg data-testid="logo" />,
      },
    })
    // jsdom n'applique pas les styles : la taille se lit aux classes.
    expect(screen.getByTestId("logo").parentElement).toHaveClass(
      "size-8",
      "group-data-[collapsible=icon]:size-6",
      "group-data-[collapsible=icon]:mx-1"
    )
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

  it("le thème est une entrée du menu du compte : pas de second bouton dans le pied", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    const { onValeurChange } = rendre()
    expect(screen.queryByRole("button", { name: /^Thème\s:/ })).toBeNull()

    await user.click(screen.getByRole("button", { name: /menu du compte/ }))
    // Espace insécable avant « : » dans le nom.
    const entree = await screen.findByRole("menuitem", {
      name: /^Thème\s:\sSombre$/,
    })
    // Au clavier : jsdom laisse le menu parent en pointer-events: none
    // pendant que le sous-menu s'ouvre.
    entree.focus()
    await user.keyboard("{ArrowRight}")
    expect(
      await screen.findByRole("menuitemradio", { name: "Sombre" })
    ).toHaveAttribute("aria-checked", "true")
    await waitFor(() =>
      expect(screen.getByRole("menuitemradio", { name: "Clair" })).toHaveFocus()
    )
    await user.keyboard("{Enter}")
    expect(onValeurChange).toHaveBeenCalledWith("light")
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
  })

  it("signale un thème non enregistré, au-dessus du menu du compte", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    rendre({
      theme: {
        valeur: "system",
        onValeurChange: () => Promise.reject(new Error()),
      },
    })

    await user.click(screen.getByRole("button", { name: /menu du compte/ }))
    ;(
      await screen.findByRole("menuitem", { name: /^Thème\s:\sSystème$/ })
    ).focus()
    await user.keyboard("{ArrowRight}")
    const sombre = await screen.findByRole("menuitemradio", { name: "Sombre" })
    await waitFor(() =>
      expect(screen.getByRole("menuitemradio", { name: "Clair" })).toHaveFocus()
    )
    // Clair, Système, Sombre.
    await user.keyboard("{ArrowDown}{ArrowDown}")
    expect(sombre).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Thème non enregistré"
    )
  })

  it("sur mobile, les choix de thème sont dans le menu du compte, sans sous-menu", async () => {
    simulerLargeur(true)
    const user = userEvent.setup()
    const { onValeurChange } = rendre()

    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }))
    await user.click(
      await screen.findByRole("button", { name: /menu du compte/ })
    )
    expect(await screen.findByText("Thème de l'interface")).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: /^Thème\s:/ })).toBeNull()
    expect(
      screen.getByRole("menuitemradio", { name: "Sombre" })
    ).toHaveAttribute("aria-checked", "true")
    await user.click(screen.getByRole("menuitemradio", { name: "Clair" }))
    expect(onValeurChange).toHaveBeenCalledWith("light")
  })

  it("sans compte, le thème garde son propre bouton dans le pied", async () => {
    simulerLargeur(false)
    const user = userEvent.setup()
    const { onValeurChange } = rendre({ compte: undefined })

    await user.click(screen.getByRole("button", { name: /^Thème\s:\sSombre$/ }))
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Clair" })
    )
    expect(onValeurChange).toHaveBeenCalledWith("light")
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

  it("sur mobile, le bouton du menu n'a qu'un nom, et dit s'il est ouvert", () => {
    simulerLargeur(true)
    rendre()
    const bouton = screen.getByRole("button", { name: "Ouvrir le menu" })
    // Le texte lu est le nom : aucun second texte, masqué, qui divergerait.
    expect(bouton).toHaveTextContent(/^Ouvrir le menu$/)
    expect(bouton).toHaveAttribute("aria-expanded", "false")
  })

  it("peint le contenu et la barre mobile sur le fond de page (bg-page)", () => {
    simulerLargeur(true)
    rendre()
    const contenu = screen.getByRole("main")
    expect(contenu).toHaveClass("bg-page")
    expect(contenu).not.toHaveClass("bg-background")
    const barre = document.querySelector('[data-slot="app-shell-mobile-bar"]')
    expect(barre).toHaveClass("bg-page")
    expect(barre).not.toHaveClass("bg-background")
  })

  it("pied de barre : compte sans contour, avatar carré arrondi", () => {
    rendre()
    const boutonCompte = screen.getByRole("button", { name: /menu du compte/ })
    expect(boutonCompte).toHaveClass("rounded-lg")
    expect(boutonCompte).not.toHaveClass("rounded-md")
    // Comme le nav-user de shadcn : le survol seul, sans contour.
    expect(boutonCompte.className).not.toMatch(/shadow-\[0_0_0_1px/)
    const avatar = boutonCompte.querySelector('[data-slot="avatar"]')
    expect(avatar).toHaveClass("rounded-lg", "after:rounded-lg")
    expect(avatar).not.toHaveClass("rounded-full")
  })

  it("sans compte, le bouton de thème est sur le fond de la barre", () => {
    rendre({ compte: undefined })
    const theme = screen.getByRole("button", { name: /^Thème\s:/ })
    // Le fond de l'outline en sombre (dark:bg-input/30) tranchait sur la barre.
    expect(theme).toHaveClass("bg-sidebar", "dark:bg-sidebar")
    expect(theme).not.toHaveClass("dark:bg-input/30")
  })

  it("rend le bandeau dans le contenu, avant la page", () => {
    simulerLargeur(false)
    rendre({ bandeau: <p role="alert">Reprise impossible</p> })
    const bandeau = screen.getByRole("alert")
    expect(screen.getByRole("main")).toContainElement(bandeau)
    expect(
      bandeau.compareDocumentPosition(
        screen.getByRole("heading", { name: "Contenu" })
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("sans bandeau, son enveloppe est vide et masquée (empty:hidden)", () => {
    simulerLargeur(false)
    rendre({ bandeau: null })
    const enveloppe = document.querySelector('[data-slot="app-shell-bandeau"]')
    expect(enveloppe).toBeEmptyDOMElement()
    expect(enveloppe).toHaveClass("empty:hidden")
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

describe("AppShell, pastille d'une entrée", () => {
  afterEach(() => vi.unstubAllGlobals())

  const avecBadge = (badge: number | string | null, libelleBadge?: string) =>
    rendre({
      sections: [
        {
          liens: [
            {
              libelle: "Erreurs",
              href: "/erreurs",
              icone: UsersIcon,
              badge,
              libelleBadge,
            },
          ],
        },
      ],
    })

  it("affiche le compte, et le lit après le libellé", () => {
    simulerLargeur(false)
    avecBadge(1234, "1 234 à traiter")
    const lien = screen.getByRole("link", {
      name: /^Erreurs ?\(1 234 à traiter\)$/,
    })
    const pastille = lien.parentElement!.querySelector(
      '[data-slot="sidebar-menu-badge"]'
    )
    expect(pastille).toHaveTextContent("1 234")
    expect(pastille).toHaveAttribute("aria-hidden", "true")
    // Barre repliée : un point sur l'icône.
    expect(
      lien.querySelector('[data-slot="app-shell-badge-point"]')
    ).toBeInTheDocument()
  })

  it("rien pour 0 ou sans valeur", () => {
    simulerLargeur(false)
    avecBadge(0)
    expect(screen.getByRole("link", { name: "Erreurs" })).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="sidebar-menu-badge"]')
    ).toBeNull()
  })

  it("rien pour un compte qui n'est pas un nombre fini", () => {
    simulerLargeur(false)
    avecBadge(Number.NaN)
    expect(screen.getByRole("link", { name: "Erreurs" })).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="sidebar-menu-badge"]')
    ).toBeNull()
  })
})
