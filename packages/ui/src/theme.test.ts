/// <reference types="node" />
// Contrastes WCAG du thème : couleurs sémantiques de src/styles.css et
// contrats d'accent des applications (atelier/accents.css).
// Les fonds de Nova sont recopiés ici en hexadécimal (styles.css les écrit en
// oklch) : à mettre à jour si la couleur de base change.
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const racine = resolve(import.meta.dirname, "..")
const lire = (chemin: string) => readFileSync(resolve(racine, chemin), "utf8")

// Fonds de Nova (neutral) : background, muted, card.
const CLAIR = { fond: "#ffffff", muted: "#f5f5f5" }
const SOMBRE = { fond: "#0a0a0a", muted: "#262626", card: "#171717" }
const TEXTE = 4.5
// Anneau de focus : Nova trace une bordure pleine en --ring, entourée d'un
// halo à 50 % (décor). L'indicateur est la
// bordure : c'est elle qui doit atteindre 3:1.
const NON_TEXTE = 3
const CONTRAT = ["primary", "primary-foreground", "primary-text", "ring"]

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string) {
  const [claire, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (claire + 0.05) / (sombre + 0.05)
}

// Couleur posée à `part` d'opacité sur `fond` (bg-success/10, bg-primary/10…).
function teinte(couleur: string, fond: string, part: number) {
  const canal = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16)
  return (
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(canal(couleur, i) * part + canal(fond, i) * (1 - part))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  )
}

