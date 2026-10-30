# etic-packages

Paquets npm publics communs aux applications ETIC (ETIC Members, ETIC Docs, Intervenant,
Browser).

| Paquet                                   | Dossier       | Rôle                                                     |
| ---------------------------------------- | ------------- | -------------------------------------------------------- |
| [`@etic-insa/ui`](packages/ui/README.md) | `packages/ui` | composants React, sur shadcn et Base UI, et thème commun |

## Développer

Node : la version de `.nvmrc` (`nvm use`). `npm install` à la racine installe tous les paquets
(npm workspaces).

```sh
npm run format:check   # Prettier, tout le dépôt
npm run lint           # chaque paquet
npm run typecheck
npm test
npm run build
```

Les commandes propres à un paquet (atelier de l'UI…) se lancent depuis son dossier ; voir son
README.

## Règle absolue

Les paquets et ce dépôt sont publics : aucun secret, URL interne, nom de client ni code métier.
