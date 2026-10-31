# @etic-insa/auth

## 0.1.0

### Minor Changes

- e6f3f9e: Première version : connexion à ETIC Members des deux côtés. Serveur (`etic-insa-auth` sur
  PyPI, même numéro) : SSO avec PKCE, session serveur aux jetons chiffrés, introspection à
  chaque requête, rafraîchissement sous verrou, gardes de permission, contrôle d'origine, cookie
  `__Host-` en HTTPS et thème partagé. Navigateur : session, droits pour l'affichage et thème partagé, pour React.
