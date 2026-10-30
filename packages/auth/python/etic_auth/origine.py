"""Contrôle de l'origine des écritures authentifiées par cookie (anti-CSRF).

`SameSite=Lax` empêche le cookie de partir en *cross-site*, pas en *same-site* : toute page d'un
sous-domaine d'`etic-insa.com` (site vitrine, ETIC Members, autre application) est same-site
avec les autres. Un `fetch` en `mode: "no-cors"` y envoie un `multipart/form-data` sans
preflight : le cookie part et le serveur exécute — CORS ne protège que la lecture de la réponse.

Une méthode non sûre qui porte le cookie de session n'est donc servie que si le navigateur
atteste qu'elle vient de l'application : `Sec-Fetch-Site: same-origin` (posé par le navigateur,
impossible à forger par un script), ou à défaut un `Origin` admis. Une requête qui ne porte ni
l'un ni l'autre ne vient pas d'un navigateur et passe : une attaque CSRF n'a qu'un navigateur
pour véhicule.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable
from typing import Final
from urllib.parse import urlsplit

from starlette.datastructures import Headers
from starlette.requests import cookie_parser
from starlette.types import ASGIApp, Receive, Scope, Send

from .erreurs import interdit, reponse_erreur

logger = logging.getLogger(__name__)

METHODES_SURES: Final = frozenset({"GET", "HEAD", "OPTIONS"})


def origine_de(url: str) -> str:
    """`schéma://hôte[:port]` d'une URL, en minuscules."""
    morceaux = urlsplit(url.strip())
    return f"{morceaux.scheme}://{morceaux.netloc}".lower()


def _sous(chemin: str, prefixe: str) -> bool:
    """`chemin` est `prefixe` ou en dessous, segment par segment : `/webhook` n'exempte pas
    `/webhooks-admin`."""
    racine = prefixe.rstrip("/")
    return chemin == racine or chemin.startswith(f"{racine}/")


class ControleOrigineMiddleware:
    """Refuse en `403` une écriture par cookie qui ne vient pas de l'application."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        nom_cookie: str,
        origines: Iterable[str],
        chemins_exemptes: tuple[str, ...] = (),
        nom_application: str = "l'application",
    ) -> None:
        self.app = app
        self.nom_cookie = nom_cookie
        self.origines = frozenset(origine_de(o) for o in origines if o)
        self.chemins_exemptes = chemins_exemptes
        self.message = (
            f"Requête refusée : elle ne provient pas de l'interface de {nom_application}."
        )

    def _admise(self, entetes: Headers) -> bool:
        site = entetes.get("sec-fetch-site")
        if site == "same-origin":
            return True
        origine = entetes.get("origin")
        if origine is not None and origine != "null":
            return origine_de(origine) in self.origines
        # Un navigateur a parlé (`Sec-Fetch-Site` autre, `Origin: null`) : refusé.
        return site is None and origine is None

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] != "http"
            or scope.get("method", "GET") in METHODES_SURES
            or any(_sous(scope.get("path", ""), c) for c in self.chemins_exemptes)
        ):
            await self.app(scope, receive, send)
            return

        entetes = Headers(scope=scope)
        porte_cookie = self.nom_cookie in cookie_parser(entetes.get("cookie", ""))
        if not porte_cookie or self._admise(entetes):
            await self.app(scope, receive, send)
            return

        logger.warning(
            "écriture par cookie d'origine refusée", extra={"path": scope.get("path", "")}
        )
        reponse = reponse_erreur(interdit(self.message, raison="origine_non_admise"))
        await reponse(scope, receive, send)
