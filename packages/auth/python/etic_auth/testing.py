"""Aides de test : un principal donné, sans ETIC Members ni session.

    simuler_principal(app, auth, Principal(...))  # puis TestClient(app)

Passe par `app.dependency_overrides` de FastAPI : rien de tout cela n'existe hors des tests, il
n'y a pas de mode « mock » à oublier activé en production.
"""

from __future__ import annotations

from fastapi import FastAPI

from .auth import AuthEtic, Principal


def principal_de_test(
    membre_id: str = "00000000-0000-0000-0000-000000000001",
    *,
    permissions: tuple[str, ...] = (),
    is_superadmin: bool = False,
    email: str | None = "membre@example.org",
    nom_affichage: str | None = "Membre de test",
) -> Principal:
    return Principal(
        membre_id=membre_id,
        email=email,
        nom_affichage=nom_affichage,
        permissions=frozenset(permissions),
        is_superadmin=is_superadmin,
    )


def simuler_principal(app: FastAPI, auth: AuthEtic, principal: Principal | None) -> None:
    """Toute route de l'application gardée par `auth.principal` ou `auth.exiger(…)` voit
    `principal` (`None` : retire la simulation). Les routes du paquet qui parlent à ETIC
    Members au nom du membre (`/me`, `/preferences`) demandent une vraie session."""
    if principal is None:
        app.dependency_overrides.pop(auth.principal, None)
    else:
        app.dependency_overrides[auth.principal] = lambda: principal
