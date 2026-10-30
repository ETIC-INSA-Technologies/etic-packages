"""Session du satellite, sur deux étages qui ne se confondent pas.

- Le **cookie** (`SessionMiddleware` de Starlette, posé par `AuthEtic.installer`) est signé, pas
  chiffré : il ne porte que des valeurs sans portée hors de ce navigateur — `state` et
  `code_verifier` de l'aller-retour SSO, chemin de retour — et la **clé opaque** de la session
  serveur.
- La **session serveur** (`StockageSessions`) garde les jetons d'accès et de rafraîchissement,
  chiffrés au repos et liés à leur session. Elle n'indexe que l'empreinte de la clé : une fuite
  de la table ne donne aucune session utilisable.

Invariants :

- aucun jeton ETIC Members dans le cookie, dans une réponse ou dans un journal ;
- `state` anti-CSRF à usage unique, vérifié en temps constant, valable `DUREE_FLUX_SSO` ;
- un `code_verifier` PKCE neuf par tentative ;
- une clé de session neuve à chaque connexion ;
- la déconnexion supprime la session serveur : un cookie copié avant ne rouvre plus rien.
"""

from __future__ import annotations

import logging
import secrets
import time
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta
from typing import Final, Protocol

from starlette.requests import Request

from .chiffrement import Chiffreur
from .erreurs import non_authentifie
from .members import JetonSSO, empreinte

logger = logging.getLogger(__name__)

CLE_SESSION: Final = "session_id"
CLE_STATE: Final = "sso_state"
CLE_CODE_VERIFIER: Final = "sso_code_verifier"
CLE_DEBUT_FLUX: Final = "sso_debut"
CLE_SUIVANT: Final = "sso_suivant"

#: Aller-retour SSO : il peut inclure une connexion Google et la complétion du profil.
DUREE_FLUX_SSO: Final = timedelta(minutes=10)

#: Avance prise sur l'échéance du jeton d'accès pour le rafraîchir (§3.8).
MARGE_RAFRAICHISSEMENT: Final = timedelta(minutes=5)


def maintenant() -> datetime:
    return datetime.now(UTC)


def _en_utc(instant: datetime) -> datetime:
    # SQLite rend des dates naïves : elles ont été écrites en UTC.
    return instant if instant.tzinfo else instant.replace(tzinfo=UTC)


# --------------------------------------------------------------------------------------
# Aller-retour SSO, dans le cookie
# --------------------------------------------------------------------------------------


@dataclass(frozen=True)
class FluxSSO:
    state: str
    code_verifier: str

    def __repr__(self) -> str:  # pragma: no cover - confort de débogage
        return "FluxSSO(…)"


def demarrer_flux(request: Request, *, suivant: str | None) -> FluxSSO:
    """Génère et mémorise `state` et `code_verifier` ; écrase toute tentative en cours."""
    flux = FluxSSO(
        state=secrets.token_urlsafe(32),
        # 64 octets → 86 caractères, dans les 43 à 128 de RFC 7636.
        code_verifier=secrets.token_urlsafe(64),
    )
    cookie = request.session
    cookie[CLE_STATE] = flux.state
    cookie[CLE_CODE_VERIFIER] = flux.code_verifier
    cookie[CLE_DEBUT_FLUX] = int(time.time())
    cookie[CLE_SUIVANT] = suivant
    return flux


def verifier_state(request: Request, state: str | None) -> tuple[str, str | None]:
    """`(code_verifier, suivant)` si le `state` est le bon et récent ; consommés dans tous les
    cas, pour qu'un `state` intercepté ne se rejoue pas."""
    cookie = request.session
    attendu = cookie.pop(CLE_STATE, None)
    code_verifier = cookie.pop(CLE_CODE_VERIFIER, None)
    debut = cookie.pop(CLE_DEBUT_FLUX, None)
    suivant = cookie.pop(CLE_SUIVANT, None)

    if not attendu or not state or not secrets.compare_digest(str(attendu), str(state)):
        raise non_authentifie(
            "Requête de connexion invalide ou expirée. Relancez la connexion.",
            raison="state_mismatch",
            reconnecter=True,
        )
    if (
        not isinstance(debut, int)
        or not 0 <= time.time() - debut <= DUREE_FLUX_SSO.total_seconds()
        or not code_verifier
    ):
        raise non_authentifie(
            "Requête de connexion expirée. Relancez la connexion.",
            raison="state_expire",
            reconnecter=True,
        )
    return str(code_verifier), suivant if isinstance(suivant, str) else None


