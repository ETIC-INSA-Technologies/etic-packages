# @etic-insa/ui

Bibliothèque de composants React des applications ETIC (ETIC Members, ETIC Docs…), construite
sur [shadcn/ui](https://ui.shadcn.com) (style Nova, couleur de base Neutral) et
[Base UI](https://base-ui.com), avec Tailwind CSS 4, les icônes lucide et la police Geist.

## Utiliser la bibliothèque dans une application

```sh
npm i @etic-insa/ui
```

Prérequis : React 19 et Tailwind CSS 4 (`tailwindcss` et `@tailwindcss/vite`).

```css
/* CSS principal de l'application */
@import "tailwindcss";
@import "@etic-insa/ui/styles.css";
/* Tailwind doit lire les classes des composants ; chemin relatif à ce fichier */
@source "../node_modules/@etic-insa/ui/dist";

/* Couleur d'accent de l'application : les quatre variables, en clair ET en sombre. */
:root {
  --primary: #2f5fdb;
  --primary-foreground: #ffffff;
  --primary-text: #2f5fdb;
  --ring: #2f5fdb;
}
.dark {
  --primary: #6d92f2;
  --primary-foreground: #0e1116;
  --primary-text: #6d92f2;
  --ring: #6d92f2;
}
```

### Thème et couleur d'accent

La bibliothèque fournit tout le thème (neutres, rayons, police, couleurs `destructive`, `success`
et `warning`, clair et sombre) sauf la couleur d'accent. Chaque application remplit, après
l'import de `styles.css`, en `:root` et en `.dark`, quatre variables :

| Variable               | Rôle                                 | Exigence                         |
| ---------------------- | ------------------------------------ | -------------------------------- |
| `--primary`            | aplats : bouton principal, sélection | —                                |
| `--primary-foreground` | texte posé sur `--primary`           | ≥ 4,5:1 sur `--primary`          |
| `--primary-text`       | l'accent employé comme texte ou lien | ≥ 4,5:1 sur le fond et `--muted` |
| `--ring`               | anneau de focus                      | ≥ 3:1 sur le fond et `--muted`   |

Un accent clair (orange, jaune, vert pâle) ne supporte ni texte blanc ni rôle de texte : il prend
un `--primary-foreground` foncé et un `--primary-text` plus sombre que lui.

Les couleurs appartiennent à chaque application : la bibliothèque n'en livre aucune et ne
connaît pas les applications. [`atelier/accents.css`](atelier/accents.css) contient seulement
des exemples, aux couleurs des applications ETIC, pour voir les composants avec un vrai accent
dans l'atelier ; `npm test` vérifie que ces exemples tiennent les exigences ci-dessus. Il n'est
pas publié et n'est pas la référence d'une application.

Dans les classes, l'accent comme texte s'écrit `text-primary-text`, jamais `text-primary`. Les
composants shadcn d'origine (`src/components/ui/`) emploient parfois `text-primary` (variante
`link` du bouton) : à corriger, dans le composant ou dans une enveloppe ETIC. **Limite actuelle** : le `Button`
exporté est encore celui de shadcn ; avec un accent clair (Docs, Intervenant, Browser), sa
variante `link` est illisible en thème clair. Ne pas l'employer avant son enveloppe.

Le thème sombre s'active par la classe `dark` sur `<html>`.

```tsx
import { Button } from "@etic-insa/ui"

export function Export() {
  return (
    <Button variant="outline" className="w-full">
      Exporter
    </Button>
  )
}
```

### Coquille d'application

`AppShell` pose la mise en page commune : barre latérale de shadcn (marque, rubriques, menu du
compte, thème), repliable en colonne d'icônes sur ordinateur (rail ou Ctrl+B, état gardé dans le
cookie `sidebar_state` de shadcn), qui devient un tiroir ouvert par une barre du haut sous
1 025 px (téléphones et tablettes). Il ne connaît ni le routeur ni l'authentification : l'application donne les liens et
leur état actif, le compte et le thème, et son composant de lien.

