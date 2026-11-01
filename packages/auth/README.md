# @etic-insa/auth · etic-insa-auth

Connexion des applications ETIC à ETIC Members, des deux côtés :

| Côté       | Paquet                                      | Rôle                                                        |
| ---------- | ------------------------------------------- | ----------------------------------------------------------- |
| serveur    | `etic-insa-auth` (PyPI), module `etic_auth` | SSO, session serveur, droits et préférences, pour FastAPI   |
| navigateur | `@etic-insa/auth` (npm)                     | session, droits pour l'affichage, thème partagé, pour React |

Les deux portent **le même numéro de version** : ils forment un seul contrat, les routes
`/api/v1/auth/*` ci-dessous. Une application installe les deux au même numéro.

Contrat amont : `docs/etic-members-external/AUTHENTICATION.md` du dépôt ETIC Members.

## Le principe

```
navigateur ──cookie──► serveur de l'application ──identifiants d'app + jeton──► ETIC Members
(l'écran)              (session, jetons chiffrés,                              (membres, droits,
                        introspection à chaque requête)                         préférences)
```

- Le navigateur ne voit **jamais** de jeton ETIC Members : il porte un cookie `httpOnly` qui
  désigne une session gardée côté serveur, jetons chiffrés en base.
- Le serveur vérifie la session **à chaque requête** auprès d'ETIC Members (introspection,
  cache de 30 s au plus) : un membre désactivé ou déconnecté est coupé dans les 30 s.
- **Le serveur fait autorité, toujours.** Ce que le navigateur masque selon les droits n'est
  qu'un confort d'affichage ; chaque route protégée passe par `auth.exiger(…)`.
- Aucun secret dans ce paquet : le secret d'application, celui du cookie et la clé de
  chiffrement viennent de la configuration de chaque serveur.

## Côté serveur (FastAPI)

```sh
uv add "etic-insa-auth[sqlalchemy]"
```

```python
from typing import Annotated
from fastapi import Depends, FastAPI
from etic_auth import AuthEtic, ConfigSSO, Principal
from etic_auth.sqlalchemy import ColonnesSession, StockageSQLAlchemy


class SessionSatellite(ColonnesSession, Base):  # Base : la base déclarative de l'application
    __tablename__ = "sessions_auth"             # migration Alembic à écrire par l'application


auth = AuthEtic(
    ConfigSSO.depuis_env(
        "ETIC Intervenant",
        implications={"intervenant.manage": frozenset({"intervenant.read"})},
    ),
    StockageSQLAlchemy(SessionLocal, SessionSatellite),
)
app = FastAPI(lifespan=…)  # appeler `await auth.fermer()` à l'arrêt
auth.installer(app)

Lecture = Annotated[Principal, Depends(auth.exiger("intervenant.read"))]


@app.get("/api/v1/missions")
def missions(principal: Lecture): …
```

`installer` pose le cookie de session (`__Host-etic_session`, signé, `httpOnly`, `SameSite=Lax` ;
le préfixe `__Host-` empêche un autre sous-domaine de le poser à sa place), le contrôle
d'origine des écritures (anti-CSRF entre sous-domaines d'etic-insa.com), le gestionnaire
d'erreurs et les routes :

| Route                            | Rôle                                                                       |
| -------------------------------- | -------------------------------------------------------------------------- |
| `GET /api/v1/auth/login`         | `?suivant=/chemin` : envoie le navigateur vers ETIC Members (PKCE)         |
| `GET /api/v1/auth/callback`      | retour du SSO ; en cas d'échec, renvoie vers `/login?erreur=<code>`        |
| `GET /api/v1/auth/me`            | identité, droits développés et préférences d'interface de la session       |
| `PATCH /api/v1/auth/preferences` | `{"theme": "system" \| "light" \| "dark"}`, enregistré pour toute la suite |
| `POST /api/v1/auth/logout`       | révoque et supprime la session ; réussit même sans session                 |

Erreurs dans l'enveloppe commune `{"error": {"code", "message", "details"}}` : `401
unauthenticated` (avec `details.action = "relancer_authorize"` quand seule une reconnexion
peut aboutir), `403 forbidden` (`details.required_permission`), `403 account_disabled`,
`403 account_alumni`, `502 external_service_unavailable`.

### Réglages (`ConfigSSO`)

`ConfigSSO.depuis_env(nom, **reglages)` lit :

| Variable                     | Exemple                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `ETIC_MEMBERS_API`           | `https://auth.etic-insa.com`                            |
| `ETIC_MEMBERS_AUTHORIZE_URL` | `https://auth.etic-insa.com/api/v1/auth/sso/authorize`  |
| `ETIC_APP_CODE`              | code de l'application enregistrée dans ETIC Members     |
| `ETIC_APP_SECRET`            | son secret                                              |
| `ETIC_APP_URL`               | `https://intervenant.etic-insa.com`                     |
| `SESSION_SECRET`             | `openssl rand -hex 32`, signe le cookie                 |
| `ENCRYPTION_KEY`             | `openssl rand -hex 32`, chiffre les jetons ; différente |

Dans ETIC Members, l'URL de retour à enregistrer est `ETIC_APP_URL` suivie de
`/api/v1/auth/callback`. Le front et l'API sont servis sous la même origine.

