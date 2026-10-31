// Page d'atelier : chaque composant de la bibliothèque, dans ses variantes,
// importé comme le ferait une application.
import { useEffect, useState } from "react"
import { BoxIcon, PaletteIcon, SettingsIcon, UserIcon } from "lucide-react"

import { AppShell, Button, type ThemePreference } from "@etic-ui/index"

const VARIANTES = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const
const TAILLES = ["xs", "sm", "default", "lg"] as const

// Contrats d'accent définis dans accents.css ; « aucun » = gris de Nova.
const ACCENTS = [
  { id: "", nom: "Aucun" },
  { id: "members", nom: "ETIC Members" },
  { id: "docs", nom: "ETIC Docs" },
  { id: "intervenant", nom: "Intervenant" },
  { id: "browser", nom: "Browser" },
] as const

const SEMANTIQUES = [
  {
    nom: "destructive",
    texte: "text-destructive",
    teinte: "bg-destructive/10",
  },
  { nom: "success", texte: "text-success", teinte: "bg-success/10" },
  { nom: "warning", texte: "text-warning", teinte: "bg-warning/10" },
  { nom: "primary-text", texte: "text-primary-text", teinte: "bg-primary/10" },
] as const

export function Atelier() {
  const [accent, setAccent] =
    useState<(typeof ACCENTS)[number]["id"]>("members")

  const [theme, setTheme] = useState<ThemePreference>("system")
  const [section, setSection] = useState(() => location.hash || "#button")

  useEffect(() => {
    const racine = document.documentElement
    if (accent) racine.dataset.accent = accent
    else delete racine.dataset.accent
  }, [accent])

  useEffect(() => {
    const systeme = window.matchMedia("(prefers-color-scheme: dark)")
    const appliquer = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && systeme.matches)
      )
    appliquer()
    systeme.addEventListener("change", appliquer)
    return () => systeme.removeEventListener("change", appliquer)
  }, [theme])

  useEffect(() => {
    const suivre = () => setSection(location.hash || "#button")
    window.addEventListener("hashchange", suivre)
    return () => window.removeEventListener("hashchange", suivre)
  }, [])

  return (
    <AppShell
      application={{
        nom: "Atelier",
        sousTitre: "@etic-insa/ui",
        logo: <BoxIcon />,
      }}
      sections={[
        {
          titre: "Composants",
          liens: [
            { libelle: "Button", href: "#button", icone: BoxIcon },
            {
              libelle: "Couleurs de texte",
              href: "#couleurs",
              icone: PaletteIcon,
            },
          ].map((lien) => ({ ...lien, actif: lien.href === section })),
        },
      ]}
      compte={{
        nom: "Ada Lovelace",
        detail: "ada@example.org",
        initiales: "AL",
        entrees: [
          { libelle: "Mon profil", href: "#profil", icone: UserIcon },
          { libelle: "Paramètres", href: "#parametres", icone: SettingsIcon },
        ],
        seDeconnecter: () => {},
      }}
      theme={{ valeur: theme, changer: setTheme }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold">Atelier @etic-insa/ui</h1>
          <p className="text-sm text-muted-foreground">
            Thème : bouton au pied de la barre latérale. Sous 1 025 px, la barre
            devient un tiroir.
          </p>
          <div
            role="group"
            aria-label="Couleur d'accent"
            className="flex flex-wrap gap-2"
          >
            {ACCENTS.map(({ id, nom }) => (
              <Button
                key={id || "aucun"}
                aria-pressed={accent === id}
                variant={accent === id ? "default" : "outline"}
                size="sm"
                onClick={() => setAccent(id)}
              >
                {nom}
              </Button>
            ))}
          </div>
        </header>

        <section id="button" className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Button</h2>
          <div className="flex flex-wrap gap-2">
            {VARIANTES.map((variante) => (
              <Button key={variante} variant={variante}>
                {variante}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TAILLES.map((taille) => (
              <Button key={taille} size={taille} variant="outline">
                {taille}
              </Button>
            ))}
            <Button disabled>désactivé</Button>
          </div>
        </section>

        <section id="couleurs" className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Couleurs de texte</h2>
          <p className="text-sm text-muted-foreground">
            Chaque couleur sur le fond, sur <code>muted</code> et sur sa propre
            teinte : toutes atteignent 4,5:1 (vérifié par{" "}
            <code>src/theme.test.ts</code>).
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SEMANTIQUES.map(({ nom, texte, teinte }) =>
              ["bg-background border", "bg-muted", teinte].map((fond) => (
                <div
                  key={`${nom}-${fond}`}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${fond} ${texte}`}
                >
                  {nom}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
