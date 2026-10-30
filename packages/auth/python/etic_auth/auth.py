"""`AuthEtic` : la connexion d'une application FastAPI à ETIC Members, en un objet.

    auth = AuthEtic(ConfigSSO.depuis_env("ETIC Intervenant"), StockageSQLAlchemy(…))
    auth.installer(app)

    @app.get("/api/v1/missions")
    def missions(principal: Annotated[Principal, Depends(auth.exiger("intervenant.read"))]): …

`installer` pose le cookie de session, le contrôle d'origine, le gestionnaire d'erreurs et les
routes `{prefixe}/login`, `/callback`, `/me`, `/preferences` et `/logout`. **Le serveur fait
autorité, toujours** : chaque route protégée passe par `principal` ou `exiger`, et le masquage
côté interface n'est qu'un confort.
"""

# Sans `from __future__ import annotations` : FastAPI évalue les annotations des routes du
# routeur, qui citent `self` — en chaînes, elles ne se résoudraient pas.
import asyncio
import logging
import weakref
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass
from typing import Annotated, Final
from urllib.parse import quote

from fastapi import APIRouter, Body, Depends, FastAPI, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.concurrency import run_in_threadpool
from starlette.middleware.sessions import SessionMiddleware

from . import session as flux_sso
from .chiffrement import Chiffreur
from .config import STATUT_ALUMNI, STATUT_DESACTIVE, ConfigSSO
from .erreurs import (
    CODE_COMPTE_ALUMNI,
    CODE_COMPTE_DESACTIVE,
    CODE_NON_AUTHENTIFIE,
    MESSAGE_SESSION_EXPIREE,
    ErreurAuth,
    gestionnaire_erreur_auth,
    interdit,
    non_authentifie,
)
from .members import ClientMembers, Introspection, JetonSSO, Preferences, Theme
from .origine import ControleOrigineMiddleware, origine_de
from .session import SessionOuverte, Sessions, StockageSessions

logger = logging.getLogger(__name__)

MESSAGE_COMPTE_DESACTIVE: Final = (
    "Votre compte ETIC Members est désactivé. Contactez un administrateur."
)


def _message_alumni(nom_application: str) -> str:
    return f"{nom_application} n'est pas ouvert aux anciens membres."


@dataclass(frozen=True)
class Principal:
    """Identité et droits effectifs de la requête."""

    membre_id: str
    email: str | None
    #: Libellé prêt à afficher, calculé par ETIC Members (§3.5). Affichage seulement.
    nom_affichage: str | None
    #: Codes déjà développés par ETIC Members (jamais de `*`), implications de l'application
    #: comprises.
    permissions: frozenset[str]
    is_superadmin: bool

    def a_permission(self, code: str) -> bool:
        # `is_superadmin` n'est qu'un filet : ses codes arrivent déjà développés.
        return self.is_superadmin or code in self.permissions


class MeOut(BaseModel):
    """`GET {prefixe}/me` : identité et droits de la session, pour choisir quoi afficher."""

    membre_id: str
    email: str | None = None
    nom_affichage: str | None = None
    #: `[]` est un état normal : tout membre actif peut se connecter, sans droit.
    permissions: list[str] = Field(default_factory=list)
    is_superadmin: bool = False
    #: `None` si ETIC Members n'a pas pu les rendre : l'interface garde son réglage local.
    preferences: Preferences | None = None


class PreferencesIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    theme: Theme


class OkOut(BaseModel):
    ok: bool = True


def developper(
    permissions: frozenset[str], implications: Mapping[str, frozenset[str]]
) -> frozenset[str]:
    """Ajoute à `permissions` tout ce qu'elles impliquent, récursivement."""
    resultat = set(permissions)
    a_voir = list(permissions)
    while a_voir:
        for implique in implications.get(a_voir.pop(), frozenset()):
            if implique not in resultat:
                resultat.add(implique)
                a_voir.append(implique)
    return frozenset(resultat)


def chemin_de_retour(suivant: str | None) -> str | None:
    """Chemin relatif de retour accepté, ou `None`. Une URL absolue ferait de la connexion un
    tremplin de phishing ; `//hôte` (et `/\\hôte`, que les navigateurs lisent pareil) est une
    URL sans schéma, pas un chemin."""
    if not suivant or not suivant.startswith("/") or suivant.startswith("//") or "\\" in suivant:
        return None
    return suivant


