"""Le parcours complet, de la connexion à la déconnexion, contre le faux ETIC Members."""

from __future__ import annotations

import asyncio
from dataclasses import replace
from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

from fastapi.testclient import TestClient

from etic_auth import AuthEtic
from etic_auth.members import code_challenge_s256
from etic_auth.testing import principal_de_test, simuler_principal

from .conftest import (
    CODE_APP,
    MEMBRE,
    URL_APPLICATION,
    FauxMembers,
    creer_app,
    creer_auth,
    lignes,
    requete_simulee,
    se_connecter,
)


def _session(auth: AuthEtic):
    (ligne,) = lignes(auth).values()
    return auth.sessions.relire(ligne.cle_hash)


def test_login_redirige_vers_members_avec_state_et_pkce(client: TestClient) -> None:
    reponse = client.get("/api/v1/auth/login")

    assert reponse.status_code == 302
    url = urlsplit(reponse.headers["location"])
    assert url.path == "/api/v1/auth/sso/authorize"
    requete = parse_qs(url.query)
    assert requete["app"] == [CODE_APP]
    assert requete["redirect_uri"] == [f"{URL_APPLICATION}/api/v1/auth/callback"]
    assert requete["code_challenge_method"] == ["S256"]
    assert len(requete["state"][0]) >= 16
    assert "code_verifier" not in requete


def test_connexion_complete_puis_me(client: TestClient, faux: FauxMembers) -> None:
    destination = se_connecter(client, faux, suivant="/missions?page=2")

    assert destination == f"{URL_APPLICATION}/missions?page=2"
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json() == {
        "membre_id": MEMBRE,
        "email": "ada@example.org",
        "nom_affichage": "Ada Lovelace",
        "permissions": ["app.read"],
        "is_superadmin": False,
        "preferences": {"theme": "dark"},
    }
    # Aucun jeton ne sort, ni dans la réponse ni dans le cookie.
    assert "acces-" not in me.text
    assert all("acces-" not in v and "rafr-" not in v for v in client.cookies.values())


def test_suivant_absolu_ignore(client: TestClient, faux: FauxMembers) -> None:
    for suivant in ("https://evil.example", "//evil.example", "/\\evil.example"):
        assert se_connecter(client, faux, suivant=suivant) == f"{URL_APPLICATION}/"


def test_state_faux_renvoie_a_la_connexion_sans_echange(
    client: TestClient, faux: FauxMembers
) -> None:
    client.get("/api/v1/auth/login")
    reponse = client.get("/api/v1/auth/callback", params={"code": "x", "state": "faux" * 8})

    assert reponse.headers["location"] == f"{URL_APPLICATION}/login?erreur=unauthenticated"
    assert faux.compter("/api/ext/v1/sso/token") == 0


def test_state_a_usage_unique(client: TestClient, faux: FauxMembers) -> None:
    aller = parse_qs(urlsplit(client.get("/api/v1/auth/login").headers["location"]).query)
    state = aller["state"][0]
    code = faux.emettre_code(aller["code_challenge"][0])
    client.get("/api/v1/auth/callback", params={"code": code, "state": state})

    rejeu = client.get("/api/v1/auth/callback", params={"code": code, "state": state})
    assert rejeu.headers["location"].endswith("/login?erreur=unauthenticated")


def test_membre_desactive_a_l_echange(client: TestClient, faux: FauxMembers) -> None:
    faux.statut = "disabled"
    assert se_connecter(client, faux).endswith("/login?erreur=account_disabled")


def test_me_sans_session(client: TestClient) -> None:
    reponse = client.get("/api/v1/auth/me")

    assert reponse.status_code == 401
    assert reponse.json()["error"]["code"] == "unauthenticated"
    assert reponse.headers["cache-control"] == "no-store"


def test_permission_manquante_puis_implication(faux: FauxMembers) -> None:
    with TestClient(creer_app(creer_auth(faux)), follow_redirects=False) as client:
        se_connecter(client, faux)
        assert client.get("/api/v1/lecture").json() == {"membre": MEMBRE}
        refus = client.get("/api/v1/gestion")
        assert refus.status_code == 403
        assert refus.json()["error"]["details"]["required_permission"] == "app.manage"

    faux.permissions = ["app.manage"]
    auth = creer_auth(
        faux,
        implications={"app.manage": frozenset({"app.write"}), "app.write": frozenset({"app.read"})},
    )
    with TestClient(creer_app(auth), follow_redirects=False) as client:
        se_connecter(client, faux)
        assert client.get("/api/v1/lecture").status_code == 200
        assert client.get("/api/v1/auth/me").json()["permissions"] == [
            "app.manage",
            "app.read",
            "app.write",
        ]


