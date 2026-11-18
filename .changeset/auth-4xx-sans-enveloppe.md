---
"@etic-insa/auth": minor
---

Côté Python : une réponse `4xx` sans l'enveloppe d'erreur d'ETIC Members (celle du routeur pendant
un redéploiement) est rejouée comme une panne, puis journalisée « etic_members : injoignable » et
non plus « requête refusée » ; elle n'est plus prise pour un refus d'ETIC Members (un `401` ou un
`403` sans enveloppe n'alerte plus sur les identifiants de l'application). `reessayable(statut,
code)`, exporté, donne la même décision à un client HTTP de l'application.
