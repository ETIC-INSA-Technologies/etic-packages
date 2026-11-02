---
"@etic-insa/auth": patch
---

Correctifs du client HTTP (`creerClientHttp`) :

- Un 304 Not Modified n'est plus pris pour une redirection (`redirection_refusee`) : il lève
  `not_modified` (`CODE_NON_MODIFIE`, exporté, `status` 304), en JSON comme en `lireBlob`. Il
  n'arrive que si l'application pose elle-même `If-None-Match` ou `If-Modified-Since`.
- Le message de repli d'une erreur sans enveloppe (proxy, page HTML, corps vide) porte le statut
  HTTP avant le point de sa première phrase : « La requête n'a pas abouti (HTTP 413). »,
  « Ressource introuvable (HTTP 404). ». Les codes ne changent pas ; une application qui comparait
  ces textes de repli doit les mettre à jour.
- `surNonAuthentifie` reçoit en second argument le jeton envoyé par la requête (`null` sans
  jeton) : une application peut ignorer le 401 tardif d'une requête partie avec un ancien jeton
  (ne purger que si le jeton courant est celui de la requête). Rétrocompatible : un rappel à un
  argument reste valable.
- L'origine de la base est calculée une fois, à la création du client, et non à chaque requête.
