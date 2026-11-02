# @etic-insa/auth

## 0.3.0

### Minor Changes

- 7eee8d1: Correctifs du client HTTP (`creerClientHttp`) :

  - Un 304 Not Modified n'est plus pris pour une redirection (`redirection_refusee`) : il lève
    `not_modified` (`CODE_NON_MODIFIE`, nouvel export, `status` 304), en JSON comme en
    `lireBlob`. Il n'arrive que si l'application pose elle-même `If-None-Match` ou
    `If-Modified-Since`.
  - Le message de repli d'une erreur sans enveloppe (proxy, page HTML, corps vide) se termine par
    le statut HTTP : « La requête n'a pas abouti. (HTTP 413) », « Ressource introuvable.
    (HTTP 404) ». Les codes ne changent pas ; une application qui comparait ces textes de repli
    doit les mettre à jour.
  - Garde interne contre le 401 tardif : une requête partie avec un jeton que `jeton()` ne rend
    plus (reconnexion pendant la requête) n'appelle plus `surNonAuthentifie`, qui ne purge donc
    jamais le nouveau jeton ; l'`ErreurApi` 401 est levée dans tous les cas. La signature du
    rappel ne change pas (`(erreur) => void`) et le jeton ne quitte toujours pas l'en-tête
    `Authorization`. Rien à faire côté application, sauf retirer une comparaison de jetons
    qu'elle ferait elle-même dans le rappel.
  - La base et les chemins sont résolus sur une même adresse de référence, lue une fois à la
    création du client. Une `base` malformée ne fait pas échouer la création (ni l'import du
    module qui crée le client) : chaque requête est rejetée par une `TypeError`.

## 0.2.0

### Minor Changes

- 35a5622: Client HTTP commun : `creerClientHttp({ base, jeton?, redirections?, credentials?, surNonAuthentifie?, delaiMax? })` rend `get`, `post`, `put`, `patch`, `delete`, `lireBlob` et `url`. Il remplace les clients écrits par chaque application (le README dit comment migrer depuis ceux d'ETIC Members et d'ETIC Docs) : toute requête qui n'aboutit pas lève une `ErreurApi` (statut, code, message, détails de l'enveloppe d'erreur) ; une page HTML reçue à la place de JSON est signalée (`reponse_non_json`) au lieu de passer pour une réponse. Le corps d'une requête est un seul paramètre : un `FormData`, un `Blob`, un `URLSearchParams` ou un `ArrayBuffer` part tel quel, le reste en JSON. Une réponse vide (204 ou 200 vide) rend `null`, que react-query accepte. `chaineRequete` construit la chaîne de requête (valeurs vides omises, dans un tableau aussi ; tableaux répétés) et `url(chemin, query?)` l'URL complète d'une navigation.

  Une requête est abandonnée après 30 s (`delai_depasse`). `delaiMax`, sur le client ou sur une requête (`lireBlob` compris, pour un gros fichier), accepte `Infinity` ou `null` (aucun délai), est plafonné à 2^31-1 ms et lève une `RangeError` pour une valeur ≤ 0 ou non finie. Sans `AbortSignal.any` (Safari avant 17.4), les signaux sont combinés par des écouteurs.

  Le jeton fourni par l'application part dans l'en-tête `Authorization` et nulle part ailleurs. Avec un jeton, les redirections sont refusées par défaut (`redirections: "refusees"`, erreur `redirection_refusee`, aussi pour une réponse 3xx reçue telle quelle sous Node) : une API FastAPI qui redirige un chemin à la barre oblique finale près (`redirect_slashes`, 307) fait alors échouer l'appel, le chemin doit être écrit exactement comme la route. Un chemin qui ne commence pas par un seul `/`, qui contient un espace ou un caractère de contrôle, ou dont l'URL résolue quitte l'origine de la base, lève une `TypeError` (erreur de programmation). Si `surNonAuthentifie` lève, l'appelant reçoit quand même l'erreur 401 et l'exception est signalée par `reportError`.

  Sans enveloppe d'erreur, le code et le message viennent d'une seule table, alignée sur les backends : `unauthenticated` (401), `forbidden` (403), `not_found` (404), `conflict` (409), `validation_error` (422), `not_implemented` (501), `external_service_unavailable` (502, 503), `internal_error` pour tout autre 5xx et `http_<statut>` pour tout autre 4xx. Pour `creerClientAuth`, qui repose sur ce client, un 404, un 409, un 422 et un 501 changent donc de code (avant : `http_404`…, `internal_error` pour le 501).

## 0.1.0

### Minor Changes

- e6f3f9e: Première version : connexion à ETIC Members des deux côtés. Serveur (`etic-insa-auth` sur
  PyPI, même numéro) : SSO avec PKCE, session serveur aux jetons chiffrés, introspection à
  chaque requête, rafraîchissement sous verrou, gardes de permission, contrôle d'origine, cookie
  `__Host-` en HTTPS et thème partagé. Navigateur : session, droits pour l'affichage et thème partagé, pour React.
