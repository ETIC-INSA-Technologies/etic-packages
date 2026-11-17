---
"@etic-insa/ui": minor
---

`setEmptyValue(texte?)` règle une fois, au démarrage de l'application (et dans la mise en place
de ses tests), le texte d'une valeur absente, désormais tenu à un seul endroit : celui
d'`EmptyValue`, de `DetailItem` et du repli par défaut de tous les formateurs (`formaterDate`,
`formaterMontant`…). `getEmptyValue()` le lit. Sans réglage, rien ne change (« — ») ; un `repli`
passé à un formateur reste respecté, et `EmptyValue` est toujours lu « non renseigné ».
