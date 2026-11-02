---
"@etic-insa/auth": minor
---

Correctifs du client HTTP (`creerClientHttp`) :

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
