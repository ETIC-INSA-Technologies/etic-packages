/// <reference types="node" />
// Thème de src/styles.css : valeurs de la couleur de base « gray » de shadcn,
// contrastes WCAG (textes, contrôles, couleurs sémantiques) en clair et en
// sombre, et contrats d'accent des applications (atelier/accents.css).
// Les couleurs sont lues dans les fichiers CSS (hexadécimal ou oklch).
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const racine = resolve(import.meta.dirname, "..")
const lire = (chemin: string) => readFileSync(resolve(racine, chemin), "utf8")

const TEXTE = 4.5
// Contrôles (WCAG 1.4.11) : bord d'une case à cocher, anneau de focus. Nova
// trace une bordure pleine en --ring, entourée d'un halo à 50 % (décor) :
// l'indicateur est la bordure, c'est elle qui doit atteindre 3:1.
const NON_TEXTE = 3
const CONTRAT = ["primary", "primary-foreground", "primary-text", "ring"]

// Couleur de base « gray » de shadcn : registre ui.shadcn.com/r/colors/
// gray.json, cssVarsV4 (palette gray de Tailwind 4), sans chart-* ni radius.
const REGISTRE_GRAY = {
  clair: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.13 0.028 261.692)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.13 0.028 261.692)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.13 0.028 261.692)",
    primary: "oklch(0.21 0.034 264.665)",
    "primary-foreground": "oklch(0.985 0.002 247.839)",
    secondary: "oklch(0.967 0.003 264.542)",
    "secondary-foreground": "oklch(0.21 0.034 264.665)",
    muted: "oklch(0.967 0.003 264.542)",
    "muted-foreground": "oklch(0.551 0.027 264.364)",
    accent: "oklch(0.967 0.003 264.542)",
    "accent-foreground": "oklch(0.21 0.034 264.665)",
    destructive: "oklch(0.577 0.245 27.325)",
    border: "oklch(0.928 0.006 264.531)",
    input: "oklch(0.928 0.006 264.531)",
    ring: "oklch(0.707 0.022 261.325)",
    sidebar: "oklch(0.985 0.002 247.839)",
    "sidebar-foreground": "oklch(0.13 0.028 261.692)",
    "sidebar-primary": "oklch(0.21 0.034 264.665)",
    "sidebar-primary-foreground": "oklch(0.985 0.002 247.839)",
    "sidebar-accent": "oklch(0.967 0.003 264.542)",
    "sidebar-accent-foreground": "oklch(0.21 0.034 264.665)",
    "sidebar-border": "oklch(0.928 0.006 264.531)",
    "sidebar-ring": "oklch(0.707 0.022 261.325)",
  },
  sombre: {
    background: "oklch(0.13 0.028 261.692)",
    foreground: "oklch(0.985 0.002 247.839)",
    card: "oklch(0.21 0.034 264.665)",
    "card-foreground": "oklch(0.985 0.002 247.839)",
    popover: "oklch(0.21 0.034 264.665)",
    "popover-foreground": "oklch(0.985 0.002 247.839)",
    primary: "oklch(0.928 0.006 264.531)",
    "primary-foreground": "oklch(0.21 0.034 264.665)",
    secondary: "oklch(0.278 0.033 256.848)",
    "secondary-foreground": "oklch(0.985 0.002 247.839)",
    muted: "oklch(0.278 0.033 256.848)",
    "muted-foreground": "oklch(0.707 0.022 261.325)",
    accent: "oklch(0.278 0.033 256.848)",
    "accent-foreground": "oklch(0.985 0.002 247.839)",
    destructive: "oklch(0.704 0.191 22.216)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: "oklch(0.551 0.027 264.364)",
    sidebar: "oklch(0.21 0.034 264.665)",
    "sidebar-foreground": "oklch(0.985 0.002 247.839)",
    "sidebar-primary": "oklch(0.488 0.243 264.376)",
    "sidebar-primary-foreground": "oklch(0.985 0.002 247.839)",
    "sidebar-accent": "oklch(0.278 0.033 256.848)",
    "sidebar-accent-foreground": "oklch(0.985 0.002 247.839)",
    "sidebar-border": "oklch(1 0 0 / 10%)",
    "sidebar-ring": "oklch(0.551 0.027 264.364)",
  },
}

