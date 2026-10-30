"""Client serveur-à-serveur de l'API externe d'ETIC Members (`/api/ext/v1`).

Contrat : `docs/etic-members-external/AUTHENTICATION.md` du dépôt ETIC Members (§ cités).

- Les deux en-têtes d'application accompagnent **chaque** appel, depuis le serveur seulement :
  le secret ne quitte jamais le backend.
- **Jamais** de jeton journalisé ni en query string.
- La **révocation passe par l'introspection**, pas par `exp` : cache de 30 s au plus, jamais
  au-delà de `exp`. Ce cache borne le délai de révocation. Le jeton n'est jamais décodé.
- **PKCE S256** sur chaque aller-retour.
- Des requêtes concurrentes qui manquent le même cache partagent **un seul** appel amont : une
  page lance plusieurs requêtes à la fois, qui ne doivent pas coûter autant d'introspections.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any, Final, Literal, NamedTuple
from urllib.parse import urlencode

from cachetools import TLRUCache
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .config import ConfigSSO
from .erreurs import (
    CODE_COMPTE_DESACTIVE,
    MESSAGE_SESSION_EXPIREE,
    ErreurAuth,
    non_authentifie,
    service_indisponible,
)
from .transport import BUDGET_APPEL_INTERACTIF_SECONDES, ErreurAmont, Transport

logger = logging.getLogger(__name__)

EN_TETE_CODE_APPLICATION: Final = "X-Application-Code"
EN_TETE_SECRET_APPLICATION: Final = "X-Application-Secret"

CHEMIN_TOKEN: Final = "/api/ext/v1/sso/token"
CHEMIN_REVOKE: Final = "/api/ext/v1/sso/revoke"
CHEMIN_INTROSPECT: Final = "/api/ext/v1/sso/introspect"
CHEMIN_AUTHZ_PERMISSIONS: Final = "/api/ext/v1/authz/permissions"
CHEMIN_ME: Final = "/api/ext/v1/me"
CHEMIN_PREFERENCES: Final = "/api/ext/v1/me/preferences"

#: Plafond du cache d'introspection (§3.4).
CACHE_INTROSPECTION_SECONDES: Final = 30.0
#: Un `{"active": false}` ne reste que le temps d'absorber les requêtes parallèles d'une page.
CACHE_INTROSPECTION_NEGATIVE_SECONDES: Final = 5.0
#: Droits lus sans jeton (§4) : même borne de délai de révocation que l'introspection.
CACHE_DROITS_SECONDES: Final = 30.0
#: Entrées au plus par cache : les jetons d'utilisateurs partis ne s'accumulent pas.
CACHE_TAILLE_MAX: Final = 10_000

Theme = Literal["system", "light", "dark"]


# --------------------------------------------------------------------------------------
# Modèles — reflet des contrats (§5). `extra="ignore"` : un champ ajouté par ETIC Members ne
# casse rien ; un champ requis absent est une réponse hors contrat, pas un repli silencieux.
# --------------------------------------------------------------------------------------


class MembreSSO(BaseModel):
    """Objet `member` de `POST /sso/token`."""

    model_config = ConfigDict(extra="ignore")

    id: str
    email: str
    #: Libellé prêt à afficher (§3.5) : « Prénom Nom », le rôle d'un compte fonctionnel,
    #: l'e-mail à défaut. Jamais vide.
    display_name: str


class JetonSSO(BaseModel):
    """Réponse de `POST /sso/token`, pour l'échange de code comme pour le rafraîchissement."""

    model_config = ConfigDict(extra="ignore")

    access_token: str
    expires_in: int
    #: Opaque, à usage unique : chaque rafraîchissement en rend un nouveau.
    refresh_token: str
    #: Secondes avant l'expiration absolue de la chaîne de rafraîchissement.
    refresh_expires_in: int
    member: MembreSSO

    def __repr__(self) -> str:  # pragma: no cover - confort de débogage
        return f"JetonSSO(member={self.member.id!r})"


