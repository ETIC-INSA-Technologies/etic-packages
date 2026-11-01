/// <reference types="node" />
// Écarts assumés avec shadcn dans ui/ et hooks/ (voir le README) : un
// `npx shadcn add --overwrite` les effacerait sans bruit.
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createElement } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MOBILE_MEDIA_QUERY } from "@etic-ui/hooks/use-mobile"
import {
  Alert,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  Button,
  Calendar,
  Dialog,
  DialogBody,
  DialogContent,
  DialogTitle,
  SidebarProvider,
  SidebarTrigger,
  Slider,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@etic-ui/index"

const lire = (chemin: string) =>
  readFileSync(resolve(import.meta.dirname, chemin), "utf8")

const composantsUi = readdirSync(
  resolve(import.meta.dirname, "components/ui")
).filter((nom) => nom.endsWith(".tsx") && !nom.includes(".test."))

describe("écarts avec shadcn", () => {
  it("seuil mobile à 1 024 px compris, en JS comme en CSS", () => {
    expect(MOBILE_MEDIA_QUERY).toBe("(width < 1025px)")
    const sidebar = lire("components/ui/sidebar.tsx")
    expect(sidebar).not.toMatch(/\bmd:/)
    expect(sidebar).toContain("min-[1025px]:block")
  })

  it("l'accent comme texte s'écrit text-primary-text, jamais text-primary", () => {
    const fautifs = composantsUi.filter((nom) =>
      /\btext-primary(?!-foreground|-text)\b/.test(lire(`components/ui/${nom}`))
    )
    expect(fautifs).toEqual([])
    expect(lire("components/ui/button.tsx")).toContain(
      'link: "text-primary-text'
    )
  })

  it("Button sans type ne soumet pas son formulaire", () => {
    render(
      createElement(
        "form",
        null,
        createElement(Button, null, "Ouvrir"),
        createElement(Button, { type: "submit" }, "Enregistrer")
      )
    )
    expect(screen.getByRole("button", { name: "Ouvrir" })).toHaveAttribute(
      "type",
      "button"
    )
    expect(screen.getByRole("button", { name: "Enregistrer" })).toHaveAttribute(
      "type",
      "submit"
    )
  })

  it("Button : aria-disabled estompé, sans enfoncement ni pointer-events-none", () => {
    const button = lire("components/ui/button.tsx")
    for (const classe of [
      " aria-disabled:opacity-50 ",
      " aria-disabled:not-data-en-cours:cursor-not-allowed ",
      " data-en-cours:cursor-progress ",
    ])
      expect(button).toContain(classe)
    expect(button).toContain(
      "active:not-aria-[haspopup]:not-aria-disabled:translate-y-px"
    )
    expect(button).not.toContain("aria-disabled:pointer-events-none")
  })

  it("Button : taille inline (lien dans une phrase, cible de 24 px)", () => {
    // `enCours` et `SpinnerDecoratif` sont testés par leur comportement
    // (button.test.tsx).
    expect(lire("components/ui/button.tsx")).toContain(
      'inline: "h-auto min-h-6 gap-1 px-0"'
    )
  })

  it("textes des lecteurs d'écran en français", () => {
    const sidebar = lire("components/ui/sidebar.tsx")
    expect(sidebar).not.toContain("Toggle Sidebar")
    expect(sidebar).toContain("<SheetTitle>Menu</SheetTitle>")
    expect(sidebar).toContain("Navigation de l'application.")
    expect(sidebar).toContain("Afficher ou masquer le menu")
    expect(lire("components/ui/sheet.tsx")).toContain(">Fermer<")
    expect(lire("components/ui/dialog.tsx")).not.toMatch(/\bClose\s*</)
    expect(lire("components/ui/dialog.tsx")).toContain(">Fermer<")
    const pagination = lire("components/ui/pagination.tsx")
    for (const anglais of ['"Previous"', '"Next"', "More pages", "Go to"])
      expect(pagination).not.toContain(anglais)
    expect(lire("components/ui/breadcrumb.tsx")).not.toMatch(
      /aria-label="breadcrumb"|>More</
    )
    expect(lire("components/ui/spinner.tsx")).toContain(
      'aria-label="Chargement"'
    )
    const combobox = lire("components/ui/combobox.tsx")
    expect(combobox).toContain('aria-label="Effacer"')
    expect(combobox).toContain('aria-label="Retirer"')
  })

  it("badge : variantes success et warning, sur le modèle de destructive", () => {
    const badge = lire("components/ui/badge.tsx")
    expect(badge).toMatch(/success:\s*"bg-success\/10 text-success/)
    expect(badge).toMatch(/warning:\s*"bg-warning\/10 text-warning/)
  })

  it("badge : variante info, et taille lg (28 px) des badges retirables", () => {
    const badge = lire("components/ui/badge.tsx")
    expect(badge).toMatch(/info:\s*"bg-info\/10 text-info/)
    expect(badge).toMatch(/lg:\s*"h-7"/)
  })

  it("progress : piste de 8 px en size lg (le ton est testé dans status.test.tsx)", () => {
    expect(lire("components/ui/progress.tsx")).toMatch(/lg:\s*"h-2"/)
  })

  it("alert : variantes warning, info et success, sur le modèle de destructive", () => {
    const alert = lire("components/ui/alert.tsx")
    for (const nom of ["warning", "info", "success"]) {
      expect(alert).toMatch(
        new RegExp(
          `${nom}:\\s*"bg-card text-${nom} \\*:data-\\[slot=alert-description\\]:text-${nom}/90`
        )
      )
    }
  })

  it("alert : info et success en role=status, les autres en role=alert", () => {
    render(
      createElement(
        "div",
        null,
        createElement(Alert, { variant: "info" }, "Info"),
        createElement(Alert, { variant: "success" }, "Succès"),
        createElement(Alert, { variant: "warning" }, "Attention"),
        createElement(Alert, { variant: "destructive" }, "Erreur"),
        createElement(Alert, null, "Défaut")
      )
    )
    expect(screen.getAllByRole("status").map((e) => e.textContent)).toEqual([
      "Info",
      "Succès",
    ])
    expect(screen.getAllByRole("alert").map((e) => e.textContent)).toEqual([
      "Attention",
      "Erreur",
      "Défaut",
    ])
  })

  it("barre latérale : Ctrl+B ignoré dans un champ de saisie", () => {
    const sidebar = lire("components/ui/sidebar.tsx")
    expect(sidebar).toContain("CHAMP_EDITABLE")
    expect(sidebar).toContain("closest(CHAMP_EDITABLE)")
  })

  it("onglets : le panneau focalisable a un anneau de focus", () => {
    expect(lire("components/ui/tabs.tsx")).toContain(
      "focus-visible:ring-3 focus-visible:ring-ring/50"
    )
  })

  it("slider : une valeur simple n'a qu'un curseur", () => {
    const { container } = render(
      createElement(Slider, { defaultValue: 40, "aria-label": "Zoom" })
    )
    expect(
      container.querySelectorAll('[data-slot="slider-thumb"]')
    ).toHaveLength(1)
  })

  it("slider : anneau au focus clavier de l'input caché, plage annoncée en français", () => {
    expect(lire("components/ui/slider.tsx")).toContain(
      "has-focus-visible:ring-3"
    )
    const { container } = render(
      createElement(Slider, { defaultValue: [20, 80], "aria-label": "Plage" })
    )
    const [debut, fin] = container.querySelectorAll("input[type=range]")
    // L'`aria-label` du slider nomme aussi ses curseurs.
    expect(debut).toHaveAttribute("aria-label", "Plage")
    expect(fin).toHaveAttribute("aria-label", "Plage")
    expect(debut).toHaveAttribute("aria-valuetext", "20 (minimum)")
    expect(fin).toHaveAttribute("aria-valuetext", "80 (maximum)")
  })

  it("listes : 16 px sous md (pas de zoom d'iOS), 14 px au-delà, comme Input", () => {
    for (const fichier of ["select.tsx", "native-select.tsx"]) {
      const source = lire(`components/ui/${fichier}`)
      expect(source).toContain("text-base")
      expect(source).toContain("md:text-sm")
    }
  })

  it("combobox : le bouton qui ouvre la liste a un nom", () => {
    expect(lire("components/ui/combobox.tsx")).toContain(
      'aria-label="Afficher les options"'
    )
  })

  it("calendrier en français, semaine commençant le lundi", () => {
    const { container } = render(
      createElement(Calendar, { defaultMonth: new Date(2026, 9, 1) })
    )
    expect(screen.getByText("octobre 2026")).toBeInTheDocument()
    const jours = container.querySelectorAll("th[scope=col]")
    expect(jours[0]).toHaveAttribute("aria-label", "lundi")
    expect(
      screen.getByRole("button", { name: "Aller au mois suivant" })
    ).toBeInTheDocument()
  })

  it("calendrier : jours de 36 px sous le seuil mobile (cible tactile), 28 px au-delà", () => {
    const calendrier = lire("components/ui/calendar.tsx")
    expect(calendrier).toContain("[--cell-size:--spacing(9)]")
    expect(calendrier).toContain("min-[1025px]:[--cell-size:--spacing(7)]")
  })

  it("thème : destructive et muted-foreground lisibles sur leurs fonds", () => {
    // Les contrastes sont vérifiés par theme.test.ts ; ici, que les valeurs
    // de Nova ne sont pas revenues.
    const css = lire("styles.css")
    expect(css).not.toContain("--destructive: oklch(0.577 0.245 27.325)")
    expect(css).not.toContain("--destructive: oklch(0.704 0.191 22.216)")
    expect(css).not.toContain("--muted-foreground: oklch(0.556 0 0)")
  })

  it("case à cocher partielle : un trait sur fond plein, pas une coche", () => {
    const checkbox = lire("components/ui/checkbox.tsx")
    expect(checkbox).toContain("MinusIcon")
    expect(checkbox).toContain("data-indeterminate:bg-primary")
  })

  it("case à cocher : bord en --control-border, visible en clair", () => {
    const checkbox = lire("components/ui/checkbox.tsx")
    expect(checkbox).not.toContain("border-input")
    expect(checkbox).toContain("border border-(--control-border)")
  })

  it("onglets line : passent à la ligne sous 640 px, comme shadcn au-delà", () => {
    // Le comportement n'existe qu'en CSS : les classes sont le contrat.
    render(
      createElement(
        Tabs,
        { defaultValue: "a" },
        createElement(
          TabsList,
          { "aria-label": "Pastilles" },
          createElement(TabsTrigger, { value: "a" }, "A")
        ),
        createElement(
          TabsList,
          { variant: "line", "aria-label": "Lignes" },
          createElement(TabsTrigger, { value: "a" }, "A")
        )
      )
    )
    const [pastilles, lignes] = screen.getAllByRole("tablist")
    const [, ongletLigne] = screen.getAllByRole("tab")
    // Écran étroit : retour à la ligne, onglets à la largeur de leur libellé.
    expect(lignes).toHaveClass(
      "max-sm:group-data-horizontal/tabs:h-auto",
      "max-sm:group-data-horizontal/tabs:flex-wrap"
    )
    expect(ongletLigne).toHaveClass(
      "max-sm:group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:flex-none"
    )
    // Au-delà, et pour la variante en pastille : shadcn tel quel.
    expect(lignes).toHaveClass("group-data-horizontal/tabs:h-8")
    expect(ongletLigne).toHaveClass("flex-1")
    expect(pastilles.className).not.toContain("flex-wrap")
  })

  it("avatar : diamètre libre, initiales proportionnelles", () => {
    render(
      createElement(
        Avatar,
        { diametre: 64 },
        createElement(AvatarFallback, null, "AL")
      )
    )
    const racine = screen.getByText("AL").parentElement
    expect(racine).toHaveStyle({ width: "64px", height: "64px" })
    expect(racine).toHaveStyle({ fontSize: "23px" })
    expect(screen.getByText("AL")).toHaveClass(
      "group-data-diametre/avatar:text-[length:inherit]"
    )
  })

  it("barre latérale : le bouton du menu prend son nom par `libelle`", () => {
    vi.stubGlobal("matchMedia", (requete: string) => ({
      matches: false,
      media: requete,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    try {
      render(
        createElement(
          SidebarProvider,
          null,
          createElement(SidebarTrigger),
          createElement(SidebarTrigger, { libelle: "Ouvrir le menu" }),
          // API de shadcn gardée : des `children` remplacent le contenu.
          createElement(SidebarTrigger, null, "Navigation")
        )
      )
      expect(
        screen.getByRole("button", { name: "Afficher ou masquer le menu" })
      ).toBeInTheDocument()
      const bouton = screen.getByRole("button", { name: "Ouvrir le menu" })
      expect(bouton).toHaveAttribute("data-slot", "sidebar-trigger")
      const personnalise = screen.getByRole("button", { name: "Navigation" })
      expect(personnalise).toHaveTextContent(/^Navigation$/)
      expect(personnalise.querySelector("svg")).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("dialogues : hauteur plafonnée à l'écran, seul le corps défile", () => {
    render(
      createElement(
        Dialog,
        { open: true },
        createElement(
          DialogContent,
          null,
          createElement(DialogTitle, null, "D"),
          createElement(DialogBody, null, "Corps")
        )
      )
    )
    render(
      createElement(
        AlertDialog,
        { open: true },
        createElement(
          AlertDialogContent,
          null,
          createElement(AlertDialogTitle, null, "A")
        )
      )
    )
    // Le second dialogue modal masque le premier (`aria-hidden`).
    for (const dialogue of [
      screen.getByRole("dialog", { hidden: true }),
      screen.getByRole("alertdialog"),
    ]) {
      // Colonne flexible : un corps (`DialogBody`) peut rétrécir et défiler
      // seul ; sans corps, tout le contenu défile. Jamais à l'horizontale.
      expect(dialogue).toHaveClass(
        "flex",
        "flex-col",
        "max-h-[calc(100dvh-2rem)]",
        "overflow-y-auto",
        "overflow-x-hidden"
      )
    }
    expect(screen.getByText("Corps")).toHaveClass(
      "min-h-0",
      "overflow-y-auto",
      "grid-cols-1"
    )
  })

  it("alert-dialog : titre et description à gauche dès le téléphone, sauf avec un média", () => {
    render(
      createElement(
        AlertDialog,
        { open: true },
        createElement(
          AlertDialogContent,
          null,
          createElement(
            AlertDialogHeader,
            null,
            createElement(AlertDialogTitle, null, "Titre")
          )
        )
      )
    )
    const entete = screen.getByText("Titre").parentElement
    // Sans préfixe `sm:` : la règle vaut aussi sous 640 px, mais pas avec un
    // média, dont la grille de shadcn centre l'icône au-dessus du titre (jsdom
    // n'applique pas Tailwind : on vérifie la condition portée par la classe).
    expect(entete).toHaveClass(
      "group-data-[size=default]/alert-dialog-content:not-has-data-[slot=alert-dialog-media]:place-items-start",
      "group-data-[size=default]/alert-dialog-content:not-has-data-[slot=alert-dialog-media]:text-left",
      // Au-delà de 640 px, à gauche avec ou sans média, comme shadcn.
      "sm:group-data-[size=default]/alert-dialog-content:text-left"
    )
    expect(entete).not.toHaveClass(
      "group-data-[size=default]/alert-dialog-content:text-left"
    )
  })
})
