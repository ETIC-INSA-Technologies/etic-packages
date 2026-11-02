/// <reference types="node" />
// Thème de src/styles.css : valeurs de la couleur de base « zinc » de shadcn,
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

// Couleur de base « zinc » de shadcn : registre ui.shadcn.com/r/colors/
// zinc.json, cssVarsV4 (palette zinc de Tailwind 4), sans chart-* ni radius.
const REGISTRE_ZINC = {
  clair: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.141 0.005 285.823)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.141 0.005 285.823)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.141 0.005 285.823)",
    primary: "oklch(0.21 0.006 285.885)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.967 0.001 286.375)",
    "secondary-foreground": "oklch(0.21 0.006 285.885)",
    muted: "oklch(0.967 0.001 286.375)",
    "muted-foreground": "oklch(0.552 0.016 285.938)",
    accent: "oklch(0.967 0.001 286.375)",
    "accent-foreground": "oklch(0.21 0.006 285.885)",
    destructive: "oklch(0.577 0.245 27.325)",
    border: "oklch(0.92 0.004 286.32)",
    input: "oklch(0.92 0.004 286.32)",
    ring: "oklch(0.705 0.015 286.067)",
    sidebar: "oklch(0.985 0 0)",
    "sidebar-foreground": "oklch(0.141 0.005 285.823)",
    "sidebar-primary": "oklch(0.21 0.006 285.885)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.967 0.001 286.375)",
    "sidebar-accent-foreground": "oklch(0.21 0.006 285.885)",
    "sidebar-border": "oklch(0.92 0.004 286.32)",
    "sidebar-ring": "oklch(0.705 0.015 286.067)",
  },
  sombre: {
    background: "oklch(0.141 0.005 285.823)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.21 0.006 285.885)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.21 0.006 285.885)",
    "popover-foreground": "oklch(0.985 0 0)",
    primary: "oklch(0.92 0.004 286.32)",
    "primary-foreground": "oklch(0.21 0.006 285.885)",
    secondary: "oklch(0.274 0.006 286.033)",
    "secondary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.274 0.006 286.033)",
    "muted-foreground": "oklch(0.705 0.015 286.067)",
    accent: "oklch(0.274 0.006 286.033)",
    "accent-foreground": "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: "oklch(0.552 0.016 285.938)",
    sidebar: "oklch(0.21 0.006 285.885)",
    "sidebar-foreground": "oklch(0.985 0 0)",
    "sidebar-primary": "oklch(0.488 0.243 264.376)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.274 0.006 286.033)",
    "sidebar-accent-foreground": "oklch(0.985 0 0)",
    "sidebar-border": "oklch(1 0 0 / 10%)",
    "sidebar-ring": "oklch(0.552 0.016 285.938)",
  },
}

// Écarts assumés avec le registre, chacun commenté dans styles.css.
const ECARTS = {
  // La barre latérale suit le contrat d'accent de l'application.
  commun: ["sidebar-primary", "sidebar-primary-foreground", "sidebar-ring"],
  // Lisibilité : ≥ 4,5:1 sur --muted, sur la teinte de --destructive.
  // --sidebar : blanche en clair (var(--background)) au lieu de zinc-50.
  clair: ["muted-foreground", "destructive", "sidebar"],
  sombre: ["destructive"],
  // Jetons ajoutés, absents du registre : --page, fond de la page (bg-page :
  // body, contenu d'AppShell), zinc-50 en clair (cartes blanches qui s'en
  // détachent), --background en sombre.
  ajouts: ["page"],
}

// oklch(L C H) → sRGB hexadécimal (conversion d'OKLab de Björn Ottosson,
// valeurs hors gamut ramenées dans [0, 1]).
function oklchEnHex(l: number, c: number, h: number) {
  return oklabEnHex(
    l,
    c * Math.cos((h * Math.PI) / 180),
    c * Math.sin((h * Math.PI) / 180)
  )
}

