---
"@etic-insa/auth": minor
---

Côté serveur (`etic-insa-auth`), exportés par `etic_auth` : `developper(permissions,
implications)`, l'expansion des permissions par leurs implications qu'applique `AuthEtic` au
principal, pour des droits calculés hors session ; `STATUTS_REESSAYABLES` et
`CODES_DEFINITIFS` (aussi dans `etic_auth.transport`), les statuts HTTP rejoués et les
`error.code` jamais rejoués par le transport vers ETIC Members, pour qu'un client HTTP de
l'application décide de la même façon. Les anciens noms privés du transport restent.
