/// <reference types="node" />
// Écarts assumés avec shadcn dans ui/ et hooks/ (voir le README) : un
// `npx shadcn add --overwrite` les effacerait sans bruit.
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createElement } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MOBILE_MEDIA_QUERY } from "@etic-ui/hooks/use-mobile"
import { Alert, Button, Calendar, Slider } from "@etic-ui/index"

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
})
