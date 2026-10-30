"""Un faux ETIC Members, fidèle au contrat sur ce que le paquet utilise, et une application."""

from __future__ import annotations

import json
import secrets
import time
from collections.abc import Iterator
from dataclasses import dataclass, field
from types import SimpleNamespace
from typing import Any
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from etic_auth import AuthEtic, ConfigSSO, Principal, StockageMemoire
from etic_auth.members import ClientMembers, code_challenge_s256
from etic_auth.transport import Transport

URL_APPLICATION = "https://app.example.org"
URL_MEMBERS = "https://members.example.org"
CODE_APP = "app_test"
SECRET_APP = "secret-app-de-test"
MEMBRE = "11111111-1111-1111-1111-111111111111"


def config_test(**reglages: Any) -> ConfigSSO:
    return ConfigSSO(
        **{
            "nom_application": "ETIC Test",
            "url_members": URL_MEMBERS,
            "url_authorize": f"{URL_MEMBERS}/api/v1/auth/sso/authorize",
            "code_application": CODE_APP,
            "secret_application": SECRET_APP,
            "url_application": URL_APPLICATION,
            "secret_session": "s" * 40,
            "cle_chiffrement": bytes(range(32)),
            "cookie_https": False,
            "nouvelles_tentatives": 0,
            **reglages,
        }
    )


@dataclass
class FauxMembers:
    """État du faux serveur. Les tests en modifient les champs pour provoquer un cas."""

    statut: str = "active"
    permissions: list[str] = field(default_factory=lambda: ["app.read"])
    is_superadmin: bool = False
    theme: str = "dark"
    expires_in: int = 3600
    #: Code d'autorisation → `code_challenge` attendu.
    codes: dict[str, str] = field(default_factory=dict)
    acces_actifs: set[str] = field(default_factory=set)
    rafraichissements_actifs: set[str] = field(default_factory=set)
    #: Réponse forcée par chemin : `(statut, corps)`.
    pannes: dict[str, tuple[int, Any]] = field(default_factory=dict)
    appels: list[tuple[str, str]] = field(default_factory=list)

    def emettre_code(self, code_challenge: str) -> str:
        code = secrets.token_urlsafe(16)
        self.codes[code] = code_challenge
        return code

    def compter(self, chemin: str) -> int:
        return sum(1 for _, c in self.appels if c == chemin)

    def _jetons(self) -> dict[str, Any]:
        acces = "acces-" + secrets.token_urlsafe(16)
        rafraichissement = "rafr-" + secrets.token_urlsafe(16)
        self.acces_actifs.add(acces)
        self.rafraichissements_actifs.add(rafraichissement)
        return {
            "access_token": acces,
            "token_type": "Bearer",
            "expires_in": self.expires_in,
            "refresh_token": rafraichissement,
            "refresh_expires_in": 30 * 24 * 3600,
            "member": {"id": MEMBRE, "email": "ada@example.org", "display_name": "Ada Lovelace"},
        }

    def __call__(self, request: httpx.Request) -> httpx.Response:
        chemin = request.url.path
        self.appels.append((request.method, chemin))
        if (
            request.headers.get("X-Application-Code") != CODE_APP
            or request.headers.get("X-Application-Secret") != SECRET_APP
        ):
            return _erreur(401, "unauthenticated")
        if chemin in self.pannes:
            statut, corps = self.pannes[chemin]
            return httpx.Response(statut, json=corps)
        corps = json.loads(request.content) if request.content else {}

        if chemin == "/api/ext/v1/sso/token":
            if corps.get("grant_type") == "refresh_token":
                jeton = corps["refresh_token"]
                if jeton not in self.rafraichissements_actifs:
                    return _erreur(400, "invalid_grant")
                self.rafraichissements_actifs.discard(jeton)
                return httpx.Response(200, json=self._jetons())
            challenge = self.codes.pop(corps.get("code"), None)
            if challenge is None or code_challenge_s256(corps["code_verifier"]) != challenge:
                return _erreur(400, "invalid_grant")
            if corps.get("redirect_uri") != f"{URL_APPLICATION}/api/v1/auth/callback":
                return _erreur(400, "invalid_grant")
            if self.statut == "disabled":
                return _erreur(403, "member_disabled")
            return httpx.Response(200, json=self._jetons())

        if chemin == "/api/ext/v1/sso/introspect":
            if corps["token"] not in self.acces_actifs:
                return httpx.Response(200, json={"active": False})
            return httpx.Response(
                200,
                json={
                    "active": True,
                    "member_id": MEMBRE,
                    "email": "ada@example.org",
                    "display_name": "Ada Lovelace",
                    "status": self.statut,
                    "permissions": self.permissions,
                    "is_superadmin": self.is_superadmin,
                    "exp": int(time.time()) + 3600,
                    "app_code": CODE_APP,
                },
            )

        if chemin == "/api/ext/v1/sso/revoke":
            self.rafraichissements_actifs.discard(corps.get("token"))
            return httpx.Response(200)

        if chemin.startswith("/api/ext/v1/me"):
            bearer = request.headers.get("Authorization", "").removeprefix("Bearer ")
            if bearer not in self.acces_actifs:
                return _erreur(401, "unauthenticated")
            if chemin == "/api/ext/v1/me/preferences":
                if set(corps) - {"theme"}:
                    return _erreur(422, "validation_error")
                self.theme = corps.get("theme", self.theme)
                return httpx.Response(200, json={"theme": self.theme})
            return httpx.Response(
                200,
                json={"member_id": MEMBRE, "groups": [], "preferences": {"theme": self.theme}},
            )

        if chemin == "/api/ext/v1/authz/permissions":
            return httpx.Response(
                200,
                json={
                    "member_id": request.url.params["member_id"],
                    "status": self.statut,
                    "permissions": self.permissions,
                    "is_superadmin": self.is_superadmin,
                },
            )
        return _erreur(404, "not_found")


