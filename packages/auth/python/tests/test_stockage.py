"""Sessions serveur : stockage SQLAlchemy, chiffrement lié à la session, réglages."""

from __future__ import annotations

from dataclasses import replace
from datetime import timedelta

import pytest
import sqlalchemy as sa
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from etic_auth import ConfigSSO, lire_cle_chiffrement
from etic_auth.chiffrement import Chiffreur
from etic_auth.members import JetonSSO, MembreSSO
from etic_auth.session import LigneSession, Sessions, maintenant
from etic_auth.sqlalchemy import ColonnesSession, StockageSQLAlchemy

from .conftest import config_test, requete_simulee


class Base(DeclarativeBase):
    pass


class SessionSatellite(ColonnesSession, Base):
    __tablename__ = "sessions_auth"


@pytest.fixture
def stockage() -> StockageSQLAlchemy:
    moteur = sa.create_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(moteur)
    return StockageSQLAlchemy(sessionmaker(moteur), SessionSatellite)


def _ligne(cle: str, *, expire_dans: timedelta = timedelta(hours=1)) -> LigneSession:
    instant = maintenant()
    return LigneSession(
        cle_hash=cle,
        membre_id="m1",
        jeton_acces_chiffre="a",
        jeton_rafraichissement_chiffre="r",
        acces_expire_at=instant + timedelta(minutes=30),
        expire_at=instant + expire_dans,
    )


def test_stockage_sqlalchemy(stockage: StockageSQLAlchemy) -> None:
    stockage.ajouter(
        _ligne("echue", expire_dans=-timedelta(seconds=1)),
        remplace=None,
        avant=maintenant() - timedelta(days=1),
    )
    stockage.ajouter(_ligne("ancienne"), remplace=None, avant=maintenant())
    assert stockage.lire("echue") is None  # purgée à l'ajout suivant

    stockage.ajouter(_ligne("neuve"), remplace="ancienne", avant=maintenant())
    assert stockage.lire("ancienne") is None
    lue = stockage.lire("neuve")
    assert lue is not None and lue.membre_id == "m1"

    assert stockage.remplacer(replace(lue, jeton_acces_chiffre="b"))
    assert stockage.lire("neuve").jeton_acces_chiffre == "b"  # type: ignore[union-attr]
    assert not stockage.remplacer(_ligne("inconnue"))

    stockage.supprimer("neuve")
    assert stockage.lire("neuve") is None


def _jeton(acces: str = "acces", rafraichissement: str = "rafr") -> JetonSSO:
    return JetonSSO(
        access_token=acces,
        expires_in=3600,
        refresh_token=rafraichissement,
        refresh_expires_in=3600 * 24,
        member=MembreSSO(id="m1", email="a@example.org", display_name="A"),
    )


def test_sessions_chiffrees_et_liees(stockage: StockageSQLAlchemy) -> None:
    sessions = Sessions(stockage, Chiffreur(bytes(32)), timedelta(hours=12))
    requete = requete_simulee()
    sessions.ouvrir(requete, _jeton())

    ouverte = sessions.lire(requete)
    assert ouverte is not None and ouverte.jeton_acces == "acces"
    brute = stockage.lire(ouverte.cle_hash)
    assert brute is not None and "acces" not in brute.jeton_acces_chiffre
    # Durée de session bornée par le réglage, pas par le jeton de rafraîchissement (24 h).
    assert ouverte.expire_at - maintenant() <= timedelta(hours=12)

    # Un chiffré recopié dans une autre session ne se déchiffre pas : la session est purgée.
    autre = requete_simulee()
    sessions.ouvrir(autre, _jeton("acces2", "rafr2"))
    cle_autre = sessions.lire(autre).cle_hash  # type: ignore[union-attr]
    copie = stockage.lire(cle_autre)
    assert copie is not None
    stockage.remplacer(replace(copie, jeton_acces_chiffre=brute.jeton_acces_chiffre))
    assert sessions.relire(cle_autre) is None
    assert stockage.lire(cle_autre) is None


def test_reconnexion_remplace_la_session(stockage: StockageSQLAlchemy) -> None:
    sessions = Sessions(stockage, Chiffreur(bytes(32)), timedelta(hours=12))
    requete = requete_simulee()
    sessions.ouvrir(requete, _jeton())
    premiere = sessions.lire(requete).cle_hash  # type: ignore[union-attr]

    sessions.ouvrir(requete, _jeton("acces2", "rafr2"))
    assert stockage.lire(premiere) is None


def test_rafraichissement_ne_repousse_pas_l_echeance(stockage: StockageSQLAlchemy) -> None:
    sessions = Sessions(stockage, Chiffreur(bytes(32)), timedelta(hours=1))
    requete = requete_simulee()
    sessions.ouvrir(requete, _jeton())
    avant = sessions.lire(requete)
    assert avant is not None

    apres = sessions.enregistrer_rafraichissement(avant, _jeton("acces2", "rafr2"))
    assert apres.expire_at <= avant.expire_at
    relue = sessions.relire(avant.cle_hash)
    assert relue is not None and relue.jeton_rafraichissement == "rafr2"


def test_config_refuse_les_reglages_faibles() -> None:
    with pytest.raises(ValueError, match="secret_session"):
        config_test(secret_session="court")
    with pytest.raises(ValueError, match="cle_chiffrement"):
        config_test(cle_chiffrement=b"x")
    with pytest.raises(ValueError, match="différer"):
        config_test(secret_session=bytes(range(32)).hex())
    with pytest.raises(ValueError, match="secret_application"):
        config_test(secret_application="")


def test_config_depuis_env() -> None:
    config = ConfigSSO.depuis_env(
        "ETIC Test",
        {
            "ETIC_MEMBERS_API": "https://members.example.org/",
            "ETIC_MEMBERS_AUTHORIZE_URL": "https://members.example.org/authorize",
            "ETIC_APP_CODE": "app",
            "ETIC_APP_SECRET": "secret",
            "ETIC_APP_URL": "https://app.example.org/",
            "SESSION_SECRET": "s" * 40,
            "ENCRYPTION_KEY": "ab" * 32,
        },
        cookie_https=False,
    )
    assert config.url_members == "https://members.example.org"
    assert config.redirect_uri == "https://app.example.org/api/v1/auth/callback"
    assert config.cookie_https is False
    with pytest.raises(ValueError, match="ETIC_MEMBERS_API"):
        ConfigSSO.depuis_env("ETIC Test", {})
    with pytest.raises(ValueError, match="hexadécimal"):
        lire_cle_chiffrement("pas-de-l-hexa")