def test_ancien_membre_refuse_par_defaut_admis_sur_reglage(faux: FauxMembers) -> None:
    faux.statut = "alumni"
    auth = creer_auth(faux)
    with TestClient(creer_app(auth), follow_redirects=False) as client:
        # Refusé au retour du SSO, avant toute session, et sa connexion révoquée.
        assert se_connecter(client, faux).endswith("/login?erreur=account_alumni")
        assert lignes(auth) == {}
        assert faux.rafraichissements_actifs == set()

    auth = creer_auth(faux, statuts_admis=frozenset({"active", "alumni"}))
    with TestClient(creer_app(auth), follow_redirects=False) as client:
        se_connecter(client, faux)
        assert client.get("/api/v1/auth/me").status_code == 200


def test_jeton_inactif_rafraichi_sans_reconnexion(
    client: TestClient, auth: AuthEtic, faux: FauxMembers
) -> None:
    se_connecter(client, faux)
    faux.acces_actifs.clear()  # jeton d'accès révoqué ou expiré amont
    auth.client.vider_caches()

    assert client.get("/api/v1/auth/me").status_code == 200
    assert faux.compter("/api/ext/v1/sso/token") == 2  # échange + rafraîchissement


def test_rafraichissement_refuse_ferme_la_session(
    client: TestClient, auth: AuthEtic, faux: FauxMembers
) -> None:
    se_connecter(client, faux)
    faux.acces_actifs.clear()
    faux.rafraichissements_actifs.clear()  # déconnecté d'ETIC Members
    auth.client.vider_caches()

    reponse = client.get("/api/v1/auth/me")
    assert reponse.status_code == 401
    assert reponse.json()["error"]["details"]["action"] == "relancer_authorize"
    assert lignes(auth) == {}


def test_rafraichissement_une_seule_fois_en_concurrence(
    client: TestClient, auth: AuthEtic, faux: FauxMembers
) -> None:
    se_connecter(client, faux)
    session = _session(auth)

    async def deux_requetes():
        # Deux requêtes parallèles d'un même onglet, avec le même jeton de rafraîchissement.
        return await asyncio.gather(
            auth._rafraichir(requete_simulee(), session),
            auth._rafraichir(requete_simulee(), session),
        )

    premiere, seconde = asyncio.run(deux_requetes())
    assert premiere.jeton_acces == seconde.jeton_acces
    assert faux.compter("/api/ext/v1/sso/token") == 2  # échange + UN rafraîchissement


def test_rafraichissement_proactif(faux: FauxMembers) -> None:
    faux.expires_in = 60  # sous la marge de 5 min : rafraîchi dès la requête suivante
    with TestClient(creer_app(creer_auth(faux)), follow_redirects=False) as client:
        se_connecter(client, faux)
        assert client.get("/api/v1/auth/me").status_code == 200
    assert faux.compter("/api/ext/v1/sso/token") == 2


def test_session_echue(client: TestClient, auth: AuthEtic, faux: FauxMembers) -> None:
    se_connecter(client, faux)
    sessions = lignes(auth)
    (cle, ligne) = next(iter(sessions.items()))
    sessions[cle] = replace(ligne, expire_at=ligne.expire_at - timedelta(days=1))

    reponse = client.get("/api/v1/auth/me")
    assert reponse.status_code == 401
    assert faux.compter("/api/ext/v1/sso/revoke") == 1


def test_deconnexion(client: TestClient, auth: AuthEtic, faux: FauxMembers) -> None:
    se_connecter(client, faux)

    assert client.post("/api/v1/auth/logout").json() == {"ok": True}
    assert faux.compter("/api/ext/v1/sso/revoke") == 1
    assert faux.rafraichissements_actifs == set()
    assert client.get("/api/v1/auth/me").status_code == 401
    # Sans session : réussit quand même.
    assert client.post("/api/v1/auth/logout").status_code == 200