def _erreur(statut: int, code: str) -> httpx.Response:
    return httpx.Response(statut, json={"error": {"code": code, "message": code, "details": {}}})


@pytest.fixture
def faux() -> FauxMembers:
    return FauxMembers()


def creer_auth(faux: FauxMembers, **reglages: Any) -> AuthEtic:
    config = config_test(**reglages)
    client = ClientMembers(config, Transport(config, transport_http=httpx.MockTransport(faux)))
    return AuthEtic(config, StockageMemoire(), client=client)


def creer_app(auth: AuthEtic) -> FastAPI:
    app = FastAPI()
    auth.installer(app)

    @app.get("/api/v1/lecture")
    def lecture(principal: Principal = Depends(auth.exiger("app.read"))) -> dict[str, str]:
        return {"membre": principal.membre_id}

    @app.get("/api/v1/gestion")
    def gestion(_p: Principal = Depends(auth.exiger("app.manage"))) -> dict[str, bool]:
        return {"ok": True}

    return app


@pytest.fixture
def auth(faux: FauxMembers) -> AuthEtic:
    return creer_auth(faux)


@pytest.fixture
def client(auth: AuthEtic) -> Iterator[TestClient]:
    with TestClient(creer_app(auth), follow_redirects=False) as client:
        yield client


def se_connecter(client: TestClient, faux: FauxMembers, suivant: str | None = None) -> str:
    """Joue l'aller-retour SSO comme le ferait le navigateur ; rend la destination finale."""
    params = {"suivant": suivant} if suivant else {}
    aller = client.get("/api/v1/auth/login", params=params)
    assert aller.status_code == 302
    requete = parse_qs(urlsplit(aller.headers["location"]).query)
    code = faux.emettre_code(requete["code_challenge"][0])
    retour = client.get(
        "/api/v1/auth/callback", params={"code": code, "state": requete["state"][0]}
    )
    assert retour.status_code == 302
    return retour.headers["location"]


def requete_simulee() -> Any:
    """Ce que les sessions lisent d'une requête : son cookie de session."""
    return SimpleNamespace(session={})


def lignes(auth: AuthEtic) -> dict[str, Any]:
    """Sessions serveur d'une application de test (`StockageMemoire`)."""
    return auth.sessions.stockage._lignes  # type: ignore[attr-defined]
