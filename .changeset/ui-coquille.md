---
"@etic-insa/ui": minor
---

Coquille, fiches et requêtes.

- `AppShell` : le `bandeau` reçoit les gouttières de `PageContainer` ; l'application le passe nu, sans enveloppe de marges. Un bandeau absent ou qui ne rend rien ne laisse pas d'espace. Sur mobile, le bouton du menu n'a plus qu'un nom, « Ouvrir le menu ».
- `SidebarTrigger` accepte `libelle`, le nom lu du bouton (« Afficher ou masquer le menu » par défaut), au lieu d'un `aria-label` qui masquait ce texte.
- `useAuthObjectUrlEtat(src, charger, cle?)` donne `{ url, enCours, echec, erreur }` : une page peut dire « aperçu indisponible » au lieu de charger sans fin. `useAuthObjectUrl` ne change pas. `AuthImage` accepte `secoursEchec`, affiché en cas d'échec.
- `Avatar` et `AuthAvatar` acceptent `diametre` (en px), au-delà de 40 px : les initiales suivent (36 % du diamètre) et prennent la graisse de la racine (`className="font-semibold"`).
- `QueryErrorBanner({ requete })` est exporté : le bandeau d'erreur de `QueryBoundary`, avec « Réessayer », pour une page qui place elle-même ses données.
- `QueryBoundary` accepte `introuvable` (texte ou nœud, avec un lien de retour) : affiché à la place du bandeau quand l'erreur porte un `status` 404 (`ErreurApi` de `@etic-insa/auth`, ou toute erreur de même forme), sans « Réessayer ». Les autres échecs gardent le bandeau.
- Nouveaux `Disclosure` et `DisclosureTrigger` : section repliable à chevron tournant, `variante` `lien`, `discret` ou `carte`, `compteur` en pastille, ouverte ou non d'emblée, ou contrôlée ; `classNameDeclencheur` et `classNameContenu` pour aligner le déclencheur et le panneau. Le « Détails » d'`ErrorBanner` l'emploie : son chevron passe à gauche du libellé et pointe à droite, fermé.
- Nouveau `CenteredScreen` : écran hors de la coquille (connexion, page introuvable), contenu centré sur toute la hauteur.
- Onglets `variant="line"` : sous 640 px, ils passent à la ligne au lieu de déborder, chacun à la largeur de son libellé. Au-delà, rien ne change.
