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
`link` du bouton) : leurs enveloppes ETIC devront le corriger. **Limite actuelle** : le `Button`
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

### Développer contre les sources locales

Pour voir une modification d'`etic-ui` instantanément dans une application, sans publier, avec
`etic-ui` cloné à côté de l'application :

```ts
// vite.config.ts de l'application : en développement seulement
export default defineConfig(({ command }) => ({
  resolve:
    command === "serve"
      ? {
          alias: {
            "@etic-insa/ui": path.resolve(__dirname, "../etic-ui/src"),
            // les composants s'importent entre eux par « @etic-ui/… »
            "@etic-ui": path.resolve(__dirname, "../etic-ui/src"),
          },
          // une seule copie de React, même si etic-ui a ses propres node_modules
          dedupe: ["react", "react-dom"],
        }
      : {},
}))
```

Côté CSS, ajouter `@source "../../etic-ui/src";` et importer `../../etic-ui/src/styles.css` au
lieu du paquet.

## Développer la bibliothèque

Node : la version de `.nvmrc` (`nvm use`).

```sh
npm install
npm run dev        # atelier : tous les composants, touche « d » pour le thème sombre
npm test           # vitest
npm run typecheck
npm run lint
npm run format:check
npm run build      # dist/ : un module par composant, types, styles.css
```

### Organisation

- `src/components/ui/` : composants shadcn **intacts**, tels que le CLI les installe
  (`npx shadcn add <composant>`). On n'y modifie rien, pour que
  `npx shadcn add <composant> --diff` puis `--overwrite` suivent shadcn sans rien perdre.
- `src/components/etic/` : composants ETIC qui importent ceux de `ui/` et ajoutent
  comportement, composition ou variantes.
- `src/index.ts` : tout ce qu'une application peut importer. Un composant non exporté ici
  n'existe pas pour les applications.
- `src/styles.css` : thème commun (clair et sombre). Au build, `scripts/build-css.mjs` y recopie
  `shadcn/tailwind.css`, pour que les applications n'aient pas à installer le CLI shadcn.
- `atelier/` : la page de démonstration servie par `npm run dev`. Elle n'est pas publiée.

### Règle absolue

Le paquet et ce dépôt sont publics : aucun secret, URL interne, nom de client ni code métier.