class Introspection(BaseModel):
    """Réponse de `POST /sso/introspect`, toujours `200` : `active` est le seul champ garanti.

    `permissions: []` est un état normal : l'identité ne confère aucun droit en soi.
    """

    model_config = ConfigDict(extra="ignore")

    active: bool
    member_id: str | None = None
    email: str | None = None
    display_name: str | None = None
    status: str | None = None
    permissions: list[str] = Field(default_factory=list)
    is_superadmin: bool = False
    exp: int | None = None
    app_code: str | None = None


class DroitsMembre(BaseModel):
    """Réponse de `GET /authz/permissions` (§4) : les droits d'un membre, **sans** dire que
    c'est bien lui qui parle — cette route n'authentifie personne."""

    model_config = ConfigDict(extra="ignore", frozen=True)

    member_id: str
    status: str
    permissions: frozenset[str]
    is_superadmin: bool


class Preferences(BaseModel):
    """Préférences d'interface partagées par toute la suite (§3.6)."""

    model_config = ConfigDict(extra="ignore")

    theme: Theme = "system"


class Profil(BaseModel):
    """Ce que le paquet lit de `GET /me` : les préférences d'interface."""

    model_config = ConfigDict(extra="ignore")

    preferences: Preferences = Field(default_factory=Preferences)


# --------------------------------------------------------------------------------------
# Traduction des erreurs (§7)
# --------------------------------------------------------------------------------------

MESSAGE_INVALID_GRANT: Final = (
    "La connexion ETIC Members a expiré ou a déjà servi. Relancez la connexion."
)
MESSAGE_MEMBRE_DESACTIVE: Final = "Votre compte ETIC Members est désactivé."
MESSAGE_SERVICE_INDISPONIBLE: Final = (
    "Le service d'authentification ETIC Members est indisponible. Réessayez dans un instant."
)

Contexte = Literal["token", "refresh", "revoke", "introspect", "authz", "profil"]


def traduire_erreur(erreur: ErreurAmont, *, contexte: Contexte, nom_application: str) -> ErreurAuth:
    """Erreur d'ETIC Members → réponse de l'application. Décide sur le code amont.

    | Amont | Réponse |
    |---|---|
    | `500 server_misconfigured` | 502 + journal `critical`, session conservée |
    | `400 invalid_grant` (échange, rafraîchissement) | 401, `action=relancer_authorize` |
    | autre `400` (requête mal formée : défaut de l'application) | 502 + journal `error` |
    | `401` sur `/me` (jeton du membre refusé : déconnecté d'ETIC Members) | 401 |
    | autre `401` (identifiants d'application refusés) | 502 + journal `critical` |
    | `403 member_disabled` à l'échange ou sur `/me` | 403 `account_disabled` |
    | autre `403` (application révoquée, scope absent) | 502 + journal `critical` |
    | timeout, réseau, `429`, `5xx`, `404` | 502 |

    Un défaut de configuration ne renvoie pas l'utilisateur vers la connexion : il y bouclerait
    pour un problème qui n'est pas le sien.
    """
    statut = erreur.status
    code = erreur.code.lower()

    def configuration(raison: str) -> ErreurAuth:
        logger.critical(
            "ETIC Members refuse l'application : vérifier ses identifiants et ses scopes",
            extra={"raison": raison, "contexte": contexte, "statut_amont": statut},
        )
        return service_indisponible(
            f"L'accès de {nom_application} à ETIC Members est refusé. Prévenez un administrateur.",
            raison=raison,
            statut_amont=statut,
        )

    if code == "server_misconfigured":
        logger.critical("ETIC Members mal configuré", extra={"contexte": contexte})
        return service_indisponible(MESSAGE_SERVICE_INDISPONIBLE, raison=code, statut_amont=statut)
    if statut == 400:
        if code == "invalid_grant" and contexte in ("token", "refresh"):
            return non_authentifie(MESSAGE_INVALID_GRANT, raison=code, reconnecter=True)
        logger.error(
            "requête refusée par ETIC Members comme mal formée",
            extra={"contexte": contexte, "code_amont": code},
        )
        return service_indisponible(
            MESSAGE_SERVICE_INDISPONIBLE, raison="requete_hors_contrat", statut_amont=statut
        )
    if statut == 401:
        if contexte == "profil":
            # L'introspection vient de passer avec les mêmes identifiants d'application :
            # c'est le jeton du membre qui est refusé, dans les 30 s de son cache.
            return non_authentifie(MESSAGE_SESSION_EXPIREE, raison="jeton_refuse", reconnecter=True)
        return configuration("identifiants_application_refuses")
    if statut == 403:
        if code == "member_disabled" and contexte in ("token", "profil"):
            return ErreurAuth(
                CODE_COMPTE_DESACTIVE,
                MESSAGE_MEMBRE_DESACTIVE,
                http_status=403,
                details={"raison": code},
            )
        return configuration(code if code == "application_revoked" else "application_refusee")
    return service_indisponible(
        MESSAGE_SERVICE_INDISPONIBLE, raison="service_indisponible", statut_amont=statut
    )


