"""Connexion des applications ETIC à ETIC Members : SSO, session serveur, droits.

Voir le README du paquet (`etic-insa-auth` sur PyPI, `@etic-insa/auth` sur npm pour le front).
"""

from .auth import AuthEtic, MeOut, Principal
from .config import ConfigSSO, lire_cle_chiffrement
from .erreurs import ErreurAuth, gestionnaire_erreur_auth
from .members import ClientMembers, DroitsMembre, Preferences, Theme
from .session import StockageMemoire, StockageSessions

__all__ = [
    "AuthEtic",
    "ClientMembers",
    "ConfigSSO",
    "DroitsMembre",
    "ErreurAuth",
    "MeOut",
    "Preferences",
    "Principal",
    "StockageMemoire",
    "StockageSessions",
    "Theme",
    "gestionnaire_erreur_auth",
    "lire_cle_chiffrement",
]
