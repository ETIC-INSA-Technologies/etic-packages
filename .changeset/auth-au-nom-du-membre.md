---
"@etic-insa/auth": minor
---

Côté serveur (`etic-insa-auth`) :

- `AuthEtic.au_nom_du_membre(request, appel)` devient publique : elle appelle ETIC Members avec
  le jeton d'accès de la session et ferme la session si ETIC Members refuse ce jeton. Sans
  session, `401` : sous `simuler_principal`, `/me` et `/preferences` répondent désormais `401`
  au lieu d'une erreur interne.
- `MembreInconnu`, sous-classe d'`ErreurAuth` exportée par `etic_auth` : levée par
  `ClientMembers.droits_membre` quand ETIC Members ne connaît pas le membre (`404`). Toujours
  `502 external_service_unavailable` par défaut, avec `details.raison = "membre_inconnu"`.
- Docstring de `config.py` : `ConfigSSO.depuis_env` lit les variables qu'il énumère.