class AuthEtic:
    """Connexion SSO, session serveur et gardes d'une application satellite."""

    def __init__(
        self,
        config: ConfigSSO,
        stockage: StockageSessions,
        *,
        client: ClientMembers | None = None,
    ) -> None:
        self.config = config
        self.client = client or ClientMembers(config)
        self.sessions = Sessions(stockage, Chiffreur(config.cle_chiffrement), config.duree_session)
        # Un verrou par session, le temps d'un rafraîchissement. Références faibles : il
        # disparaît dès que plus personne ne l'attend. Un verrou mémoire suppose un seul
        # processus ; à plusieurs workers, la fenêtre de grâce d'ETIC Members couvre la course.
        self._verrous: weakref.WeakValueDictionary[str, asyncio.Lock] = (
            weakref.WeakValueDictionary()
        )

    async def fermer(self) -> None:
        """À appeler à l'arrêt de l'application (`lifespan`)."""
        await self.client.fermer()

    # -- Installation -----------------------------------------------------------------

    def installer(self, app: FastAPI) -> None:
        """Cookie de session, contrôle d'origine, gestionnaire d'erreurs, routes."""
        config = self.config
        app.add_middleware(
            ControleOrigineMiddleware,
            nom_cookie=config.nom_cookie,
            origines=[origine_de(config.url_application), *config.origines_admises],
            chemins_exemptes=config.chemins_sans_cookie,
            nom_application=config.nom_application,
        )
        # Posé après le contrôle d'origine, il l'enveloppe : la session est lue avant lui.
        app.add_middleware(
            SessionMiddleware,
            secret_key=config.secret_session,
            session_cookie=config.nom_cookie,
            max_age=int(config.duree_session.total_seconds()),
            # `lax` et non `strict` : le retour du SSO est une navigation depuis ETIC Members,
            # et `strict` n'enverrait pas le cookie qui porte le `state`.
            same_site="lax",
            https_only=config.cookie_https,
        )
        app.add_exception_handler(ErreurAuth, gestionnaire_erreur_auth)
        app.include_router(self.routeur())

    # -- Gardes -----------------------------------------------------------------------

    async def principal(self, request: Request) -> Principal:
        """Dépendance FastAPI : le principal de la session, ou `401`.

        1. session désignée par le cookie — absente : `401` ; échue : fermée, `401` ;
        2. jeton d'accès proche de l'échéance : rafraîchi d'abord ;
        3. introspection (cache 30 s) ; jeton inactif : un rafraîchissement, s'il n'a pas déjà
           eu lieu, puis une seconde introspection, sinon la session est fermée ;
        4. statut du membre : seuls `statuts_admis` passent.
        """
        session = await run_in_threadpool(self.sessions.lire, request)
        if session is None:
            raise non_authentifie(raison="session_absente")
        if session.echue:
            await self._fermer_session(request, session)
            raise non_authentifie(MESSAGE_SESSION_EXPIREE, raison="session_echue", reconnecter=True)

        rafraichie = False
        if session.a_rafraichir:
            try:
                session = await self._rafraichir(request, session)
                rafraichie = True
            except ErreurAuth as erreur:
                # ETIC Members injoignable alors que le jeton vit encore : la marge de 5 min
                # sert à ne pas couper l'utilisateur. La requête suivante retentera.
                if erreur.http_status != 502 or session.acces_expire:
                    raise
                logger.warning("rafraîchissement proactif reporté")

        introspection = await self.client.introspecter(session.jeton_acces)
        if not introspection.active and not rafraichie:
            session = await self._rafraichir(request, session)
            introspection = await self.client.introspecter(session.jeton_acces)
        if not introspection.active:
            raise await self._session_fermee(request, session, raison="token_inactif")

        self.verifier_statut(introspection.status)
        request.state.etic_session = session
        return self._principal_de(introspection)

    def exiger(self, code: str) -> Callable[..., Awaitable[Principal]]:
        """Dépendance de garde : le principal s'il détient `code`, sinon `403` avec
        `details.required_permission`."""

        async def garde(principal: Annotated[Principal, Depends(self.principal)]) -> Principal:
            if not principal.a_permission(code):
                raise interdit(required_permission=code)
            return principal

        garde.__name__ = f"exiger_{code.replace('.', '_')}"
        return garde

    def verifier_statut(self, statut: str | None) -> None:
        """Refuse un membre dont le statut n'est pas admis, avec un code que l'interface sait
        afficher. Aussi pour les droits lus sans jeton (`client.droits_membre`)."""
        if statut in self.config.statuts_admis:
            return
        if statut == STATUT_DESACTIVE:
            raise ErreurAuth(
                CODE_COMPTE_DESACTIVE,
                MESSAGE_COMPTE_DESACTIVE,
                http_status=403,
                details={"statut": statut},
            )
        if statut == STATUT_ALUMNI:
            raise ErreurAuth(
                CODE_COMPTE_ALUMNI,
                _message_alumni(self.config.nom_application),
                http_status=403,
                details={"statut": statut},
            )
        # Une évolution d'ETIC Members se voit dans les journaux, pas dans des droits supposés.
        logger.error("statut de membre hors contrat", extra={"statut": statut})
        raise interdit(raison="statut_inconnu")

    def _principal_de(self, introspection: Introspection) -> Principal:
        if not introspection.member_id:
            logger.error("introspection active sans member_id")
            raise non_authentifie(MESSAGE_SESSION_EXPIREE, raison="introspection_incomplete")
        return Principal(
            membre_id=introspection.member_id,
            email=introspection.email,
            nom_affichage=introspection.display_name,
            permissions=developper(frozenset(introspection.permissions), self.config.implications),
            is_superadmin=introspection.is_superadmin,
        )

    # -- Rafraîchissement et fermeture ------------------------------------------------

    def _verrou(self, cle_hash: str) -> asyncio.Lock:
        verrou = self._verrous.get(cle_hash)
        if verrou is None:
            verrou = asyncio.Lock()
            self._verrous[cle_hash] = verrou
        return verrou

    async def _rafraichir(self, request: Request, session: SessionOuverte) -> SessionOuverte:
        """Rafraîchit une seule fois, sous verrou (§3.8).

        Deux requêtes d'un même onglet arrivent souvent ensemble quand le jeton échoit. La
        seconde, qui attendait le verrou, relit la session et y trouve le jeton déjà
        renouvelé : elle repart avec, sans présenter à ETIC Members un jeton consommé — qu'il
        traiterait comme un vol, en révoquant toute la chaîne.
        """
        async with self._verrou(session.cle_hash):
            actuelle = await run_in_threadpool(self.sessions.relire, session.cle_hash)
            if actuelle is None:
                request.session.clear()
                raise non_authentifie(
                    MESSAGE_SESSION_EXPIREE, raison="session_absente", reconnecter=True
                )
            if actuelle.jeton_rafraichissement != session.jeton_rafraichissement:
                return actuelle

            try:
                jeton = await self.client.rafraichir(actuelle.jeton_rafraichissement)
            except ErreurAuth as erreur:
                if erreur.code == CODE_NON_AUTHENTIFIE:
                    # Chaîne révoquée, membre désactivé ou déconnecté d'ETIC Members.
                    raise await self._session_fermee(
                        request, actuelle, raison="rafraichissement_refuse"
                    ) from None
                raise

            if jeton.member.id != actuelle.membre_id:
                logger.error("rafraîchissement rendu pour un autre membre")
                raise await self._session_fermee(
                    request, actuelle, raison="rafraichissement_incoherent"
                )

            nouvelle = await run_in_threadpool(
                self.sessions.enregistrer_rafraichissement, actuelle, jeton
            )
            self.client.oublier_jeton(actuelle.jeton_acces)
            return nouvelle

    async def _session_fermee(
        self, request: Request, session: SessionOuverte, *, raison: str
    ) -> ErreurAuth:
        """Supprime la session et vide le cookie ; rend le `401` qui renvoie à la connexion."""
        await self._purger(request, session)
        return non_authentifie(MESSAGE_SESSION_EXPIREE, raison=raison, reconnecter=True)

    async def _admettre(self, jeton: JetonSSO) -> None:
        """Avant d'ouvrir une session : le jeton tout juste émis est actif et le statut du
        membre admis. ETIC Members émet un jeton à un ancien membre ; le refuser ici renvoie à
        la page de connexion avec son code (`account_alumni`), sans session à purger ensuite.
        L'introspection reste en cache pour la première requête."""
        try:
            introspection = await self.client.introspecter(jeton.access_token)
            if not introspection.active:
                raise non_authentifie(
                    MESSAGE_SESSION_EXPIREE, raison="token_inactif", reconnecter=True
                )
            self.verifier_statut(introspection.status)
        except ErreurAuth:
            await self._revoquer(jeton.refresh_token)
            raise

    async def _au_nom_du_membre[T](
        self, request: Request, appel: Callable[[str], Awaitable[T]]
    ) -> T:
        """Appel à ETIC Members avec le jeton de la session (après `principal`). Un jeton
        refusé là alors que l'introspection en cache le dit actif (déconnexion d'ETIC Members
        dans les 30 s) ferme la session : les autres routes ne l'accepteront plus non plus."""
        session: SessionOuverte = request.state.etic_session
        try:
            return await appel(session.jeton_acces)
        except ErreurAuth as erreur:
            if erreur.code != CODE_NON_AUTHENTIFIE:
                raise
            self.client.oublier_jeton(session.jeton_acces)
            raise await self._session_fermee(request, session, raison="jeton_refuse") from None

    async def _revoquer(self, refresh_token: str) -> None:
        """Révocation au mieux : ETIC Members indisponible n'empêche rien."""
        try:
            await self.client.revoquer(refresh_token)
        except ErreurAuth:
            logger.warning("révocation du jeton de rafraîchissement impossible")

    async def _fermer_session(self, request: Request, session: SessionOuverte) -> None:
        """Déconnexion : révocation amont au mieux, session supprimée et cookie vidé, toujours.

        ETIC Members indisponible n'empêche pas de se déconnecter : sans session serveur, le
        jeton d'accès encore vivant amont n'est plus utilisable depuis l'application.
        """
        await self._revoquer(session.jeton_rafraichissement)
        self.client.oublier_jeton(session.jeton_acces)
        await self._purger(request, session)

    async def _purger(self, request: Request, session: SessionOuverte) -> None:
        await run_in_threadpool(self.sessions.supprimer, session.cle_hash)
        request.session.clear()

    # -- Routes -----------------------------------------------------------------------

    def _vers_application(self, chemin: str) -> str:
        return f"{self.config.url_application}{chemin}"

    def routeur(self) -> APIRouter:
        """Routes d'authentification. Elles ne renvoient **jamais** de jeton au navigateur."""
        config = self.config
        routeur = APIRouter(prefix=config.prefixe_routes, tags=["auth"])

        @routeur.get("/login", response_class=RedirectResponse, status_code=status.HTTP_302_FOUND)
        def login(
            request: Request,
            suivant: Annotated[
                str | None, Query(max_length=2048, description="Chemin relatif de retour.")
            ] = None,
        ) -> RedirectResponse:
            """Envoie le navigateur vers ETIC Members, avec `state` et PKCE."""
            flux = flux_sso.demarrer_flux(request, suivant=chemin_de_retour(suivant))
            return RedirectResponse(
                self.client.url_authorize(flux.state, code_verifier=flux.code_verifier),
                status_code=status.HTTP_302_FOUND,
            )

        @routeur.get(
            "/callback", response_class=RedirectResponse, status_code=status.HTTP_302_FOUND
        )
        async def callback(
            request: Request,
            code: Annotated[str | None, Query(max_length=2048)] = None,
            state: Annotated[str | None, Query(max_length=512)] = None,
        ) -> RedirectResponse:
            """Retour du SSO : `state` vérifié **avant** l'échange, code échangé, statut du
            membre vérifié, session ouverte. Un échec renvoie à la page de connexion avec son
            seul code machine — l'écran est rédigé côté front, une chaîne venue de l'URL n'a
            rien à y faire."""
            try:
                code_verifier, suivant = flux_sso.verifier_state(request, state)
                if not code:
                    raise non_authentifie(
                        "Connexion interrompue. Relancez la connexion.",
                        raison="code_absent",
                        reconnecter=True,
                    )
                jeton = await self.client.echanger_code(code, code_verifier=code_verifier)
                await self._admettre(jeton)
                await run_in_threadpool(self.sessions.ouvrir, request, jeton)
            except ErreurAuth as erreur:
                return RedirectResponse(
                    self._vers_application(
                        f"{config.chemin_page_connexion}?erreur={quote(erreur.code, safe='')}"
                    ),
                    status_code=status.HTTP_302_FOUND,
                )
            return RedirectResponse(
                self._vers_application(chemin_de_retour(suivant) or "/"),
                status_code=status.HTTP_302_FOUND,
            )

        @routeur.get("/me")
        async def me(
            request: Request, principal: Annotated[Principal, Depends(self.principal)]
        ) -> MeOut:
            """Identité, droits et préférences d'interface de la session. Les préférences
            sont relues chez ETIC Members : un thème changé ailleurs s'applique ici au
            prochain chargement."""
            preferences: Preferences | None = None
            try:
                profil = await self._au_nom_du_membre(request, self.client.profil)
                preferences = profil.preferences
            except ErreurAuth as erreur:
                if erreur.http_status != 502:
                    raise
                logger.warning("préférences d'interface indisponibles")
            return MeOut(
                membre_id=principal.membre_id,
                email=principal.email,
                nom_affichage=principal.nom_affichage,
                permissions=sorted(principal.permissions),
                is_superadmin=principal.is_superadmin,
                preferences=preferences,
            )

        @routeur.patch("/preferences")
        async def preferences(
            request: Request,
            corps: Annotated[PreferencesIn, Body()],
            _principal: Annotated[Principal, Depends(self.principal)],
        ) -> Preferences:
            """Enregistre le thème chez ETIC Members : il vaut pour toute la suite."""
            return await self._au_nom_du_membre(
                request, lambda jeton: self.client.modifier_preferences(jeton, theme=corps.theme)
            )

        @routeur.post("/logout")
        async def logout(request: Request) -> OkOut:
            """Ferme la session. Sans garde : se déconnecter d'une session expirée réussit.
            La session ETIC Members, elle, reste ouverte : l'application est un satellite."""
            session = await run_in_threadpool(self.sessions.lire, request)
            if session is not None:
                await self._fermer_session(request, session)
            else:
                request.session.clear()
            return OkOut()

        return routeur