// Variables d'un bloc CSS. Seules les valeurs hexadécimales à 6 chiffres sont
// lues ; une variable demandée qui manque ou s'écrit autrement est une erreur.
function variables(css: string, selecteur: string) {
  const debut = css.indexOf(`${selecteur} {`)
  if (debut < 0) throw new Error(`bloc ${selecteur} introuvable`)
  const bloc = css.slice(debut, css.indexOf("}", debut))
  const declarees = [...bloc.matchAll(/--([\w-]+):\s*([^;]+);/g)]
  const hex = Object.fromEntries(
    declarees
      .filter((m) => /^#[0-9a-f]{6}$/i.test(m[2].trim()))
      .map((m) => [m[1], m[2].trim().toLowerCase()])
  )
  return {
    noms: declarees.map((m) => m[1]),
    valeur(nom: string): string {
      if (!hex[nom]) {
        throw new Error(
          `${selecteur} : --${nom} absente ou pas en hexadécimal à 6 chiffres`
        )
      }
      return hex[nom]
    },
  }
}

function lisible(texte: string, fond: string, seuil: number, quoi: string) {
  expect(
    contraste(texte, fond),
    `${quoi} : ${texte} sur ${fond}`
  ).toBeGreaterThanOrEqual(seuil)
}

describe("couleurs sémantiques", () => {
  const css = lire("src/styles.css")

  it.each(["success", "warning", "info"])("%s se lit en clair", (nom) => {
    const couleur = variables(css, ":root").valeur(nom)
    for (const fond of [
      CLAIR.fond,
      CLAIR.muted,
      teinte(couleur, CLAIR.fond, 0.2),
    ]) {
      lisible(couleur, fond, TEXTE, nom)
    }
  })

  it.each(["success", "warning", "info"])("%s se lit en sombre", (nom) => {
    const couleur = variables(css, ".dark").valeur(nom)
    for (const fond of [
      SOMBRE.fond,
      SOMBRE.card,
      SOMBRE.muted,
      teinte(couleur, SOMBRE.fond, 0.2),
    ]) {
      lisible(couleur, fond, TEXTE, nom)
    }
  })

  // Variantes d'Alert (bg-card) : le titre dans la couleur, la description
  // dans la couleur à 90 % (text-x/90), posée sur la carte.
  it.each(["destructive", "warning", "info", "success"])(
    "Alert %s : la description à 90 % se lit sur la carte",
    (nom) => {
      const clair = variables(css, ":root").valeur(nom)
      lisible(teinte(clair, CLAIR.fond, 0.9), CLAIR.fond, TEXTE, nom)
      const sombre = variables(css, ".dark").valeur(nom)
      lisible(teinte(sombre, SOMBRE.card, 0.9), SOMBRE.card, TEXTE, nom)
    }
  )

  // Variante destructive en teinte (bouton, badge, StatusBadge) : texte
  // --destructive sur bg-destructive/10 (20 % en sombre), posée sur le fond,
  // une carte ou un pied de dialogue (bg-muted/50 sur la carte).
  it("destructive se lit sur sa teinte, en clair", () => {
    const couleur = variables(css, ":root").valeur("destructive")
    const pied = teinte(CLAIR.muted, CLAIR.fond, 0.5)
    for (const fond of [CLAIR.fond, CLAIR.muted]) {
      lisible(couleur, fond, TEXTE, "destructive")
    }
    for (const fond of [CLAIR.fond, CLAIR.muted, pied]) {
      lisible(couleur, teinte(couleur, fond, 0.1), TEXTE, "destructive teinté")
    }
  })

  it("destructive se lit sur sa teinte, en sombre", () => {
    const couleur = variables(css, ".dark").valeur("destructive")
    const pied = teinte(SOMBRE.muted, SOMBRE.card, 0.5)
    for (const fond of [SOMBRE.fond, SOMBRE.card, SOMBRE.muted]) {
      lisible(couleur, fond, TEXTE, "destructive")
      lisible(couleur, teinte(couleur, fond, 0.2), TEXTE, "destructive teinté")
    }
    lisible(couleur, teinte(couleur, pied, 0.2), TEXTE, "destructive teinté")
  })

  // Texte secondaire, y compris sur --muted (initiales d'Avatar, Kbd).
  it("muted-foreground se lit sur le fond et sur --muted", () => {
    const clair = variables(css, ":root").valeur("muted-foreground")
    for (const fond of [CLAIR.fond, CLAIR.muted]) {
      lisible(clair, fond, TEXTE, "muted-foreground, clair")
    }
    const sombre = variables(css, ".dark").valeur("muted-foreground")
    for (const fond of [SOMBRE.fond, SOMBRE.card, SOMBRE.muted]) {
      lisible(sombre, fond, TEXTE, "muted-foreground, sombre")
    }
  })

  // Bord d'une case à cocher vide, en clair : --control-border est
  // --muted-foreground à 80 %.
  it("le bord d'une case à cocher se voit, en clair", () => {
    expect(css.replace(/\s+/g, " ")).toContain(
      "--control-border: color-mix( in oklab, var(--muted-foreground) 80%, transparent );"
    )
    const couleur = variables(css, ":root").valeur("muted-foreground")
    for (const fond of [CLAIR.fond, CLAIR.muted]) {
      lisible(teinte(couleur, fond, 0.8), fond, NON_TEXTE, "bord de case")
    }
  })
})

describe("contrats d'accent des applications", () => {
  const css = lire("atelier/accents.css")
  const applications = [
    ...css.matchAll(/:root\[data-accent="(\w+)"\] \{/g),
  ].map((m) => m[1])

  it("couvre les quatre applications", () => {
    expect(applications).toEqual(["members", "docs", "intervenant", "browser"])
  })

  it.each(applications)("%s : contrat complet et lisible", (application) => {
    const selecteur = `:root[data-accent="${application}"]`
    const themes = [
      {
        nom: "clair",
        selecteur,
        fond: CLAIR.fond,
        fonds: [CLAIR.fond, CLAIR.muted],
      },
      {
        nom: "sombre",
        selecteur: `${selecteur}.dark`,
        fond: SOMBRE.fond,
        fonds: [SOMBRE.fond, SOMBRE.card, SOMBRE.muted],
      },
    ]
    for (const theme of themes) {
      const vars = variables(css, theme.selecteur)
      expect([...vars.noms].sort(), theme.nom).toEqual(CONTRAT)
      const [primary, foreground, texte, ring] = CONTRAT.map(vars.valeur)

      lisible(foreground, primary, TEXTE, `${theme.nom}, texte sur l'accent`)
      // L'accent en texte : sur les fonds, et sur la teinte de l'accent
      // (bg-primary/10) posée sur le fond, comme dans l'atelier.
      for (const fond of [...theme.fonds, teinte(primary, theme.fond, 0.1)]) {
        lisible(texte, fond, TEXTE, `${theme.nom}, accent en texte`)
      }
      for (const fond of theme.fonds) {
        lisible(ring, fond, NON_TEXTE, `${theme.nom}, anneau de focus`)
      }
    }
  })
})
