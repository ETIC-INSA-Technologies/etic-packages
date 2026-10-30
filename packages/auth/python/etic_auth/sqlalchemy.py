"""Sessions serveur dans une table SQLAlchemy (extra `etic-insa-auth[sqlalchemy]`).

L'application déclare la table avec sa propre base déclarative, puis écrit sa migration :

    class SessionSatellite(ColonnesSession, Base):
        __tablename__ = "sessions_auth"

    stockage = StockageSQLAlchemy(SessionLocal, SessionSatellite)

**Minimisation** : ni e-mail, ni nom, ni permission. L'identité et les droits sont relus par
introspection ; la ligne disparaît à la déconnexion ou à l'échéance.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, Session, mapped_column, sessionmaker

from .session import LigneSession


class ColonnesSession:
    """Colonnes d'une session serveur, à mêler à un modèle déclaratif."""

    id: Mapped[int] = mapped_column(
        sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True
    )
    #: SHA-256 (hex) de la clé portée par le cookie — jamais la clé elle-même.
    cle_hash: Mapped[str] = mapped_column(sa.Text, unique=True)
    membre_id: Mapped[str] = mapped_column(sa.Text)
    jeton_acces_chiffre: Mapped[str] = mapped_column(sa.Text)
    jeton_rafraichissement_chiffre: Mapped[str] = mapped_column(sa.Text)
    acces_expire_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True))
    #: Fin absolue de la session, jamais repoussée par un rafraîchissement.
    expire_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), index=True)

    def __repr__(self) -> str:  # pragma: no cover - confort de débogage
        # Ni clé, ni jeton : un `repr` finit toujours dans une trace.
        return f"<{type(self).__name__} membre_id={self.membre_id!r}>"


_CHAMPS = (
    "membre_id",
    "jeton_acces_chiffre",
    "jeton_rafraichissement_chiffre",
    "acces_expire_at",
    "expire_at",
)


class StockageSQLAlchemy:
    """`StockageSessions` sur une table `ColonnesSession`, une transaction par écriture."""

    def __init__(self, fabrique: sessionmaker[Session], modele: type[Any]) -> None:
        self._fabrique = fabrique
        self._modele = modele

    def ajouter(self, ligne: LigneSession, *, remplace: str | None, avant: datetime) -> None:
        modele = self._modele
        with self._fabrique.begin() as db:
            if remplace:
                db.execute(sa.delete(modele).where(modele.cle_hash == remplace))
            db.execute(sa.delete(modele).where(modele.expire_at <= avant))
            db.add(modele(cle_hash=ligne.cle_hash, **{c: getattr(ligne, c) for c in _CHAMPS}))

    def lire(self, cle_hash: str) -> LigneSession | None:
        modele = self._modele
        with self._fabrique() as db:
            trouvee = db.scalar(sa.select(modele).where(modele.cle_hash == cle_hash))
            if trouvee is None:
                return None
            return LigneSession(cle_hash=cle_hash, **{c: getattr(trouvee, c) for c in _CHAMPS})

    def remplacer(self, ligne: LigneSession) -> bool:
        modele = self._modele
        valeurs = {c: getattr(ligne, c) for c in _CHAMPS if c != "membre_id"}
        with self._fabrique.begin() as db:
            resultat = db.execute(
                sa.update(modele).where(modele.cle_hash == ligne.cle_hash).values(**valeurs)
            )
            return bool(getattr(resultat, "rowcount", 0))

    def supprimer(self, cle_hash: str) -> None:
        modele = self._modele
        with self._fabrique.begin() as db:
            db.execute(sa.delete(modele).where(modele.cle_hash == cle_hash))
