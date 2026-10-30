"""Chiffrement au repos des jetons ETIC Members (AES-256-GCM, clé dérivée par HKDF-SHA256).

Chaque chiffré est **lié** à ce qu'il accompagne (`lie_a`, authentifié en données associées) :
l'empreinte de la clé de session. Recopié dans la ligne d'une autre session, il ne se déchiffre
pas. Le contexte HKDF et le préfixe sont le format : une valeur en base ne se relit que s'ils
restent identiques.
"""

from __future__ import annotations

import base64
import os
from typing import Final

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

CONTEXTE_JETONS: Final = b"etic-auth/sessions/jetons/v1"
PREFIXE: Final = "v1."
_OCTETS_NONCE: Final = 12


class Chiffreur:
    def __init__(self, cle: bytes) -> None:
        derivee = HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=CONTEXTE_JETONS)
        self._aead = AESGCM(derivee.derive(cle))

    def __repr__(self) -> str:  # pragma: no cover - confort de débogage
        return "Chiffreur(…)"

    def chiffrer(self, clair: str, *, lie_a: str) -> str:
        nonce = os.urandom(_OCTETS_NONCE)
        chiffre = self._aead.encrypt(nonce, clair.encode("utf-8"), lie_a.encode("utf-8"))
        return PREFIXE + base64.urlsafe_b64encode(nonce + chiffre).decode("ascii")

    def dechiffrer(self, valeur: str, *, lie_a: str) -> str | None:
        """Le clair, ou `None` si la valeur est illisible : clé changée, ligne altérée,
        chiffré recopié d'une autre session."""
        if not valeur.startswith(PREFIXE):
            return None
        try:
            brut = base64.urlsafe_b64decode(valeur[len(PREFIXE) :])
            clair = self._aead.decrypt(
                brut[:_OCTETS_NONCE], brut[_OCTETS_NONCE:], lie_a.encode("utf-8")
            )
        except (InvalidTag, ValueError):
            return None
        return clair.decode("utf-8")
