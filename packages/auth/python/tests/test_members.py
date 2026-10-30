"""Client d'ETIC Members : caches, appels partagés, nouvelles tentatives, traduction des erreurs."""

from __future__ import annotations

import asyncio

import httpx
import pytest

from etic_auth import ErreurAuth
from etic_auth.members import ClientMembers
from etic_auth.transport import Transport

from .conftest import FauxMembers, config_test

INTROSPECT = "/api/ext/v1/sso/introspect"
TOKEN = "/api/ext/v1/sso/token"


def _client(faux: FauxMembers, **reglages: object) -> ClientMembers:
    config = config_test(**reglages)
    return ClientMembers(config, Transport(config, transport_http=httpx.MockTransport(faux)))


async def test_introspection_en_cache_et_partagee(faux: FauxMembers) -> None:
    faux.acces_actifs.add("jeton")
    client = _client(faux)

    resultats = await asyncio.gather(*(client.introspecter("jeton") for _ in range(5)))
    await client.introspecter("jeton")

    assert all(r.active for r in resultats)
    assert faux.compter(INTROSPECT) == 1


async def test_oublier_jeton(faux: FauxMembers) -> None:
    faux.acces_actifs.add("jeton")
    client = _client(faux)
    await client.introspecter("jeton")

    faux.acces_actifs.clear()
    client.oublier_jeton("jeton")
    assert (await client.introspecter("jeton")).active is False


async def test_jeton_d_une_autre_application_inactif(faux: FauxMembers) -> None:
    faux.acces_actifs.add("jeton")

    def introspection_etrangere(request: httpx.Request) -> httpx.Response:
        corps = faux(request).json()
        corps["app_code"] = "autre_app"
        return httpx.Response(200, json=corps)

    config = config_test()
    client = ClientMembers(
        config, Transport(config, transport_http=httpx.MockTransport(introspection_etrangere))
    )
    assert (await client.introspecter("jeton")).active is False


async def test_echange_jamais_rejoue(faux: FauxMembers) -> None:
    faux.pannes[TOKEN] = (503, {})
    client = _client(faux, nouvelles_tentatives=3)

    with pytest.raises(ErreurAuth) as erreur:
        await client.echanger_code("code", code_verifier="v" * 43)
    assert erreur.value.http_status == 502
    assert faux.compter(TOKEN) == 1


async def test_introspection_rejouee_sur_429_avec_retry_after() -> None:
    reponses = iter(
        [
            httpx.Response(429, headers={"Retry-After": "0"}),
            httpx.Response(200, json={"active": False}),
        ]
    )
    config = config_test(nouvelles_tentatives=2)
    client = ClientMembers(
        config, Transport(config, transport_http=httpx.MockTransport(lambda _r: next(reponses)))
    )
    assert (await client.introspecter("jeton")).active is False


@pytest.mark.parametrize(
    ("chemin", "statut", "code", "attendu_code", "attendu_http"),
    [
        (TOKEN, 400, "invalid_grant", "unauthenticated", 401),
        (TOKEN, 400, "invalid_request", "external_service_unavailable", 502),
        (TOKEN, 401, "unauthenticated", "external_service_unavailable", 502),
        (TOKEN, 403, "member_disabled", "account_disabled", 403),
        (TOKEN, 403, "application_revoked", "external_service_unavailable", 502),
        (TOKEN, 500, "server_misconfigured", "external_service_unavailable", 502),
    ],
)
async def test_traduction_des_erreurs(
    faux: FauxMembers,
    chemin: str,
    statut: int,
    code: str,
    attendu_code: str,
    attendu_http: int,
) -> None:
    faux.pannes[chemin] = (statut, {"error": {"code": code, "message": "x"}})

    with pytest.raises(ErreurAuth) as erreur:
        await _client(faux).echanger_code("code", code_verifier="v" * 43)
    assert (erreur.value.code, erreur.value.http_status) == (attendu_code, attendu_http)
    if attendu_http == 401:
        assert erreur.value.details["action"] == "relancer_authorize"


async def test_profil_jeton_refuse_401(faux: FauxMembers) -> None:
    with pytest.raises(ErreurAuth) as erreur:
        await _client(faux).profil("jeton-inconnu")
    assert erreur.value.http_status == 401


async def test_reponse_hors_contrat_502(faux: FauxMembers) -> None:
    faux.pannes[INTROSPECT] = (200, {"actif": True})

    with pytest.raises(ErreurAuth) as erreur:
        await _client(faux).introspecter("jeton")
    assert erreur.value.details["raison"] == "reponse_hors_contrat"


async def test_droits_membre_en_cache(faux: FauxMembers) -> None:
    client = _client(faux)
    droits = await client.droits_membre("m1")
    await client.droits_membre("m1")

    assert droits.permissions == frozenset({"app.read"})
    assert faux.compter("/api/ext/v1/authz/permissions") == 1


def test_aucun_secret_dans_les_repr() -> None:
    texte = repr(config_test())
    assert "secret-app-de-test" not in texte
    assert "s" * 40 not in texte
    assert "cle_chiffrement" not in texte


async def test_mauvaise_configuration_amont_jamais_rejouee(faux: FauxMembers) -> None:
    faux.pannes[INTROSPECT] = (500, {"error": {"code": "server_misconfigured"}})

    with pytest.raises(ErreurAuth):
        await _client(faux, nouvelles_tentatives=3).introspecter("jeton")
    assert faux.compter(INTROSPECT) == 1