# --------------------------------------------------------------------------------------
# Caches et appels partagés
# --------------------------------------------------------------------------------------


def empreinte(valeur: str) -> str:
    """SHA-256 hexadécimal : clé de cache ou d'index qui ne vaut rien si elle fuit."""
    return hashlib.sha256(valeur.encode("utf-8")).hexdigest()


def code_challenge_s256(code_verifier: str) -> str:
    """`BASE64URL(SHA-256(code_verifier))` sans `=` : le `code_challenge` PKCE S256 (§3.2)."""
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


class _Entree[V](NamedTuple):
    valeur: V
    expire_a: float


class CacheUnVol[V]:
    """Cache court et borné, dont des appelants concurrents partagent l'appel amont.

    Chaque entrée porte sa propre échéance (horloge monotone). Sur un manque, `obtenir` lance
    l'appel, ou attend celui qui est déjà en cours pour la même clé : le résultat — succès ou
    erreur — revient à tous. L'appel tourne dans une tâche détachée, attendue derrière
    `asyncio.shield` : l'annulation d'un appelant (navigateur qui abandonne sa requête) ne
    fait échouer que lui.
    """

    def __init__(self) -> None:
        self._entrees: TLRUCache[str, _Entree[V]] = TLRUCache(
            maxsize=CACHE_TAILLE_MAX,
            ttu=lambda _cle, entree, _maintenant: entree.expire_a,
            timer=time.monotonic,
        )
        self._en_vol: dict[str, asyncio.Task[V]] = {}

    async def obtenir(
        self, cle: str, appel: Callable[[], Awaitable[V]], ttl: Callable[[V], float]
    ) -> V:
        if (entree := self._entrees.get(cle)) is not None:
            return entree.valeur
        tache = self._en_vol.get(cle)
        if tache is None:

            async def appel_mis_en_cache() -> V:
                valeur = await appel()
                if (duree := ttl(valeur)) > 0:
                    self._entrees[cle] = _Entree(valeur, time.monotonic() + duree)
                return valeur

            tache = asyncio.create_task(appel_mis_en_cache())
            self._en_vol[cle] = tache

            def _terminee(fin: asyncio.Task[V]) -> None:
                if self._en_vol.get(cle) is fin:
                    del self._en_vol[cle]
                # Exception marquée comme lue : si tous les appelants ont été annulés,
                # personne ne l'attend plus, et asyncio la signalerait au ramasse-miettes.
                if not fin.cancelled():
                    fin.exception()

            tache.add_done_callback(_terminee)
        return await asyncio.shield(tache)

    def oublier(self, cle: str) -> None:
        self._entrees.pop(cle, None)

    def vider(self) -> None:
        self._entrees.clear()


# --------------------------------------------------------------------------------------
# Client
# --------------------------------------------------------------------------------------


