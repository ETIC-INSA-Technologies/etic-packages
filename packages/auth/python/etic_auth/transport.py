"""Appels HTTP vers ETIC Members : timeout toujours posé, nouvelles tentatives bornées.

On rejoue ce qui a une chance d'aboutir (timeout, erreur réseau, `429`, `5xx`), avec backoff
exponentiel et jitter, en respectant `Retry-After`. Jamais un `4xx` : une erreur de contrat ne
guérit pas en la répétant. Rien n'est journalisé du corps des réponses ni des en-têtes : ils
portent des jetons, le secret d'application, des données personnelles.
"""

from __future__ import annotations

import asyncio
import email.utils
import logging
import time
from typing import Any, Final

import httpx
from tenacity import (
    AsyncRetrying,
    RetryCallState,
    retry_if_exception_type,
    stop_after_attempt,
    stop_before_delay,
    wait_exponential_jitter,
)

from .config import ConfigSSO

logger = logging.getLogger(__name__)

#: Plafond d'un `Retry-After` : ETIC Members ne doit pas pouvoir immobiliser une requête.
PLAFOND_RETRY_AFTER_SECONDES: Final = 60.0

#: Durée accordée aux nouvelles tentatives d'un appel qui bloque une requête utilisateur.
#: Au-delà, un `502` lisible vaut mieux qu'une requête que le navigateur abandonnera.
BUDGET_APPEL_INTERACTIF_SECONDES: Final = 8.0

#: Connexions inactives gardées ouvertes : l'introspection a lieu à chaque requête, et une
#: poignée de main TLS par appel coûterait plus que l'appel lui-même.
KEEPALIVE_SECONDES: Final = 150.0

_STATUTS_REESSAYABLES: Final = frozenset({408, 425, 429, 500, 502, 503, 504})
_CODES_DEFINITIFS: Final = frozenset({"server_misconfigured"})

_ATTENTE_BASE = wait_exponential_jitter(multiplier=0.5, max=8.0, jitter=0.5)


class ErreurAmont(Exception):
    """Échec d'un appel à ETIC Members.

    `code` est l'`error.code` de l'enveloppe d'ETIC Members quand elle est là (`invalid_grant`,
    `member_disabled`…), sinon un code de transport (`timeout`, `network_error`, `http_503`) :
    c'est sur lui, et non sur le seul statut, que l'appelant décide.
    """

    def __init__(self, code: str, message: str, status: int | None = None) -> None:
        super().__init__(f"etic_members: {code} — {message}")
        self.code = code
        self.message = message
        self.status = status


class _Reessayable(Exception):
    def __init__(self, cause: ErreurAmont, retry_after: float | None = None) -> None:
        super().__init__(str(cause))
        self.cause = cause
        self.retry_after = retry_after


def _attente(etat: RetryCallState) -> float:
    exc = etat.outcome.exception() if etat.outcome else None
    if isinstance(exc, _Reessayable) and exc.retry_after is not None:
        return min(exc.retry_after, PLAFOND_RETRY_AFTER_SECONDES)
    return _ATTENTE_BASE(etat)


def _retry_after(reponse: httpx.Response) -> float | None:
    """`Retry-After` en secondes, sous ses deux formes (délai ou date HTTP)."""
    brut = reponse.headers.get("Retry-After", "").strip()
    if not brut:
        return None
    try:
        return max(0.0, float(brut))
    except ValueError:
        pass
    try:
        echeance = email.utils.parsedate_to_datetime(brut)
    except (TypeError, ValueError):
        return None
    return max(0.0, echeance.timestamp() - time.time())


def _code_enveloppe(reponse: httpx.Response) -> str | None:
    """`error.code` de l'enveloppe `{"error": {…}}`, s'il est textuel."""
    try:
        corps = reponse.json()
    except ValueError:
        return None
    erreur = corps.get("error") if isinstance(corps, dict) else None
    code = erreur.get("code") if isinstance(erreur, dict) else None
    return code if isinstance(code, str) and code else None


