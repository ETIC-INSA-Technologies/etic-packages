# etic-packages

Paquets publics communs aux applications ETIC (ETIC Members, ETIC Docs, Intervenant,
Browser).

| Paquet                                                          | Dossier         | Rôle                                                     |
| --------------------------------------------------------------- | --------------- | -------------------------------------------------------- |
| [`@etic-insa/ui`](packages/ui/README.md)                        | `packages/ui`   | composants React, sur shadcn et Base UI, et thème commun |
| [`@etic-insa/auth` + `etic-insa-auth`](packages/auth/README.md) | `packages/auth` | connexion à ETIC Members : React (npm) et FastAPI (PyPI) |

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

Les commandes propres à un paquet (atelier de l'UI, côté Python de l'auth avec uv…) se
lancent depuis son dossier ; voir son README.

## Publier

Les versions sont calculées par [Changesets](https://changesets.dev) et publiées par le workflow
`.github/workflows/publication.yml`, sans jeton npm (trusted publishing).

1. Avec toute modification d'un paquet publié, lancer `npx changeset` : paquets touchés, type
   (`patch` correctif, `minor` ajout, `major` changement cassant ; pendant les versions `0.x`, un
   changement cassant est un `minor`) et une phrase pour le journal. Commiter le fichier créé
   dans `.changeset/`.
2. Une fois sur `main`, le workflow ouvre ou met à jour la PR « Versions des paquets » (numéros
   de version et `CHANGELOG.md`).
3. Fusionner cette PR publie les nouvelles versions sur npm, avec leur provenance, et
   `etic-insa-auth` sur PyPI quand le numéro de `@etic-insa/auth` y est nouveau.

**Préversion** pour tester une modification sur un serveur avant de la publier : onglet
_Actions_ → _Publication_ → _Run workflow_ sur la branche voulue. Les paquets qui ont un
changeset en attente partent en `0.0.0-preview-<date>` sous l'étiquette npm `preview` ; seule
une application qui demande `npm i @etic-insa/ui@preview` les reçoit.

### Mise en place (une fois)

- **GitHub, actions** : _Settings_ → _Actions_ → _General_ → cocher « Allow GitHub Actions to
  create and approve pull requests » (pour la PR « Versions des paquets »).
- **GitHub, environnement `npm`** : _Settings_ → _Environments_ → _New environment_ `npm` →
  _Required reviewers_ : un ou deux mainteneurs. Toute publication, préversion comprise, attend
  alors leur approbation dans l'onglet _Actions_.
- **GitHub, environnement `pypi`** : idem, pour la publication du côté Python de l'auth.
- **PyPI, `etic-insa-auth`** : sur pypi.org, compte de l'organisation (double
  authentification) → _Your projects_ → _Publishing_ → _Add a new pending publisher_ :
  projet `etic-insa-auth`, propriétaire `ETIC-INSA-Technologies`, dépôt `etic-packages`, workflow
  `publication.yml`, environnement `pypi`. Le projet est créé à la première publication.
- **npm, pour chaque paquet** : _Settings_ du paquet sur npmjs.com → _Trusted publishing_ →
  GitHub Actions ; organisation `ETIC-INSA-Technologies`, dépôt `etic-packages`, workflow
  `publication.yml`, **environnement `npm`** (npm refuse alors toute publication qui n'est pas
  passée par l'approbation) ; dans les actions autorisées, **cocher `npm publish`** (sinon
  seule une publication mise en attente, `npm stage publish`, est permise). Une configuration
  doit servir dans les 2 jours, sinon la recréer.
- **CI de la PR « Versions des paquets »** : ouverte par le jeton du workflow, elle ne
  déclenche pas `ci.yml`. Pour voir ses contrôles, la fermer puis la rouvrir ; de toute façon,
  la publication relance lint, types et tests avant d'empaqueter.
- **Si npmjs.com ne propose ces réglages qu'une fois le paquet créé**, publier la première
  version à la main, depuis un poste connecté au compte npm de l'organisation (double
  authentification) :

  ```sh
  npm ci && npm run build
  npm publish --workspace packages/<dossier> --provenance=false
  ```

  (la provenance n'est possible que depuis la CI), puis configurer l'éditeur de confiance comme
  ci-dessus : les versions suivantes passent par le workflow.

## Règle absolue

Les paquets et ce dépôt sont publics : aucun secret, URL interne, nom de client ni code métier.