```tsx
import { AppShell } from "@etic-insa/ui"
import { Link, Outlet, useLocation } from "react-router-dom"
import { UsersIcon } from "lucide-react"

const LienRouteur = ({ href, ...props }: React.ComponentProps<"a">) => (
  <Link to={href!} {...props} />
)

export function MiseEnPage() {
  const { pathname } = useLocation()
  return (
    <AppShell
      application={{ nom: "ETIC Docs", logo: <img src={logo} alt="" /> }}
      sections={[
        {
          titre: "Études",
          liens: [
            {
              libelle: "Études",
              href: "/etudes",
              icone: UsersIcon,
              actif: pathname.startsWith("/etudes"),
            },
          ],
        },
      ]}
      compte={{ nom: "Ada Lovelace", initiales: "AL", seDeconnecter }}
      theme={{ valeur: theme, changer: changerTheme }}
      lien={LienRouteur}
    >
      <Outlet />
    </AppShell>
  )
}
```

`changer` peut renvoyer une promesse : rejetée, elle affiche « Thème non enregistré ». La
déconnexion est toujours confirmée. La coquille fournit l'élément `<main>` : les pages n'en
ajoutent pas. `ThemeMenu` existe aussi seul (page de connexion…).

### Développer contre les sources locales

Pour voir une modification de la bibliothèque instantanément dans une application, sans publier,
avec le dépôt `etic-packages` cloné sur le même poste :

```ts
// vite.config.ts de l'application : en développement seulement
// (chemin vers packages/ui/src, ici pour une application à côté d'etic-packages)
const UI_SRC = path.resolve(__dirname, "../etic-packages/packages/ui/src")

export default defineConfig(({ command }) => ({
  resolve:
    command === "serve"
      ? {
          alias: {
            "@etic-insa/ui": UI_SRC,
            // les composants s'importent entre eux par « @etic-ui/… »
            "@etic-ui": UI_SRC,
          },
          // une seule copie de React, même si etic-packages a ses propres node_modules
          dedupe: ["react", "react-dom"],
        }
      : {},
}))
```

Côté CSS, ajouter un `@source` vers ce même dossier `src` et importer son `styles.css` au lieu
de celui du paquet.

## Développer la bibliothèque

Node : la version de `.nvmrc` (`nvm use`). Dépôt monorepo : `npm install` à la racine
d'`etic-packages` installe tous les paquets.

```sh
# depuis packages/ui
npm run dev        # atelier : tous les composants, thème au pied de la barre latérale
npm test           # vitest
npm run typecheck
npm run lint
npm run build      # dist/ : un module par composant, types, styles.css
# depuis la racine : les mêmes scripts pour tous les paquets, plus npm run format:check
```

### Organisation

- `src/components/ui/` et `src/hooks/` : composants shadcn, copiés par le CLI
  (`npx shadcn add <composant>`). Ce code est le nôtre et se modifie comme le reste. Chaque
  modification est listée ci-dessous, pour pouvoir la réappliquer si l'on reprend un jour la
  version de shadcn (`npx shadcn add <composant> --diff`, puis `--overwrite`) ;
  `src/ecarts-shadcn.test.ts` échoue si elle a disparu :
  - seuil mobile à 1 024 px compris au lieu de 768 px : `hooks/use-mobile.ts` (réécrit avec
    `useSyncExternalStore`, juste dès le premier rendu) et les variantes `md:` de
    `components/ui/sidebar.tsx`, devenues `min-[1025px]:` ;
  - textes en français, lus par les lecteurs d'écran : `sidebar.tsx` (« Menu »,
    « Afficher ou masquer le menu »), `sheet.tsx` (« Fermer »).
- `src/components/etic/` : composants ETIC qui importent ceux de `ui/` et ajoutent
  comportement, composition ou variantes.
- `src/index.ts` : tout ce qu'une application peut importer. Un composant non exporté ici
  n'existe pas pour les applications.
- `src/styles.css` : thème commun (clair et sombre). Au build, `scripts/build-css.mjs` y recopie
  `shadcn/tailwind.css`, pour que les applications n'aient pas à installer le CLI shadcn.
- `atelier/` : la page de démonstration servie par `npm run dev`. Elle n'est pas publiée.

### Règle absolue

Le paquet et ce dépôt sont publics : aucun secret, URL interne, nom de client ni code métier.