// sRGB hexadécimal → OKLab (inverse de oklabEnHex).
function hexEnOklab(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

// color-mix(in oklab, a, b part) : `b` à `part` (0 à 1) dans `a`.
function melanger(a: string, b: string, part: number) {
  const [x, y] = [hexEnOklab(a), hexEnOklab(b)]
  return oklabEnHex(
    ...(x.map((v, i) => v * (1 - part) + y[i] * part) as [
      number,
      number,
      number,
    ])
  )
}

function oklabEnHex(l: number, a: number, b: number) {
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
// couleur opaque en hexadécimal : hexadécimal à 6 chiffres, oklch(L C H),
// var(--autre) du même bloc, ou color-mix(in oklab, var(--a), var(--b) n%) ;
// une variable demandée qui manque ou s'écrit autrement est une erreur.
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
    const melange =
      /^color-mix\( ?in oklab, var\(--([\w-]+)\), var\(--([\w-]+)\) ([\d.]+)% ?\)$/.exec(
        brute ?? ""
      )
    if (melange)
      return melanger(
        valeur(melange[1]),
        valeur(melange[2]),
        Number(melange[3]) / 100
      )
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

// Fonds de la page, des surfaces et des cartes (tableaux compris), lus dans
// le thème : `fonds` ceux où se pose du texte, `surfaces` ceux où se pose une
// teinte (bg-x/10…). `teinteDestructive` : opacité de bg-destructive (10 %,
// 20 % en sombre). `accent` : suffixe du sélecteur d'un contrat d'accent.
function surfaces(
  nom: "clair" | "sombre",
  vars: ReturnType<typeof variables>,
  teinteDestructive: number,
  accent: string
) {
  const [page, fond, card, muted] = ["page", "background", "card", "muted"].map(
    vars.valeur
  )
  // Fonds de tableau (bg-tableau) : sur la page et dans une surface, chacun
  // avec sa ligne survolée et sa ligne sélectionnée (le fond mêlé d'une part
  // de --foreground, @theme inline de styles.css).
  const part = (jeton: string) => {
    const brute = vars.brute(jeton) ?? ""
    if (!/^[\d.]+%$/.test(brute))
      throw new Error(`${nom} : --${jeton} n'est pas un pourcentage (${brute})`)
    return parseFloat(brute) / 100
  }
  const avant = vars.valeur("foreground")
  const tableaux = (["tableau", "tableau-surface"] as const).map((jeton) => {
    const tableau = vars.valeur(jeton)
    return {
      jeton,
      tableau,
      survol: melanger(tableau, avant, part("tableau-survol-part")),
      selection: melanger(tableau, avant, part("tableau-selection-part")),
    }
  })
  return {
    nom,
    vars,
    page,
    fond,
    card,
    muted,
    tableaux,
    fonds: [page, fond, card, muted],
    surfaces: [page, fond, card],
    teinteDestructive,
    accent,
  }
}

const CLAIR = surfaces("clair", racineCss, 0.1, "")
const SOMBRE = surfaces("sombre", sombreCss, 0.2, ".dark")
const THEMES = [CLAIR, SOMBRE]

describe("couleur de base", () => {
  it.each(THEMES)(
    "$nom : valeurs du registre zinc de shadcn",
    ({ nom, vars }) => {
      const ecarts = [...ECARTS.commun, ...ECARTS[nom]]
      for (const [jeton, attendu] of Object.entries(REGISTRE_ZINC[nom])) {
        if (ecarts.includes(jeton)) continue
        expect(vars.brute(jeton), `${nom} : --${jeton}`).toBe(attendu)
      }
    }
  )

  it("--page : ajout absent du registre, zinc-50 en clair, le fond en sombre", () => {
    for (const ajout of ECARTS.ajouts) {
      expect(Object.keys(REGISTRE_ZINC.clair)).not.toContain(ajout)
    }
    // zinc-50 de Tailwind 4.
    expect(racineCss.brute("page")).toBe("oklch(0.985 0 0)")
    expect(sombreCss.brute("page")).toBe("var(--background)")
    expect(css).toContain("--color-page: var(--page);")
  })

  it("--sidebar : blanche en clair, inchangée en sombre ; l'élément actif et le filet s'en distinguent", () => {
    expect(racineCss.brute("sidebar")).toBe("var(--background)")
    expect(racineCss.valeur("sidebar")).toBe(racineCss.valeur("background"))
    expect(sombreCss.brute("sidebar")).toBe(REGISTRE_ZINC.sombre.sidebar)
    // Pas un contraste de texte : l'élément survolé ou actif et le filet
    // doivent seulement rester perceptibles (zinc-100 sur blanc, zinc-200
    // entre la barre blanche et la page zinc-50).
    const blanc = racineCss.valeur("sidebar")
    expect(
      contraste(racineCss.valeur("sidebar-accent"), blanc)
    ).toBeGreaterThan(1.05)
    expect(
      contraste(racineCss.valeur("sidebar-border"), racineCss.valeur("page"))
    ).toBeGreaterThan(1.1)
    expect(
      contraste(racineCss.valeur("sidebar-border"), blanc)
    ).toBeGreaterThan(1.1)
  })

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

  // Cartes, menus et tableaux (bg-card) se détachent de la page de la même
  // façon dans les deux thèmes : un cran plus clairs qu'elle.
  it.each(THEMES)(
    "$nom : les cartes sont plus claires que la page",
    ({ vars, page }) => {
      for (const surface of ["card", "popover"]) {
        expect(luminance(vars.valeur(surface))).toBeGreaterThan(luminance(page))
      }
    }
  )

  // Cadre de tableau (bg-tableau, ajout d'ETIC) : --card sur la page, fond de
  // --tableau sur la page, --tableau-surface dans une surface surélevée
  // (règle --tableau-fond de styles.css, vérifiée par ecarts-shadcn.test.ts) ;
  // lignes survolée et sélectionnée relatives à ce fond (@theme inline).
  it("tableaux : bg-tableau, bg-tableau-survol et bg-tableau-selection", () => {
    const enLigne = css.replace(/\s+/g, " ")
    expect(enLigne).toContain(
      "--color-tableau: var(--tableau-fond, var(--tableau));"
    )
    for (const [classe, part] of [
      ["survol", "survol-part"],
      ["selection", "selection-part"],
    ]) {
      expect(enLigne).toContain(
        `--color-tableau-${classe}: color-mix( in oklab, var(--tableau-fond, var(--tableau)), var(--foreground) var(--tableau-${part}) );`
      )
    }
    expect(css).toMatch(/\{\s*--tableau-fond: var\(--tableau-surface\);\s*\}/)
  })

  // Exigence : le tableau se distingue nettement de ce qui le porte (≥ 1,08:1),
  // sur la page comme dans une surface (carte, popover, barre latérale), dans
  // les deux thèmes ; ligne survolée / fond et ligne sélectionnée / ligne
  // survolée perceptibles (≥ 1,04:1). Le blanc sur zinc-50 (1,04:1) ne
  // suffisait pas.
  it.each(THEMES)(
    "$nom : un tableau se détache de son support, ses lignes de lui",
    ({ nom, vars, page, card, tableaux }) => {
      const [surPage, dansSurface] = tableaux
      const supports: [string, string, typeof surPage][] = [
        ["page", page, surPage],
        ["card", card, dansSurface],
        ["popover", vars.valeur("popover"), dansSurface],
        ["sidebar", vars.valeur("sidebar"), dansSurface],
      ]
      for (const [
        support,
        couleur,
        { tableau, survol, selection },
      ] of supports) {
        const quoi = `${nom}, tableau sur --${support}`
        expect(contraste(tableau, couleur), quoi).toBeGreaterThanOrEqual(1.08)
        expect(
          contraste(survol, tableau),
          `${quoi}, survol`
        ).toBeGreaterThanOrEqual(1.04)
        expect(
          contraste(selection, survol),
          `${quoi}, sélection`
        ).toBeGreaterThanOrEqual(1.04)
        // Le survol va du fond vers la sélection, sans revenir en arrière.
        const [l0, l1, l2] = [tableau, survol, selection].map(luminance)
        expect(Math.sign(l1 - l0), quoi).toBe(Math.sign(l2 - l1))
      }
    }
  )

  // Texte posé dans un tableau (jetons de la bibliothèque) : sur son fond, la
  // ligne survolée et la ligne sélectionnée, dans les deux contextes ; bord
  // d'une case à cocher de ligne (--muted-foreground à 80 %) ≥ 3:1. Les
  // contrats d'accent des applications (--primary-text) et la teinte
  // destructive (bg-destructive/10) n'y sont pas vérifiés : sous 4,5:1 sur
  // les lignes les plus sombres en clair (écart déclaré).
  it.each(THEMES)(
    "$nom : les textes se lisent dans un tableau",
    ({ nom, vars, tableaux }) => {
      for (const { jeton, tableau, survol, selection } of tableaux) {
        for (const fond of [tableau, survol, selection]) {
          lisible(
            teinte(vars.valeur("muted-foreground"), fond, 0.8),
            fond,
            NON_TEXTE,
            `${nom}, bord de case sur --${jeton}`
          )
          for (const texte of [
            "foreground",
            "muted-foreground",
            "primary-text",
            "destructive",
            "success",
            "warning",
            "info",
          ]) {
            lisible(
              vars.valeur(texte),
              fond,
              TEXTE,
              `${nom}, --${texte} sur --${jeton}`
            )
          }
        }
      }
    }
  )

  // Surfaces de shadcn en bg-background posées sur bg-muted (onglet actif
  // dans TabsList) : elles s'en distinguent comme dans le registre (1,10:1
  // en clair, blanc sur zinc-100 ; zinc-50 n'y donnerait que 1,05:1).
  it.each(THEMES)(
    "$nom : bg-background se distingue de bg-muted (onglet actif)",
    ({ fond, muted }) => {
      expect(contraste(fond, muted)).toBeGreaterThanOrEqual(1.08)
    }
  )

  it.each(THEMES)(
    "$nom : chaque texte se lit sur sa surface",
    ({ nom, vars }) => {
      const paires = [
        ["foreground", "page"],
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
        ["primary-text", "page"],
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
        "page",
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
  // les deux blocs (un `dark` posé sur un sous-arbre le recalcule aussi).
  it.each(THEMES)(
    "$nom : le bord d'une case à cocher se voit",
    ({ nom, vars, fonds }) => {
      expect(vars.brute("control-border")).toBe(
        "color-mix( in oklab, var(--muted-foreground) 80%, transparent )"
      )
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

  // Contour de la radio non cochée et rail du switch éteint : le même
  // --control-border que la case à cocher, ≥ 3:1 sur la page, une carte et
  // --muted ; le pouce reste distinct du rail (bg-background en clair,
  // bg-foreground en sombre, comme switch.tsx).
  it.each(THEMES)(
    "$nom : contour de radio et rail de switch éteint se voient",
    ({ nom, vars, fonds, surfaces }) => {
      const couleur = vars.valeur("muted-foreground")
      for (const fond of fonds) {
        const rail = teinte(couleur, fond, 0.8)
        lisible(rail, fond, NON_TEXTE, `${nom}, contour de radio / rail`)
      }
      const pouce = vars.valeur(nom === "clair" ? "background" : "foreground")
      for (const fond of surfaces) {
        lisible(
          pouce,
          teinte(couleur, fond, 0.8),
          NON_TEXTE,
          `${nom}, pouce sur rail éteint`
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