def test_cookie_copie_avant_deconnexion_ne_rouvre_rien(
    client: TestClient, faux: FauxMembers
) -> None:
    se_connecter(client, faux)
    copie = dict(client.cookies)
    client.post("/api/v1/auth/logout")

    client.cookies.clear()
    client.cookies.update(copie)
    assert client.get("/api/v1/auth/me").status_code == 401


def test_preferences(client: TestClient, faux: FauxMembers) -> None:
    se_connecter(client, faux)

    assert client.patch("/api/v1/auth/preferences", json={"theme": "light"}).json() == {
        "theme": "light"
    }
    assert faux.theme == "light"
    assert client.patch("/api/v1/auth/preferences", json={"theme": "rose"}).status_code == 422
    assert (
        client.patch("/api/v1/auth/preferences", json={"theme": "dark", "x": 1}).status_code == 422
    )


def test_preferences_indisponibles_ne_bloquent_pas_me(
    client: TestClient, faux: FauxMembers
) -> None:
    se_connecter(client, faux)
    faux.pannes["/api/ext/v1/me"] = (503, {})

    reponse = client.get("/api/v1/auth/me")
    assert reponse.status_code == 200
    assert reponse.json()["preferences"] is None


def test_members_injoignable_502(client: TestClient, auth: AuthEtic, faux: FauxMembers) -> None:
    se_connecter(client, faux)
    auth.client.vider_caches()
    faux.pannes["/api/ext/v1/sso/introspect"] = (503, {})

    reponse = client.get("/api/v1/auth/me")
    assert reponse.status_code == 502
    assert reponse.json()["error"]["code"] == "external_service_unavailable"


def test_controle_d_origine(client: TestClient, faux: FauxMembers) -> None:
    se_connecter(client, faux)
    chemin = "/api/v1/auth/preferences"
    corps = {"theme": "light"}

    refus = client.patch(chemin, json=corps, headers={"Origin": "https://vitrine.example.org"})
    assert refus.status_code == 403
    assert refus.json()["error"]["details"]["raison"] == "origine_non_admise"
    assert (
        client.patch(chemin, json=corps, headers={"Sec-Fetch-Site": "same-site"}).status_code == 403
    )
    assert client.patch(chemin, json=corps, headers={"Origin": "null"}).status_code == 403

    assert client.patch(chemin, json=corps, headers={"Origin": URL_APPLICATION}).status_code == 200
    assert (
        client.patch(chemin, json=corps, headers={"Sec-Fetch-Site": "same-origin"}).status_code
        == 200
    )
    # Ni l'un ni l'autre : pas un navigateur, pas de CSRF possible.
    assert client.patch(chemin, json=corps).status_code == 200


def test_simuler_principal(auth: AuthEtic) -> None:
    app = creer_app(auth)
    simuler_principal(app, auth, principal_de_test(permissions=("app.read",)))
    with TestClient(app) as client:
        assert client.get("/api/v1/lecture").status_code == 200
        assert client.get("/api/v1/gestion").status_code == 403
    simuler_principal(app, auth, None)
    with TestClient(app) as client:
        assert client.get("/api/v1/lecture").status_code == 401


def test_code_challenge_s256_vecteur_rfc7636() -> None:
    assert (
        code_challenge_s256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
        == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    )


def test_jeton_refuse_sur_me_ferme_la_session(
    client: TestClient, auth: AuthEtic, faux: FauxMembers
) -> None:
    se_connecter(client, faux)
    client.get("/api/v1/auth/me")  # introspection en cache, active
    faux.acces_actifs.clear()  # déconnecté d'ETIC Members dans les 30 s du cache

    reponse = client.get("/api/v1/auth/me")
    assert reponse.status_code == 401
    assert lignes(auth) == {}
    assert client.get("/api/v1/lecture").status_code == 401


def test_chemin_exempte_par_segment(faux: FauxMembers) -> None:
    auth = creer_auth(faux, chemins_sans_cookie=("/api/v1/auth/logout",))
    with TestClient(creer_app(auth), follow_redirects=False) as client:
        se_connecter(client, faux)
        etranger = {"Origin": "https://vitrine.example.org"}
        assert client.post("/api/v1/auth/logout", headers=etranger).status_code == 200
        se_connecter(client, faux)
        refus = client.post("/api/v1/auth/logout-tout", headers=etranger)
        assert refus.status_code == 403
