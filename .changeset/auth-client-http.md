---
"@etic-insa/auth": minor
---

Client HTTP commun : `creerClientHttp({ base, jeton?, credentials?, surNonAuthentifie?, delaiMax? })` rend `requete`, `get`, `post`, `put`, `patch`, `delete` et `lireBlob`. Il remplace les clients écrits par chaque application : toute requête qui n'aboutit pas lève une `ErreurApi` (statut, code, message, détails de l'enveloppe d'erreur), aussi exportée sous le nom `ApiError` ; une requête est abandonnée après 30 s (`delai_depasse`) ; une page HTML reçue à la place de JSON est signalée (`reponse_non_json`) au lieu de passer pour une réponse. Le jeton fourni par l'application part dans l'en-tête `Authorization` et nulle part ailleurs ; une requête qui le porte ne suit aucune redirection (`redirection_refusee`) : une API FastAPI qui redirige un chemin à la barre oblique finale près (`redirect_slashes`, 307) fait alors échouer l'appel, le chemin doit être écrit exactement comme la route. `chaineRequete` construit la chaîne de requête (valeurs vides omises, tableaux répétés).

Sans enveloppe d'erreur, un 404, un 409 et un 422 donnent désormais les codes `not_found`, `conflict` et `validation_error` (au lieu de `http_404`…) avec un message lisible. `creerClientAuth` repose sur ce client ; une réponse vide y rend `undefined` au lieu de `null`.
