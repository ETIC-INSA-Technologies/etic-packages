"""Transport vers ETIC Members : délai de chaque tentative borné par le budget de l'appel."""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
import pytest

from etic_auth import ErreurAuth
from etic_auth import members as module_members
from etic_auth import transport as module_transport
from etic_auth.members import ClientMembers
from etic_auth.transport import ErreurAmont, Transport

from .conftest import config_test

#: Ce que l'ordonnanceur et la machine de CI peuvent ajouter à un budget tenu.
MARGE_SECONDES = 0.4


class AmontLent:
    """Un premier `503` immédiat, puis des réponses qui ne viennent jamais.

    `MockTransport` ignore les délais de httpx : on applique celui que la tentative a reçu,
    comme le ferait le transport réseau, en levant `ReadTimeout` à son échéance.
    """

    def __init__(self) -> None:
        self.delais: list[float] = []

    async def __call__(self, request: httpx.Request) -> httpx.Response:
        delai = request.extensions["timeout"]["read"]
        self.delais.append(delai)
        if len(self.delais) == 1:
            return httpx.Response(503, headers={"Retry-After": "0"})
        await asyncio.sleep(delai)
        raise httpx.ReadTimeout("délai dépassé", request=request)


#: Les nouvelles tentatives par défaut de `ConfigSSO` (2), que `config_test` désactive.
CONFIG = config_test(timeout_secondes=5.0, nouvelles_tentatives=2)


def _transport(gestionnaire: Any) -> Transport:
    return Transport(CONFIG, transport_http=httpx.MockTransport(gestionnaire))


async def test_budget_borne_la_duree_totale(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(module_transport, "DELAI_PLANCHER_TENTATIVE_SECONDES", 0.05)
    amont = AmontLent()
    budget = 0.5

    debut = time.monotonic()
    with pytest.raises(ErreurAmont) as erreur:
        await _transport(amont).appeler("POST", "/x", budget_secondes=budget)
    duree = time.monotonic() - debut

    assert erreur.value.code == "timeout"
    assert duree <= budget + MARGE_SECONDES
    # La tentative qui pend reçoit le budget restant, pas les 5 s de `timeout_secondes`.
    assert len(amont.delais) == 2
    assert amont.delais[1] <= budget


async def test_budget_depasse_reste_un_refus(monkeypatch: pytest.MonkeyPatch) -> None:
    """Le budget tenu ne change rien au verdict : `502`, jamais une introspection vide."""
    monkeypatch.setattr(module_transport, "DELAI_PLANCHER_TENTATIVE_SECONDES", 0.05)
    monkeypatch.setattr(module_members, "BUDGET_APPEL_INTERACTIF_SECONDES", 0.5)
    amont = AmontLent()
    client = ClientMembers(CONFIG, _transport(amont))

    debut = time.monotonic()
    with pytest.raises(ErreurAuth) as erreur:
        await client.introspecter("jeton")
    assert erreur.value.http_status == 502
    assert time.monotonic() - debut <= 0.5 + MARGE_SECONDES
    assert len(amont.delais) == 2


@pytest.mark.parametrize(
    ("budget", "options", "attendu"),
    [
        # Sans budget, chaque tentative garde le délai complet.
        (None, {}, 5.0),
        # Budget plus large que le délai : le délai complet.
        (8.0, {}, 5.0),
        # Tentative lancée budget épuisé : le plancher, pas un délai nul.
        (0.0, {}, 1.0),
        # Délai imposé par l'appelant : jamais remplacé.
        (0.0, {"timeout": 2.0}, 2.0),
    ],
)
async def test_delai_de_la_tentative(
    budget: float | None, options: dict[str, Any], attendu: float
) -> None:
    delais: list[float] = []

    def gestionnaire(request: httpx.Request) -> httpx.Response:
        delais.append(request.extensions["timeout"]["read"])
        return httpx.Response(200, json={})

    await _transport(gestionnaire).appeler("GET", "/x", budget_secondes=budget, **options)
    assert delais == [pytest.approx(attendu, abs=0.05)]
