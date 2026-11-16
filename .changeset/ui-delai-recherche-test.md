---
"@etic-insa/ui": minor
---

`setSearchDelay` (`@etic-insa/ui/test`) règle la pause de frappe par défaut de `SearchSelect`,
`useDebouncedValue` et `useDebouncedSearch` (300 ms hors test) : `setSearchDelay(0)` dans la mise
en place des tests épargne une attente réelle à chaque recherche simulée. Un `delai` passé
explicitement reste respecté ; rien ne change pour une application.