# --------------------------------------------------------------------------------------
# Stockage des sessions serveur
# --------------------------------------------------------------------------------------


@dataclass(frozen=True)
class LigneSession:
    """Une session telle qu'elle est stockée : jetons chiffrés, clé hachée."""

    cle_hash: str
    membre_id: str
    jeton_acces_chiffre: str
    jeton_rafraichissement_chiffre: str
    acces_expire_at: datetime
    expire_at: datetime

    def __repr__(self) -> str:  # pragma: no cover - confort de débogage
        return f"LigneSession(membre_id={self.membre_id!r})"


class StockageSessions(Protocol):
    """Où vivent les sessions serveur. Méthodes synchrones, appelées hors de la boucle
    d'événements ; chaque écriture est validée aussitôt, dans sa propre transaction : un
    rafraîchissement déjà consommé par ETIC Members ne doit pas partir dans le rollback d'une
    requête qui échoue ensuite.

    Implémentations : `StockageMemoire` (tests, processus unique),
    `etic_auth.sqlalchemy.StockageSQLAlchemy`.
    """

    def ajouter(self, ligne: LigneSession, *, remplace: str | None, avant: datetime) -> None:
        """Ajoute `ligne`, supprime la session `remplace` (empreinte) et celles échues `avant`."""
        ...

    def lire(self, cle_hash: str) -> LigneSession | None: ...

    def remplacer(self, ligne: LigneSession) -> bool:
        """Remplace jetons et échéances de la session `ligne.cle_hash` ; `False` si elle
        n'existe plus."""
        ...

    def supprimer(self, cle_hash: str) -> None: ...


class StockageMemoire:
    """Sessions en mémoire : tests, ou application à un seul processus qui accepte de
    déconnecter tout le monde à chaque redémarrage."""

    def __init__(self) -> None:
        self._lignes: dict[str, LigneSession] = {}

    def ajouter(self, ligne: LigneSession, *, remplace: str | None, avant: datetime) -> None:
        if remplace:
            self._lignes.pop(remplace, None)
        for cle in [c for c, ligne_ in self._lignes.items() if ligne_.expire_at <= avant]:
            del self._lignes[cle]
        self._lignes[ligne.cle_hash] = ligne

    def lire(self, cle_hash: str) -> LigneSession | None:
        return self._lignes.get(cle_hash)

    def remplacer(self, ligne: LigneSession) -> bool:
        if ligne.cle_hash not in self._lignes:
            return False
        self._lignes[ligne.cle_hash] = ligne
        return True

    def supprimer(self, cle_hash: str) -> None:
        self._lignes.pop(cle_hash, None)


# --------------------------------------------------------------------------------------
# Sessions ouvertes
# --------------------------------------------------------------------------------------


@dataclass(frozen=True)
class SessionOuverte:
    """Session déchiffrée, le temps d'une requête. Jamais sérialisée, jamais journalisée."""

    cle_hash: str
    membre_id: str
    jeton_acces: str
    jeton_rafraichissement: str
    acces_expire_at: datetime
    expire_at: datetime

    def __repr__(self) -> str:  # pragma: no cover - confort de débogage
        return f"SessionOuverte(membre_id={self.membre_id!r}, expire_at={self.expire_at!r})"

    @property
    def echue(self) -> bool:
        return maintenant() >= self.expire_at

    @property
    def acces_expire(self) -> bool:
        return maintenant() >= self.acces_expire_at

    @property
    def a_rafraichir(self) -> bool:
        return maintenant() >= self.acces_expire_at - MARGE_RAFRAICHISSEMENT


