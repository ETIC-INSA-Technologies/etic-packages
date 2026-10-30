"""Erreurs de l'authentification, dans l'enveloppe commune des API ETIC.

`{"error": {"code", "message", "details"}}` : la forme des erreurs d'ETIC Members et d'ETIC Docs.
`details.raison` dit la cause machine, `details.action = "relancer_authorize"` demande à
l'interface de relancer la connexion. Une application qui a déjà son type d'erreur traduit
`ErreurAuth` dans son propre gestionnaire ; sinon, `AuthEtic.installer` pose
`gestionnaire_erreur_auth`.
"""

from __future__ import annotations

from typing import Any, Final

from starlette.requests import Request
from starlette.responses import JSONResponse

CODE_NON_AUTHENTIFIE: Final = "unauthenticated"
CODE_INTERDIT: Final = "forbidden"
CODE_COMPTE_DESACTIVE: Final = "account_disabled"
CODE_COMPTE_ALUMNI: Final = "account_alumni"
CODE_SERVICE_INDISPONIBLE: Final = "external_service_unavailable"

#: `details.action` d'un `401` après lequel seule une nouvelle connexion peut aboutir.
ACTION_RECONNEXION: Final = "relancer_authorize"

MESSAGE_SESSION_ABSENTE: Final = "Session absente. Connectez-vous."
MESSAGE_SESSION_EXPIREE: Final = "Votre session a expiré. Reconnectez-vous."
MESSAGE_INTERDIT: Final = "Permission insuffisante pour cette action."


class ErreurAuth(Exception):
    """Refus ou panne de l'authentification, prêt à devenir une réponse HTTP."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        http_status: int,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.details = details or {}

    def __repr__(self) -> str:  # pragma: no cover - confort de débogage
        return f"ErreurAuth({self.code!r}, http_status={self.http_status})"


def non_authentifie(
    message: str = MESSAGE_SESSION_ABSENTE, *, raison: str, reconnecter: bool = False
) -> ErreurAuth:
    """`401`. `reconnecter` : la session ne se rétablira pas sans repasser par ETIC Members."""
    details: dict[str, Any] = {"raison": raison}
    if reconnecter:
        details["action"] = ACTION_RECONNEXION
    return ErreurAuth(CODE_NON_AUTHENTIFIE, message, http_status=401, details=details)


def interdit(message: str = MESSAGE_INTERDIT, **details: Any) -> ErreurAuth:
    """`403`. Une permission manquante se nomme dans `details.required_permission`."""
    return ErreurAuth(CODE_INTERDIT, message, http_status=403, details=details)


def service_indisponible(
    message: str, *, raison: str, statut_amont: int | None = None
) -> ErreurAuth:
    """`502` : ETIC Members ne répond pas, ou pas comme le contrat le dit. Aucun détail interne."""
    details: dict[str, Any] = {"service": "etic_members", "raison": raison}
    if statut_amont is not None:
        details["statut_amont"] = statut_amont
    return ErreurAuth(CODE_SERVICE_INDISPONIBLE, message, http_status=502, details=details)


def reponse_erreur(erreur: ErreurAuth) -> JSONResponse:
    """L'enveloppe d'erreur commune, avec `Cache-Control: no-store` (réponse liée à une session)."""
    return JSONResponse(
        {"error": {"code": erreur.code, "message": erreur.message, "details": erreur.details}},
        status_code=erreur.http_status,
        headers={"Cache-Control": "no-store"},
    )


async def gestionnaire_erreur_auth(_request: Request, exc: Exception) -> JSONResponse:
    """Gestionnaire d'exception FastAPI/Starlette pour `ErreurAuth`."""
    assert isinstance(exc, ErreurAuth)
    return reponse_erreur(exc)
