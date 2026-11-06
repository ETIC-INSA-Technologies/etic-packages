---
"@etic-insa/ui": minor
---

`@etic-insa/ui/vite` : plugin Vite `eticPackagesSources()` qui sert, en développement seulement,
les sources locales d'etic-packages à la place des paquets installés (`ETIC_UI_SOURCES`, sinon
un checkout voisin du dépôt de l'application, worktrees compris ; `ETIC_UI_SOURCES=npm` force
les paquets). Alias, `dedupe`, accès du serveur au checkout, `@source` de Tailwind et annonce de
ce qui est servi, au lieu d'une configuration recopiée dans chaque application. `auth: true`
sert aussi `@etic-insa/auth`. N'emploie que Node et Vite, déclaré dépendance pair facultative.