Réglages utiles : `statuts_admis` (par défaut les seuls membres `active` ; ajouter `"alumni"`
pour accueillir les anciens), `implications` (permissions impliquées), `duree_session`
(12 h), `chemins_sans_cookie` (webhooks exemptés du contrôle d'origine), `cookie_https=False`
en développement local seulement (le cookie s'appelle alors `etic_session` : sans HTTPS, le
navigateur refuserait un cookie `__Host-`).

Sessions : `StockageSQLAlchemy` (une table, voir ci-dessus) ou `StockageMemoire` (tests, ou un
seul processus qui accepte de déconnecter tout le monde au redémarrage). Le verrou de
rafraîchissement est en mémoire : l'application tourne avec un seul processus serveur.

### Tests de l'application

```python
from etic_auth.testing import principal_de_test, simuler_principal

simuler_principal(app, auth, principal_de_test(permissions=("intervenant.read",)))
```

Passe par `app.dependency_overrides` : il n'existe aucun mode « mock » à oublier activé en
production.

### Droits sans session

Pour une requête relayée par un tiers (carte CRM, webhook) dont le membre est déjà connu :
`await auth.client.droits_membre(membre_id)` puis `auth.verifier_statut(droits.status)` (scope
`eticmembers.authz.read` requis côté ETIC Members).

## Côté navigateur (React)

```sh
npm i @etic-insa/auth @tanstack/react-query
```

```tsx
import {
  AuthProvider,
  SessionRequise,
  SiPermission,
  lireErreurConnexion,
  signalerNonAuthentifie,
  useAuth,
} from "@etic-insa/auth"

// Sous le QueryClientProvider de l'application.
;<AuthProvider surNonAuthentifie={() => naviguer("/login")}>
  <SessionRequise
    sansSession={<PageConnexion />}
    chargement={<Squelette />}
    erreur={(erreur, reessayer) => (
      <Erreur erreur={erreur} onReessayer={reessayer} />
    )}
  >
    <Application />
  </SessionRequise>
</AuthProvider>

function PageConnexion() {
  const { seConnecter } = useAuth()
  const echec = lireErreurConnexion(location.search) // { code, message } ou null
  return (
    <Button onClick={() => seConnecter("/")}>
      Se connecter avec ETIC Members
    </Button>
  )
}

function Barre() {
  const { me, theme, changerTheme, deconnecter } = useAuth()
  // `theme` vient d'ETIC Members ; `changerTheme` l'enregistre pour toute la suite.
  return (
    <SiPermission code="intervenant.manage">
      <Lien vers="/administration" />
    </SiPermission>
  )
}
```

- `SessionRequise` distingue trois états : chargement, panne (« Réessayer », surtout pas un
  renvoi vers la connexion) et absence de session.
- **Sur tout 401 de ses propres appels**, l'application appelle `signalerNonAuthentifie()` :
  le fournisseur oublie la session et appelle `surNonAuthentifie`.
- Après `deconnecter()`, l'application affiche sa page de connexion **sans** relancer le SSO :
  la session ETIC Members est toujours ouverte, et la relancer reconnecterait aussitôt.
- `lireErreurConnexion(location.search, messages?)` rend le code d'échec du SSO et un texte
  par défaut, que `messages` remplace code par code.
- `nomAffichage(me)` donne le libellé à afficher (jamais prénom + nom recollés : un compte
  fonctionnel n'en a pas) ; `aPermission(me, code)` la même règle que `SiPermission`.

### Client HTTP commun

`creerClientHttp` est le client des appels d'une application à son API. Il ne dépend ni de
React ni de react-query.

```ts
import {
  creerClientHttp,
  ErreurApi,
  signalerNonAuthentifie,
} from "@etic-insa/auth"

// Application satellite : session par cookie.
export const api = creerClientHttp({
  base: "/api/v1",
  credentials: "include",
  surNonAuthentifie: signalerNonAuthentifie,
})

// ETIC Members : jeton Bearer gardé par l'application.
export const api = creerClientHttp({
  base: API_BASE_URL,
  jeton: () => lireJeton(),
  surNonAuthentifie: () => effacerJeton(),
})

await api.get<Membre[]>("/membres", { query: { statut: ["active", "alumni"] } })
await api.post("/membres", { nom: "Ada" })
await api.post("/fichiers", undefined, { corpsBrut: formulaire })
const photo = await api.lireBlob(`/membres/${id}/photo`)
```

- Toute requête qui n'aboutit pas lève une `ErreurApi` (`status`, `code`, `message`,
  `details`) : celle de l'enveloppe `{"error": {…}}` du backend, ou un code et un texte lisibles
  déduits du statut. `ApiError` est la même classe, sous le nom des anciennes copies.
- Codes propres au client, avec `status` 0 : `network_error` (`CODE_RESEAU`, pas de réponse) et
  `delai_depasse` (`CODE_DELAI_DEPASSE`, 30 s par défaut, réglable par `delaiMax`).
  L'annulation demandée par l'appelant (`signal`) reste une annulation.
- Une page HTML (ou tout autre corps qui n'est pas du JSON) reçue en 200 lève
  `reponse_non_json` (`CODE_REPONSE_NON_JSON`) : en pratique, `/api` n'est pas routé vers le
  backend et le proxy a servi l'`index.html`. `lireBlob` refuse de même une page HTML.
- Le jeton, lu à chaque requête, ne sert qu'à l'en-tête `Authorization` : il n'apparaît dans
  aucune erreur ni aucun journal. Une requête qui le porte ne suit aucune redirection
  (`redirection_refusee`, `CODE_REDIRECTION_REFUSEE`), et un chemin doit commencer par un seul
  `/` : `//hote` mènerait le jeton vers une autre origine.
- `surNonAuthentifie` est appelé sur tout 401, avant que l'erreur soit levée.

## Développer

Côté navigateur, comme les autres paquets (`npm run lint`, `typecheck`, `test`, `build`
depuis la racine). Côté serveur, depuis `packages/auth`, avec [uv](https://docs.astral.sh/uv/) :

```sh
uv sync
uv run ruff format python && uv run ruff check python
uv run pytest
```

Toute modification de l'un des deux côtés passe par `npx changeset` sur `@etic-insa/auth` : le
paquet Python en reprend le numéro.