class ClientMembers:
    """Appels à l'API externe d'ETIC Members, avec les identifiants de l'application.

    Une instance par application (elle porte les caches et le pool de connexions) ;
    `fermer()` à l'arrêt.
    """

    def __init__(self, config: ConfigSSO, transport: Transport | None = None) -> None:
        self._config = config
        self._transport = transport or Transport(config)
        self._introspections: CacheUnVol[Introspection] = CacheUnVol()
        self._droits: CacheUnVol[DroitsMembre] = CacheUnVol()

    def __repr__(self) -> str:  # pragma: no cover - confort de débogage
        return f"ClientMembers(app={self._config.code_application!r})"

    async def fermer(self) -> None:
        await self._transport.fermer()

    def vider_caches(self) -> None:
        self._introspections.vider()
        self._droits.vider()

    # -- Flux SSO ------------------------------------------------------------------

    def url_authorize(self, state: str, *, code_verifier: str) -> str:
        """URL où envoyer le navigateur (§3.2). Seul le `code_challenge` part dans l'URL."""
        requete = urlencode(
            {
                "app": self._config.code_application,
                "redirect_uri": self._config.redirect_uri,
                "state": state,
                "code_challenge": code_challenge_s256(code_verifier),
                "code_challenge_method": "S256",
            }
        )
        separateur = "&" if "?" in self._config.url_authorize else "?"
        return f"{self._config.url_authorize}{separateur}{requete}"

    async def echanger_code(self, code: str, *, code_verifier: str) -> JetonSSO:
        """Code d'autorisation → jetons (§3.3). Non rejoué : le code brûle au premier essai."""
        donnees = await self._appeler(
            "POST",
            CHEMIN_TOKEN,
            contexte="token",
            rejouable=False,
            json={
                "code": code,
                "redirect_uri": self._config.redirect_uri,
                "code_verifier": code_verifier,
            },
        )
        return self._valider(JetonSSO, donnees, contexte="token")

    async def rafraichir(self, refresh_token: str) -> JetonSSO:
        """Nouveau couple de jetons (§3.8). Le jeton présenté est consommé : l'appelant tient un
        seul rafraîchissement en vol par session et enregistre la réponse avant tout le reste.
        Non rejoué, comme l'échange : la requête suivante retentera avec le même jeton, dans la
        fenêtre de grâce d'ETIC Members."""
        donnees = await self._appeler(
            "POST",
            CHEMIN_TOKEN,
            contexte="refresh",
            rejouable=False,
            json={"grant_type": "refresh_token", "refresh_token": refresh_token},
        )
        return self._valider(JetonSSO, donnees, contexte="refresh")

    async def revoquer(self, refresh_token: str) -> None:
        """Révoque la chaîne de rafraîchissement (§3.9). Toujours `200` amont."""
        await self._appeler(
            "POST",
            CHEMIN_REVOKE,
            contexte="revoke",
            budget_secondes=BUDGET_APPEL_INTERACTIF_SECONDES,
            json={"token": refresh_token},
        )

    async def introspecter(self, token: str) -> Introspection:
        """Valide un jeton d'accès (§3.4), avec cache court.

        Un jeton actif émis pour une **autre** application est traité comme inactif : ETIC
        Members le refuse déjà par l'audience, mais un satellite ne dépend pas d'un seul verrou.
        """

        async def appel() -> Introspection:
            donnees = await self._appeler(
                "POST",
                CHEMIN_INTROSPECT,
                contexte="introspect",
                budget_secondes=BUDGET_APPEL_INTERACTIF_SECONDES,
                json={"token": token},
            )
            introspection = self._valider(Introspection, donnees, contexte="introspect")
            if (
                introspection.active
                and introspection.app_code is not None
                and introspection.app_code != self._config.code_application
            ):
                logger.error(
                    "jeton actif émis pour une autre application",
                    extra={"app_code": introspection.app_code},
                )
                introspection = Introspection(active=False)
            return introspection

        return await self._introspections.obtenir(empreinte(token), appel, _ttl_introspection)

    def oublier_jeton(self, token: str) -> None:
        """Retire un jeton du cache d'introspection (rafraîchi, ou session fermée)."""
        self._introspections.oublier(empreinte(token))

    # -- Membre connecté ------------------------------------------------------------

    async def profil(self, access_token: str) -> Profil:
        """`GET /me` au nom du membre (§3.6), pour ses préférences d'interface."""
        donnees = await self._appeler(
            "GET",
            CHEMIN_ME,
            contexte="profil",
            budget_secondes=BUDGET_APPEL_INTERACTIF_SECONDES,
            bearer=access_token,
        )
        return self._valider(Profil, donnees, contexte="profil")

    async def modifier_preferences(self, access_token: str, *, theme: Theme) -> Preferences:
        """`PATCH /me/preferences` (§3.6) : vaut pour toute la suite. Idempotent."""
        donnees = await self._appeler(
            "PATCH",
            CHEMIN_PREFERENCES,
            contexte="profil",
            budget_secondes=BUDGET_APPEL_INTERACTIF_SECONDES,
            bearer=access_token,
            json={"theme": theme},
        )
        return self._valider(Preferences, donnees, contexte="profil")

    # -- Droits sans jeton utilisateur ---------------------------------------------

    async def droits_membre(self, membre_id: str) -> DroitsMembre:
        """Droits d'un membre déjà identifié autrement (§4) : requête relayée par un tiers
        (carte CRM, webhook, tâche de fond) qui ne porte ni cookie ni jeton.

        Cette route n'authentifie personne. Un membre `disabled` est un `200` avec
        `permissions: []` ; un `404` (membre inconnu) sort en 502 `service_indisponible` —
        l'appelant qui tient une liaison vers ce membre le traduit à sa façon.
        """

        async def appel() -> DroitsMembre:
            donnees = await self._appeler(
                "GET",
                CHEMIN_AUTHZ_PERMISSIONS,
                contexte="authz",
                budget_secondes=BUDGET_APPEL_INTERACTIF_SECONDES,
                params={"member_id": membre_id},
            )
            return self._valider(DroitsMembre, donnees, contexte="authz")

        return await self._droits.obtenir(membre_id, appel, lambda _d: CACHE_DROITS_SECONDES)

    # -- Transport -----------------------------------------------------------------

    async def _appeler(
        self,
        methode: str,
        chemin: str,
        *,
        contexte: Contexte,
        bearer: str | None = None,
        **kw: Any,
    ) -> Any:
        entetes = {
            EN_TETE_CODE_APPLICATION: self._config.code_application,
            EN_TETE_SECRET_APPLICATION: self._config.secret_application,
        }
        if bearer is not None:
            entetes["Authorization"] = f"Bearer {bearer}"
        try:
            return await self._transport.appeler(methode, chemin, headers=entetes, **kw)
        except ErreurAmont as exc:
            raise traduire_erreur(
                exc, contexte=contexte, nom_application=self._config.nom_application
            ) from exc

    @staticmethod
    def _valider[M: BaseModel](modele: type[M], donnees: Any, *, contexte: Contexte) -> M:
        try:
            return modele.model_validate(donnees)
        except ValidationError as exc:
            logger.error(
                "réponse d'ETIC Members hors contrat",
                extra={"contexte": contexte, "modele": modele.__name__},
            )
            raise service_indisponible(
                MESSAGE_SERVICE_INDISPONIBLE, raison="reponse_hors_contrat"
            ) from exc


def _ttl_introspection(introspection: Introspection) -> float:
    """30 s au plus, jamais au-delà de `exp` ; quelques secondes pour un jeton inactif."""
    if not introspection.active:
        return CACHE_INTROSPECTION_NEGATIVE_SECONDES
    ttl = CACHE_INTROSPECTION_SECONDES
    if introspection.exp is not None:
        ttl = min(ttl, introspection.exp - time.time())
    return ttl
