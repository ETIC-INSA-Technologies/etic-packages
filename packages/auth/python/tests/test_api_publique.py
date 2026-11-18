"""Ce que le paquet publie pour les applications, au-delà de `AuthEtic`."""

from __future__ import annotations

import etic_auth
from etic_auth import CODES_DEFINITIFS, STATUTS_REESSAYABLES, developper, reessayable
from etic_auth import transport as module_transport


def test_developper_suit_les_implications_recursivement() -> None:
    implications = {
        "admin": frozenset({"ecriture"}),
        "ecriture": frozenset({"lecture"}),
        # Un cycle ne boucle pas.
        "lecture": frozenset({"ecriture"}),
    }
    assert developper(frozenset({"admin"}), implications) == {"admin", "ecriture", "lecture"}
    assert developper(frozenset({"autre"}), implications) == {"autre"}
    assert developper(frozenset(), implications) == frozenset()


def test_regles_de_rejeu_publiques() -> None:
    assert {408, 425, 429, 503} <= STATUTS_REESSAYABLES
    assert not any(400 <= statut < 408 for statut in STATUTS_REESSAYABLES)
    assert "server_misconfigured" in CODES_DEFINITIFS
    # Le transport décide sur ces mêmes objets ; les anciens noms privés restent.
    assert module_transport.STATUTS_REESSAYABLES is STATUTS_REESSAYABLES
    assert module_transport._STATUTS_REESSAYABLES is STATUTS_REESSAYABLES
    assert module_transport._CODES_DEFINITIFS is CODES_DEFINITIFS


def test_reessayable() -> None:
    assert reessayable(503, None)
    assert reessayable(503, "external_service_unavailable")
    assert reessayable(429, "rate_limited")
    # Sans enveloppe, un 4xx vient d'un intermédiaire, pas d'ETIC Members.
    assert reessayable(404, None)
    assert reessayable(401, None)
    assert not reessayable(404, "not_found")
    assert not reessayable(400, "invalid_grant")
    assert not reessayable(500, "server_misconfigured")
    # Une réponse sans erreur n'a jamais d'enveloppe : elle ne se rejoue pas pour autant.
    assert not reessayable(200, None)
    assert not reessayable(302, None)


def test_all_exporte() -> None:
    for nom in ("developper", "STATUTS_REESSAYABLES", "CODES_DEFINITIFS", "reessayable"):
        assert nom in etic_auth.__all__
