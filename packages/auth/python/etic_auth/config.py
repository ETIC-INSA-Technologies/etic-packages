"""Réglages d'une application satellite d'ETIC Members.

Tout est passé explicitement à `ConfigSSO` : le paquet ne lit aucune variable d'environnement
de lui-même. `ConfigSSO.depuis_env` reprend les noms qu'utilise déjà ETIC Docs, pour qui veut
s'en servir tels quels.
"""

from __future__ import annotations

import os
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Final

#: Statuts de membre du contrat (`AUTHENTICATION.md` §4).
STATUT_ACTIF: Final = "active"
STATUT_ALUMNI: Final = "alumni"
STATUT_DESACTIVE: Final = "disabled"

#: Taille de la clé de chiffrement des jetons (AES-256).
OCTETS_CLE_CHIFFREMENT: Final = 32

#: Longueur minimale du secret qui signe le cookie de session.
LONGUEUR_MIN_SECRET_SESSION: Final = 32

#: Nom du cookie de session en HTTPS. Le préfixe `__Host-` oblige le navigateur à ne l'accepter
#: que `Secure`, en `Path=/` et sans `Domain` : un autre sous-domaine d'etic-insa.com ne peut ni
#: le poser ni l'écraser (sinon il y glisserait sa propre session signée, et la victime
#: travaillerait sur le compte de l'attaquant).
NOM_COOKIE_HTTPS: Final = "__Host-etic_session"
#: Nom du cookie sans HTTPS (développement local), où un cookie préfixé serait rejeté.
NOM_COOKIE_HTTP: Final = "etic_session"


def lire_cle_chiffrement(valeur: str) -> bytes:
    """32 octets depuis leur hexadécimal (`openssl rand -hex 32`) ; `ValueError` sinon.

    Le message ne cite jamais la valeur.
    """
    try:
        cle = bytes.fromhex(valeur.strip())
    except ValueError:
        raise ValueError("la clé de chiffrement n'est pas de l'hexadécimal") from None
    if len(cle) != OCTETS_CLE_CHIFFREMENT:
        raise ValueError(
            f"la clé de chiffrement fait {len(cle)} octets, {OCTETS_CLE_CHIFFREMENT} attendus "
            "(openssl rand -hex 32)"
        )
    return cle


def _sans_slash_final(url: str) -> str:
    return url.strip().rstrip("/")