class Transport:
    """Client HTTP partagé vers ETIC Members, avec ses connexions réutilisées.

    Il ne porte aucun en-tête d'authentification : chaque appel passe les siens. Il est
    rattaché à la boucle d'événements qui l'a créé (un `AsyncClient` n'en change pas) ; une
    autre boucle — entre deux tests — repart d'un client neuf.
    """

    def __init__(
        self, config: ConfigSSO, *, transport_http: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._config = config
        #: Pour les tests (`httpx.MockTransport`) ; sinon, le transport réseau de httpx.
        self._transport_http = transport_http
        self._client: httpx.AsyncClient | None = None
        self._boucle: asyncio.AbstractEventLoop | None = None

    def _client_courant(self) -> httpx.AsyncClient:
        boucle = asyncio.get_running_loop()
        if self._client is None or self._client.is_closed or boucle is not self._boucle:
            self._client = httpx.AsyncClient(
                base_url=self._config.url_members,
                headers={"Accept": "application/json"},
                timeout=httpx.Timeout(self._config.timeout_secondes),
                follow_redirects=False,
                limits=httpx.Limits(keepalive_expiry=KEEPALIVE_SECONDES),
                transport=self._transport_http,
            )
            self._boucle = boucle
        return self._client

    async def fermer(self) -> None:
        """Ferme le client (arrêt de l'application) ; sans effet s'il n'a jamais servi."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def appeler(
        self,
        methode: str,
        chemin: str,
        *,
        rejouable: bool = True,
        budget_secondes: float | None = None,
        headers: dict[str, str] | None = None,
        **kw: Any,
    ) -> Any:
        """Appel JSON ; rend le corps décodé (`None` s'il est vide) ou lève `ErreurAmont`.

        `rejouable=False` pour un appel qui consomme quelque chose dès la première tentative
        (code d'autorisation, jeton de rafraîchissement) : un timeout survenu après
        consommation suivi d'un rejeu ne rendrait qu'un `invalid_grant` trompeur.
        `budget_secondes` borne la durée totale des nouvelles tentatives, attentes comprises.
        """
        entetes = dict(headers or {})
        if self._config.id_requete is not None and (id_requete := self._config.id_requete()):
            entetes.setdefault("X-Request-ID", id_requete)

        tentatives = 1 + self._config.nouvelles_tentatives if rejouable else 1
        arret = stop_after_attempt(tentatives)
        if budget_secondes is not None:
            arret = arret | stop_before_delay(budget_secondes)
        try:
            async for tentative in AsyncRetrying(
                stop=arret,
                wait=_attente,
                retry=retry_if_exception_type(_Reessayable),
                before_sleep=lambda etat: logger.warning(
                    "etic_members : nouvelle tentative",
                    extra={"chemin": chemin, "tentative": etat.attempt_number},
                ),
                reraise=True,
            ):
                with tentative:
                    return await self._une_fois(methode, chemin, headers=entetes, **kw)
        except _Reessayable as exc:
            logger.error(
                "etic_members : appel en échec",
                extra={"chemin": chemin, "code": exc.cause.code, "status": exc.cause.status},
            )
            raise exc.cause from exc
        raise AssertionError("inatteignable")  # pragma: no cover

    async def _une_fois(self, methode: str, chemin: str, **kw: Any) -> Any:
        try:
            reponse = await self._client_courant().request(methode, chemin, **kw)
        except httpx.TimeoutException as exc:
            raise _Reessayable(ErreurAmont("timeout", f"délai dépassé sur {chemin}")) from exc
        except httpx.HTTPError as exc:
            raise _Reessayable(
                ErreurAmont("network_error", f"{type(exc).__name__} sur {chemin}")
            ) from exc

        status = reponse.status_code
        code_amont = _code_enveloppe(reponse) if status >= 400 else None
        # Une erreur de configuration d'ETIC Members ne guérit pas en la répétant.
        if code_amont in _CODES_DEFINITIFS:
            raise ErreurAmont(code_amont, f"{status} sur {chemin}", status)
        if status in _STATUTS_REESSAYABLES or status >= 500:
            raise _Reessayable(
                ErreurAmont(code_amont or f"http_{status}", f"{status} sur {chemin}", status),
                retry_after=_retry_after(reponse),
            )
        if status >= 400:
            code = code_amont or f"http_{status}"
            logger.warning(
                "etic_members : requête refusée",
                extra={"chemin": chemin, "status": status, "code": code},
            )
            raise ErreurAmont(code, f"{status} sur {chemin}", status)
        if not reponse.content:
            return None
        try:
            return reponse.json()
        except ValueError as exc:
            raise ErreurAmont("invalid_response", f"réponse non JSON sur {chemin}", status) from exc