// Écarts assumés avec le registre, chacun commenté dans styles.css.
const ECARTS = {
  // La barre latérale suit le contrat d'accent de l'application.
  commun: ["sidebar-primary", "sidebar-primary-foreground", "sidebar-ring"],
  // Fond de page gray-50 (cartes blanches qui s'en détachent) ; lisibilité :
  // ≥ 4,5:1 sur --muted, sur la teinte de --destructive.
  clair: ["background", "muted-foreground", "destructive"],
  sombre: ["destructive"],
}

// oklch(L C H) → sRGB hexadécimal (conversion d'OKLab de Björn Ottosson,
// valeurs hors gamut ramenées dans [0, 1]).
function oklchEnHex(l: number, c: number, h: number) {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lineaire = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
  return (
    "#" +
    lineaire
      .map((x) => {
        const v = Math.min(1, Math.max(0, x))
        const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
        return Math.round(srgb * 255)
          .toString(16)
          .padStart(2, "0")
      })
      .join("")
  )
}

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

// Variables d'un bloc CSS (`bloc` : son texte brut). `valeur` rend une
// couleur opaque en hexadécimal : hexadécimal à 6 chiffres, oklch(L C H), ou
// var(--autre) du même bloc ; une variable demandée qui manque ou s'écrit
// autrement est une erreur.
function variables(css: string, selecteur: string) {
  const debut = css.indexOf(`${selecteur} {`)
  if (debut < 0) throw new Error(`bloc ${selecteur} introuvable`)
  const bloc = css.slice(debut, css.indexOf("}", debut))
  const declarees = Object.fromEntries(
    [...bloc.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [
      m[1],
      m[2].replace(/\s+/g, " ").trim(),
    ])
  )
  const valeur = (nom: string): string => {
    const brute = declarees[nom]
    if (/^#[0-9a-f]{6}$/i.test(brute ?? "")) return brute.toLowerCase()
    const oklch = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(brute ?? "")
    if (oklch)
      return oklchEnHex(
        ...(oklch.slice(1).map(Number) as [number, number, number])
      )
    const reference = /^var\(--([\w-]+)\)$/.exec(brute ?? "")
    if (reference) return valeur(reference[1])
    throw new Error(
      `${selecteur} : --${nom} absente ou pas une couleur opaque lisible (${brute})`
    )
  }
  return {
    bloc,
    noms: Object.keys(declarees),
    brute: (nom: string) => declarees[nom],
    valeur,
  }
}

function lisible(texte: string, fond: string, seuil: number, quoi: string) {
  expect(
    contraste(texte, fond),
    `${quoi} : ${texte} sur ${fond}`
  ).toBeGreaterThanOrEqual(seuil)
}

const css = lire("src/styles.css")
const racineCss = variables(css, ":root")
const sombreCss = variables(css, ".dark")

// Fonds de la page et des cartes (tableaux compris), lus dans le thème :
// `fonds` ceux où se pose du texte, `surfaces` ceux où se pose une teinte
// (bg-x/10…). `teinteDestructive` : opacité de bg-destructive (10 %, 20 % en
// sombre). `accent` : suffixe du sélecteur d'un contrat d'accent.
function surfaces(
  nom: "clair" | "sombre",
  vars: ReturnType<typeof variables>,
  teinteDestructive: number,
  accent: string
) {
  const [fond, card, muted] = ["background", "card", "muted"].map(vars.valeur)
  return {
    nom,
    vars,
    fond,
    card,
    muted,
    fonds: [fond, card, muted],
    surfaces: [fond, card],
    teinteDestructive,
    accent,
  }
}

const CLAIR = surfaces("clair", racineCss, 0.1, "")
const SOMBRE = surfaces("sombre", sombreCss, 0.2, ".dark")
const THEMES = [CLAIR, SOMBRE]

describe("couleur de base", () => {
  it.each(THEMES)(
    "$nom : valeurs du registre gray de shadcn",
    ({ nom, vars }) => {
      const ecarts = [...ECARTS.commun, ...ECARTS[nom]]
      for (const [jeton, attendu] of Object.entries(REGISTRE_GRAY[nom])) {
        if (ecarts.includes(jeton)) continue
        expect(vars.brute(jeton), `${nom} : --${jeton}`).toBe(attendu)
      }
    }
  )

  it("color-scheme suit le thème (contrôles natifs, barres de défilement)", () => {
    expect(racineCss.bloc).toContain("color-scheme: light;")
    expect(sombreCss.bloc).toContain("color-scheme: dark;")
  })

  // Les jetons qu'une surface emploie avec son texte suivent la base : une
  // application qui la remplace n'a pas à les redire un par un.
  it.each(THEMES)(
    "$nom : les jetons dépendants suivent la base",
    ({ nom, vars }) => {
      const memes = [
        ["card-foreground", "foreground"],
        ["popover-foreground", "foreground"],
        ["sidebar-foreground", "foreground"],
        ["secondary", "muted"],
        ["accent", "muted"],
        ["sidebar-accent", "muted"],
        ["accent-foreground", "secondary-foreground"],
        ["sidebar-accent-foreground", "secondary-foreground"],
        ["sidebar-border", "border"],
      ]
      for (const [jeton, base] of memes) {
        expect(vars.brute(jeton), `${nom} : --${jeton} = --${base}`).toBe(
          vars.brute(base)
        )
      }
    }
  )

  // Cartes, menus et tableaux (bg-card) se détachent du fond de la même
  // façon dans les deux thèmes : un cran plus clairs que lui.
  it.each(THEMES)(
    "$nom : les cartes sont plus claires que le fond",
    ({ vars }) => {
      for (const surface of ["card", "popover"]) {
        expect(luminance(vars.valeur(surface))).toBeGreaterThan(
          luminance(vars.valeur("background"))
        )
      }
    }
  )

  it.each(THEMES)(
    "$nom : chaque texte se lit sur sa surface",
    ({ nom, vars }) => {
      const paires = [
        ["foreground", "background"],
        ["foreground", "muted"],
        ["card-foreground", "card"],
        ["popover-foreground", "popover"],
        ["secondary-foreground", "secondary"],
        ["accent-foreground", "accent"],
        ["sidebar-foreground", "sidebar"],
        ["sidebar-accent-foreground", "sidebar-accent"],
        // Contrat d'accent par défaut (sans application).
        ["primary-foreground", "primary"],
        ["primary-text", "background"],
        ["primary-text", "muted"],
      ]
      for (const [texte, fond] of paires) {
        lisible(
          vars.valeur(texte),
          vars.valeur(fond),
          TEXTE,
          `${nom}, --${texte} sur --${fond}`
        )
      }
    }
  )

  // Texte secondaire, y compris sur --muted (initiales d'Avatar, Kbd) et sur
  // les panneaux.
  it.each(THEMES)(
    "$nom : muted-foreground se lit sur tous les fonds",
    ({ nom, vars }) => {
      const texte = vars.valeur("muted-foreground")
      for (const fond of [
        "background",
        "muted",
        "card",
        "popover",
        "sidebar",
        "accent",
      ]) {
        lisible(
          texte,
          vars.valeur(fond),
          TEXTE,
          `${nom}, muted-foreground sur --${fond}`
        )
      }
    }
  )

  // Bord d'une case à cocher vide : --muted-foreground à 80 %, déclaré dans
  // :root seulement. Avec `dark` sur <html>, var(--muted-foreground) s'y
  // résout en valeur sombre : le contour sombre se calcule donc avec elle.
  it("le bord d'une case à cocher suit --muted-foreground", () => {
    expect(racineCss.brute("control-border")).toBe(
      "color-mix( in oklab, var(--muted-foreground) 80%, transparent )"
    )
    expect(sombreCss.brute("control-border")).toBeUndefined()
  })

  it.each(THEMES)(
    "$nom : le bord d'une case à cocher se voit",
    ({ nom, vars, fonds }) => {
      const couleur = vars.valeur("muted-foreground")
      for (const fond of fonds) {
        lisible(
          teinte(couleur, fond, 0.8),
          fond,
          NON_TEXTE,
          `${nom}, bord de case`
        )
      }
    }
  )
})

describe("couleurs sémantiques", () => {
  // Chaque couleur dans chaque thème, sur les fonds et sur sa teinte à 20 %
  // posée sur le fond ou une carte.
  it.each(
    THEMES.flatMap((theme) =>
      ["success", "warning", "info"].map((couleur) => ({ couleur, theme }))
    )
  )("$couleur se lit en $theme.nom", ({ couleur: nom, theme }) => {
    const couleur = theme.vars.valeur(nom)
    const teintes = theme.surfaces.map((s) => teinte(couleur, s, 0.2))
    for (const fond of [...theme.fonds, ...teintes]) {
      lisible(couleur, fond, TEXTE, `${theme.nom}, ${nom}`)
    }
  })

  // Variantes d'Alert (bg-card) : le titre dans la couleur, la description
  // dans la couleur à 90 % (text-x/90), posée sur la carte.
  it.each(["destructive", "warning", "info", "success"])(
    "Alert %s : la description à 90 % se lit sur la carte",
    (nom) => {
      for (const { nom: theme, vars, card } of THEMES) {
        const couleur = vars.valeur(nom)
        lisible(teinte(couleur, card, 0.9), card, TEXTE, `${theme}, ${nom}`)
      }
    }
  )

  // Variante destructive en teinte (bouton, badge, StatusBadge) : texte
  // --destructive sur bg-destructive/10 (20 % en sombre), posée sur le fond,
  // une carte ou un pied de dialogue (bg-muted/50 sur la carte).
  it.each(THEMES)(
    "$nom : destructive se lit sur sa teinte",
    ({ nom, vars, fonds, muted, card, teinteDestructive }) => {
      const couleur = vars.valeur("destructive")
      const pied = teinte(muted, card, 0.5)
      for (const fond of fonds) {
        lisible(couleur, fond, TEXTE, `${nom}, destructive`)
      }
      for (const fond of [...fonds, pied]) {
        lisible(
          couleur,
          teinte(couleur, fond, teinteDestructive),
          TEXTE,
          `${nom}, destructive teinté`
        )
      }
    }
  )
})

describe("contrats d'accent des applications", () => {
  const accents = lire("atelier/accents.css")
  const applications = [
    ...accents.matchAll(/:root\[data-accent="(\w+)"\] \{/g),
  ].map((m) => m[1])

  it("couvre les quatre applications", () => {
    expect(applications).toEqual(["members", "docs", "intervenant", "browser"])
  })

  it.each(applications)("%s : contrat complet et lisible", (application) => {
    for (const theme of THEMES) {
      const vars = variables(
        accents,
        `:root[data-accent="${application}"]${theme.accent}`
      )
      expect([...vars.noms].sort(), theme.nom).toEqual(CONTRAT)
      const [primary, foreground, texte, ring] = CONTRAT.map(vars.valeur)

      lisible(foreground, primary, TEXTE, `${theme.nom}, texte sur l'accent`)
      // L'accent en texte : sur les fonds, et sur la teinte de l'accent
      // (bg-primary/10) posée sur le fond ou une carte, comme dans l'atelier.
      const teintes = theme.surfaces.map((s) => teinte(primary, s, 0.1))
      for (const fond of [...theme.fonds, ...teintes]) {
        lisible(texte, fond, TEXTE, `${theme.nom}, accent en texte`)
      }
      for (const fond of theme.fonds) {
        lisible(ring, fond, NON_TEXTE, `${theme.nom}, anneau de focus`)
      }
    }
  })
})