class Sessions:
    """Ouverture, lecture, rafraîchissement et suppression des sessions serveur. Synchrone."""

    def __init__(self, stockage: StockageSessions, chiffreur: Chiffreur, duree: timedelta) -> None:
        self.stockage = stockage
        self._chiffreur = chiffreur
        self._duree = duree

    def ouvrir(self, request: Request, jeton: JetonSSO) -> None:
        """Ouvre une session neuve après l'échange du code ; supprime celle que ce navigateur
        avait déjà, et purge au passage les sessions échues de tout le monde."""
        instant = maintenant()
        cle = secrets.token_urlsafe(32)
        cle_hash = empreinte(cle)
        ancienne = request.session.get(CLE_SESSION)
        self.stockage.ajouter(
            self._ligne(
                cle_hash,
                jeton,
                instant=instant,
                expire_at=instant + min(self._duree, timedelta(seconds=jeton.refresh_expires_in)),
            ),
            remplace=empreinte(str(ancienne)) if ancienne else None,
            avant=instant,
        )
        request.session[CLE_SESSION] = cle

    def lire(self, request: Request) -> SessionOuverte | None:
        """Session désignée par le cookie, ou `None`. Une clé qui ne désigne plus rien
        (session fermée ailleurs, purgée, cookie copié) est retirée du cookie."""
        cle = request.session.get(CLE_SESSION)
        if not cle:
            return None
        session = self.relire(empreinte(str(cle)))
        if session is None:
            request.session.pop(CLE_SESSION, None)
        return session

    def relire(self, cle_hash: str) -> SessionOuverte | None:
        ligne = self.stockage.lire(cle_hash)
        if ligne is None:
            return None
        acces = self._chiffreur.dechiffrer(ligne.jeton_acces_chiffre, lie_a=cle_hash)
        rafraichissement = self._chiffreur.dechiffrer(
            ligne.jeton_rafraichissement_chiffre, lie_a=cle_hash
        )
        if acces is None or rafraichissement is None:
            # Clé de chiffrement changée, ou ligne altérée : rien à en tirer.
            logger.warning("session serveur indéchiffrable, supprimée")
            self.stockage.supprimer(cle_hash)
            return None
        return SessionOuverte(
            cle_hash=cle_hash,
            membre_id=ligne.membre_id,
            jeton_acces=acces,
            jeton_rafraichissement=rafraichissement,
            acces_expire_at=_en_utc(ligne.acces_expire_at),
            expire_at=_en_utc(ligne.expire_at),
        )

    def enregistrer_rafraichissement(
        self, session: SessionOuverte, jeton: JetonSSO
    ) -> SessionOuverte:
        """Remplace les deux jetons. L'échéance absolue n'est jamais repoussée."""
        instant = maintenant()
        expire_at = min(session.expire_at, instant + timedelta(seconds=jeton.refresh_expires_in))
        ligne = self._ligne(session.cle_hash, jeton, instant=instant, expire_at=expire_at)
        if not self.stockage.remplacer(ligne):
            raise non_authentifie(
                "Votre session a été fermée. Reconnectez-vous.",
                raison="session_absente",
                reconnecter=True,
            )
        return replace(
            session,
            jeton_acces=jeton.access_token,
            jeton_rafraichissement=jeton.refresh_token,
            acces_expire_at=ligne.acces_expire_at,
            expire_at=expire_at,
        )

    def supprimer(self, cle_hash: str) -> None:
        self.stockage.supprimer(cle_hash)

    def _ligne(
        self, cle_hash: str, jeton: JetonSSO, *, instant: datetime, expire_at: datetime
    ) -> LigneSession:
        return LigneSession(
            cle_hash=cle_hash,
            membre_id=jeton.member.id,
            jeton_acces_chiffre=self._chiffreur.chiffrer(jeton.access_token, lie_a=cle_hash),
            jeton_rafraichissement_chiffre=self._chiffreur.chiffrer(
                jeton.refresh_token, lie_a=cle_hash
            ),
            acces_expire_at=instant + timedelta(seconds=jeton.expires_in),
            expire_at=expire_at,
        )