@dataclass(frozen=True, kw_only=True)
class ConfigSSO:
    """Ce qu'une application doit fournir pour se connecter à ETIC Members.

    Les trois secrets (`secret_application`, `secret_session`, `cle_chiffrement`) n'apparaissent
    dans aucun `repr`, donc dans aucune trace.
    """

    #: Nom affiché dans les messages d'erreur (« ETIC Docs »).
    nom_application: str
    #: Racine de l'API d'ETIC Members (`https://auth.etic-insa.com`), sans `/api/ext/v1`.
    url_members: str
    #: Page d'autorisation du SSO (`https://auth.etic-insa.com/api/v1/auth/sso/authorize`).
    url_authorize: str
    #: Code de l'application enregistrée dans ETIC Members (`X-Application-Code`).
    code_application: str
    secret_application: str = field(repr=False)
    #: Adresse publique de l'application (`https://docs.etic-insa.com`) : base du
    #: `redirect_uri` et des redirections après connexion. Le front et l'API y sont servis
    #: ensemble, l'API sous `prefixe_routes`.
    url_application: str
    #: Signe le cookie de session, et rien d'autre (au moins 32 caractères).
    secret_session: str = field(repr=False)
    #: Chiffre les jetons ETIC Members au repos ; distincte de `secret_session`.
    cle_chiffrement: bytes = field(repr=False)

    #: Préfixe des routes d'authentification ; le callback est `{prefixe_routes}/callback`.
    prefixe_routes: str = "/api/v1/auth"
    #: Page de connexion du front : destination d'un échec du SSO (`?erreur=<code>`).
    chemin_page_connexion: str = "/login"
    #: Vide : `NOM_COOKIE_HTTPS` si `cookie_https`, sinon `NOM_COOKIE_HTTP`. Un nom choisi en
    #: HTTPS gagne à garder le préfixe `__Host-`.
    nom_cookie: str = ""
    #: `False` seulement en développement local, en HTTP.
    cookie_https: bool = True
    #: Durée maximale d'une session, sans rapport avec les 30 jours du jeton de
    #: rafraîchissement : elle borne le temps pendant lequel un poste laissé ouvert reste
    #: connecté. La révocation, elle, passe par l'introspection à chaque requête.
    duree_session: timedelta = timedelta(hours=12)
    #: Statuts de membre admis. ETIC Members rend un jeton actif à un ancien membre : c'est à
    #: chaque application de décider si elle l'accueille.
    statuts_admis: frozenset[str] = frozenset({STATUT_ACTIF})
    #: Permissions impliquées par une autre (`{"app.manage": {"app.write"}}`), appliquées
    #: récursivement. Le serveur décide avec, et le front reçoit la liste développée.
    implications: Mapping[str, frozenset[str]] = field(default_factory=dict)
    #: Chemins écrits sans cookie (webhook, requête signée) : exemptés du contrôle d'origine.
    chemins_sans_cookie: tuple[str, ...] = ()
    #: Origines admises en plus de celle de `url_application` (front servi ailleurs en dev).
    origines_admises: tuple[str, ...] = ()

    timeout_secondes: float = 10.0
    #: Nouvelles tentatives sur timeout, erreur réseau, `429` et `5xx`.
    nouvelles_tentatives: int = 2
    #: Identifiant de corrélation de la requête en cours, transmis en `X-Request-ID`.
    id_requete: Callable[[], str | None] | None = None

    def __post_init__(self) -> None:
        for nom in ("url_members", "url_authorize", "url_application"):
            object.__setattr__(self, nom, _sans_slash_final(getattr(self, nom)))
        if not self.nom_cookie:
            object.__setattr__(
                self, "nom_cookie", NOM_COOKIE_HTTPS if self.cookie_https else NOM_COOKIE_HTTP
            )
        elif not self.cookie_https and self.nom_cookie.startswith(("__Host-", "__Secure-")):
            # Le navigateur rejetterait ce cookie sans `Secure` : plus aucune connexion.
            raise ValueError("ConfigSSO : un nom_cookie préfixé __Host- ou __Secure- exige HTTPS")
        manquants = [
            nom
            for nom in (
                "nom_application",
                "url_members",
                "url_authorize",
                "code_application",
                "secret_application",
                "url_application",
            )
            if not getattr(self, nom)
        ]
        if manquants:
            raise ValueError(f"ConfigSSO : réglages vides : {', '.join(manquants)}")
        if len(self.secret_session) < LONGUEUR_MIN_SECRET_SESSION:
            raise ValueError(
                f"ConfigSSO : secret_session doit faire au moins {LONGUEUR_MIN_SECRET_SESSION} "
                "caractères (openssl rand -hex 32)"
            )
        if len(self.cle_chiffrement) != OCTETS_CLE_CHIFFREMENT:
            raise ValueError(
                f"ConfigSSO : cle_chiffrement doit faire {OCTETS_CLE_CHIFFREMENT} octets"
            )
        if self.cle_chiffrement.hex() == self.secret_session.strip().lower():
            raise ValueError("ConfigSSO : cle_chiffrement et secret_session doivent différer")
        if not self.prefixe_routes.startswith("/") or self.prefixe_routes.endswith("/"):
            raise ValueError("ConfigSSO : prefixe_routes commence par « / » et n'y finit pas")

    @property
    def redirect_uri(self) -> str:
        """URL de retour du SSO, à enregistrer telle quelle dans ETIC Members."""
        return f"{self.url_application}{self.prefixe_routes}/callback"

    @classmethod
    def depuis_env(
        cls,
        nom_application: str,
        environ: Mapping[str, str] = os.environ,
        **reglages: object,
    ) -> ConfigSSO:
        """Depuis `ETIC_MEMBERS_API`, `ETIC_MEMBERS_AUTHORIZE_URL`, `ETIC_APP_CODE`,
        `ETIC_APP_SECRET`, `ETIC_APP_URL`, `SESSION_SECRET` et `ENCRYPTION_KEY` (hexadécimal).

        `reglages` complète ou remplace le reste (`statuts_admis=…`, `cookie_https=False`…).
        """

        def lire(nom: str) -> str:
            valeur = environ.get(nom, "").strip()
            if not valeur:
                raise ValueError(f"variable d'environnement absente : {nom}")
            return valeur

        return cls(
            nom_application=nom_application,
            url_members=lire("ETIC_MEMBERS_API"),
            url_authorize=lire("ETIC_MEMBERS_AUTHORIZE_URL"),
            code_application=lire("ETIC_APP_CODE"),
            secret_application=lire("ETIC_APP_SECRET"),
            url_application=lire("ETIC_APP_URL"),
            secret_session=lire("SESSION_SECRET"),
            cle_chiffrement=lire_cle_chiffrement(lire("ENCRYPTION_KEY")),
            **reglages,  # type: ignore[arg-type]
        )
