# @etic/ui

Bibliothèque de composants React des applications ETIC (ETIC Members, ETIC Docs…), construite
sur [shadcn/ui](https://ui.shadcn.com) (style Nova, couleur de base Neutral) et
[Base UI](https://base-ui.com), avec Tailwind CSS 4, les icônes lucide et la police Geist.

## Utiliser la bibliothèque dans une application

```sh
npm i @etic/ui
```

Prérequis : React 19 et Tailwind CSS 4 (`tailwindcss` et `@tailwindcss/vite`).

```css
/* CSS principal de l'application */
@import "tailwindcss";
@import "@etic/ui/styles.css";
/* Tailwind doit lire les classes des composants ; chemin relatif à ce fichier */
@source "../node_modules/@etic/ui/dist";

/* Couleur d'accent de l'application, dans les deux thèmes : une règle :root
   placée après l'import s'applique aussi en sombre, où la bibliothèque prévoit
   un --primary-foreground foncé. */
:root,
.dark {
  --primary: #2f5fdb;
  --primary-foreground: #ffffff;
}
```

Le contrat complet de la couleur d'accent (accent en texte, anneau de focus) est encore à poser.

```tsx
import { Button } from "@etic/ui"

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
            "@etic/ui": path.resolve(__dirname, "../etic-ui/src"),
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
