---
"@etic-insa/auth": patch
---

Côté serveur (`etic-insa-auth`) : le budget d'un appel à ETIC Members (`budget_secondes`, 8 s
pour l'introspection, les droits, le profil et la révocation) borne désormais l'appel entier, et
non plus le seul lancement des nouvelles tentatives. Chaque tentative a pour délai le plus court
de `timeout_secondes` et du budget restant, avec un plancher d'une seconde
(`DELAI_PLANCHER_TENTATIVE_SECONDES`) ; un `timeout` imposé par l'appelant n'est pas remplacé.
Un `503` suivi d'une tentative qui pend durait jusqu'à 15 s, au-delà du délai après lequel un
navigateur ou une carte HubSpot abandonne ; il échoue maintenant vers 8 s. Le verdict ne change
pas : un dépassement reste une `ErreurAmont("timeout")`, traduite en
`502 external_service_unavailable`. Le nombre de tentatives, les codes d'erreur et les caches ne
changent pas.
