# @etic-insa/ui

## 0.4.0

### Minor Changes

- ad736dd: Les boutons d'en-tête de page passent à 36 px partout : `PageHeader` comme `DetailHeader`
  agrandissent leurs actions sans `size` à leur donner (`Button`, `TooltipButton`, `DeleteButton`
  avec `avecTexte`, `ButtonLink` : `default` prend la hauteur de `lg`, `icon` celle d'`icon-lg` ;
  une taille plus petite donnée par `size` ou par `className` reste). Les tailles `default` et
  `icon` de `buttonVariants` lisent leur hauteur dans `--bouton-hauteur` et `--bouton-icone`
  (32 px sans elles), que la zone des actions pose. `tailleActions` vaut désormais `lg` par
  défaut, aussi sur `PageHeader` (nouvelle prop) ; `tailleActions="default"` garde 32 px. Côté
  application, les `size="lg"` et `tailleActions="lg"` des en-têtes deviennent superflus.
- a1bde3b: `dataTableActionsColumn` : les commandes d'une ligne (supprimer…) ne s'affichent plus que sur la
  ligne survolée, plutôt que la même icône répétée sur chaque ligne. Elles sont transparentes, pas
  retirées : toujours dans l'ordre de tabulation et lues par les lecteurs d'écran. Elles
  apparaissent aussi quand le focus est dans la ligne (clavier), quand l'une d'elles a ouvert un
  menu, et toujours sur écran tactile (pas de survol). Nouvelle option `toujoursVisibles` pour
  garder l'ancien affichage sur une liste donnée. Rien à faire côté application.
- c40d54a: « Sélectionner les N » passe du bandeau de `DataTable` à la barre `DataTableBulkActions` : cocher
  toute la page n'insère plus de ligne au-dessus du tableau, qui ne se décale plus. La barre propose
  un bouton compact à côté de son compte (icône et « Sélectionner les 137 », l'icône seule sur
  téléphone, nom complet « Sélectionner les 137 personnes ») ; une fois accepté, elle compte le
  total et le focus passe à « Tout désélectionner ». Le bandeau
  (`[data-slot="data-table-select-all"]`) n'existe plus : un tableau avec `total` mais sans
  `DataTableBulkActions` ne propose plus de tout sélectionner. Les props `unite` et `feminin` de
  `DataTable` restent, pour l'annonce « Les 137 éléments sont sélectionnés ».
- 9c82a92: Les neutres du thème (fonds, panneaux, bordures, textes secondaires, anneau de focus et accent
  par défaut, barre latérale) passent de la couleur de base `gray` de shadcn, légèrement bleutée, à
  la couleur de base `zinc` (registre shadcn, palette `zinc` de Tailwind 4 : gris froid presque
  neutre), avec exactement les valeurs du preset, contraste faible compris : `--muted-foreground`
  redevient zinc-500 (4,39:1 sur `--muted` en clair). Seuls écarts gardés : `--page` (zinc-50 en
  clair, `--background` en sombre), barre latérale blanche en clair, `--control-border` (bord des
  contrôles non cochés, au moins 3:1 : `--muted-foreground` plein en clair, atténué en sombre), couleurs sémantiques (`--destructive` éclairci en sombre),
  `color-scheme`, et des fonds sombres éclaircis : gris très foncé plutôt que presque noir (fond,
  cartes, menus, barre latérale et `--muted` remontent d'un cran, écarts entre eux gardés). Rien
  à faire côté application, sauf si elle surchargeait des neutres : les recalculer sur `zinc`.

  Un tableau se détache de la surface qui le porte : le cadre de `DataTable` passe de `bg-card` au
  nouveau jeton `bg-tableau`, qui vaut `--card` sur la page et `--tableau-encart` (nouveau jeton,
  un cran plus sombre que la carte, même écart discret dans les deux thèmes) dans
  toute surface de la bibliothèque peinte en `bg-card` ou `bg-popover` — `Card` (`SectionCard`
  comprise), `Alert`, dialogue, `AlertDialog`, tiroir, popover, menu déroulant, liste d'un
  `Select` ou d'un `Combobox`, `SaveBar`, barre d'actions groupées, barre latérale, `Disclosure`
  `variante="carte"` (qui porte désormais `data-variante` sur sa racine). Les lignes gardent le
  survol et la sélection de shadcn. Rien à faire pour `DataTable` ; un cadre de tableau propre à
  l'application peut prendre `bg-tableau` au lieu de `bg-card` pour suivre la même règle.

### Patch Changes

- f7fbe38: `RemovableBadge` : un marqueur placé après le libellé (cadenas d'un élément critique…) est
  centré à 4 px du texte, comme une icône de `Badge`, au lieu de reposer sur la ligne de base ;
  seul le premier élément (le texte) se coupe quand la place manque. `Toggletip` : posé dans un
  badge, sa bulle part du contour du badge et non du texte.
- f192331: `DataTableCellLink` : le titre d'une ligne ne se souligne plus au survol, la ligne entière se
  surligne déjà. Gras et anneau de focus inchangés ; rien à faire côté application.
- 77ad8c7: `AppShell` : le logo de la marque, en haut de la barre latérale, passe de 28 à 32 px, comme le
  sélecteur d'équipe de shadcn (toute la hauteur utile du bouton) ; dans la barre repliée, il
  remplit le bouton et y est centré (il était décalé de 2 px vers la gauche).
- 4d709c6: `DataTable` : la ligne dépliée et son détail se lisent comme un seul bloc. La ligne perd sa
  bordure basse et prend le fond du détail (`bg-muted/50`) ; le détail, qui avait un fond plus
  clair (`bg-muted/30`), suit celui de la ligne, teinte de la sélection comprise. Rien à faire côté
  application.
- 810a95b: `DetailList` en `grille` compte quatre colonnes au plus (toujours d'au moins 14rem) : sur un écran
  large, deux paires occupent la moitié gauche de la carte, au lieu de deux colonnes étroites devant
  six ou sept vides. Une valeur moyenne (description, URL) ne revient plus à la ligne sans raison, et
  une liste courte garde de l'air à droite.
- 1a74507: `AppShell`, pied de la barre latérale : le menu du compte prend le contour du bouton de thème
  voisin (`--border`, `--input` en sombre, comme la variante `outline` des boutons), tracé en ombre
  d'1 px pour ne pas rogner l'avatar de la barre repliée. Rien à faire côté application.
- 1a74507: `AppShell`, pied de la barre latérale : le bouton de thème n'a plus de fond propre en sombre (le
  `dark:bg-input/30` de la variante `outline` tranchait sur la barre) et prend le survol du menu
  du compte voisin (`bg-sidebar-accent`). L'avatar du compte passe du rond au carré arrondi
  (`rounded-lg`, comme le `nav-user` de shadcn), à la forme du survol de son bouton et du bouton de
  thème, barre repliée comprise ; le survol du menu du compte passe lui aussi à `rounded-lg`. Rien
  à faire côté application.
- aac2663: `SaveBar collante` ne se colle en bas de l'écran, sur sa carte, que tant qu'il y a des
  modifications (`modifie`) ou un envoi en cours (`enCours`). Sans modification, elle reste à sa
  place sous le formulaire, sans carte : elle ne flotte plus sur le contenu comme un bandeau vide
  portant un bouton grisé. La carte est désormais pleinement opaque (un fond translucide et flouté
  laissait deviner le texte recouvert), et le statut se range à gauche, les boutons à droite. Rien
  à faire côté application, si ce n'est passer `modifie` comme le recommandait déjà la
  documentation.
- 1a7f5d0: La liste d'un `Select` prend la largeur de ses options — au moins celle du champ, au plus
  l'espace disponible — au lieu de la largeur exacte du champ, qui coupait net les options plus
  longues que lui (un champ étroit dans un tableau, une barre d'actions). Une option qui dépasse
  encore l'espace disponible passe à la ligne. Dans le champ, une valeur trop longue finit par
  « … » au lieu d'être coupée net (le `flex` de shadcn sur la valeur annulait son `line-clamp-1`) ;
  une icône dans la valeur reste en ligne avec le texte. Rien à faire côté application.

## 0.3.0

### Minor Changes

- c593249: Boutons et infobulles :

  - `TooltipButton` à icône seule (`size` `icon…`) est nommé par son `infobulle` (`aria-label`), comme le promettait sa documentation, même verrouillé (la raison reste sa description) ; un `aria-label` ou `aria-labelledby` donné par l'application est gardé, et un bouton à texte garde son texte pour nom. L'application peut retirer l'`aria-label` qu'elle recopiait de l'infobulle.
  - Un `Button` `aria-disabled` (désactivé mais focalisable : `focusableWhenDisabled`, `TooltipButton` verrouillé, validation d'un `ConfirmDialog` à `saisie`, boutons d'un dialogue pendant son action) prend l'allure désactivée : estompé, curseur interdit, sans enfoncement au clic. Il reste survolable pour son infobulle. Les règles CSS ajoutées par les applications pour ce cas peuvent disparaître.
  - `Button` accepte `enCours` et `libelleEnCours` (même nom que l'`enCours` d'`IconToggle` ou d'`ErrorBanner`) : la roue muette prend la place de ses icônes (marges inchangées ; un bouton à texte sans icône s'élargit de la roue), `aria-busy`, curseur d'attente et pas de survol, clics ignorés, focus gardé. `SpinnerDecoratif` (roue sans rôle ni nom) est exporté, ainsi que `fermerSaufEnCours(enCours, setOuvert)`, l'`onOpenChange` d'un dialogue qui s'ouvre normalement mais refuse de se fermer pendant son action.
  - `Button` a une taille `inline` (`variant="link" size="inline"`) : lien dans une phrase ou une cellule, sans hauteur ni marge de bouton, cible de 24 px gardée.
  - `TooltipButton` accepte `destructif` : gris au repos, rouge au survol seulement (gris aussi verrouillé).
  - Nouveau `ButtonLink` : lien à l'allure de bouton (`variant`, `size`), annoncé comme un lien ; `lien` reçoit le composant de lien du routeur de l'application, comme pour `AppShell` (`<a>` par défaut).
  - `CopyButton` dans un `InputGroupAddon` passe à 24 px, comme le bouton de shadcn dans un groupe : à 28 px, il touchait presque la bordure du champ et son anneau de focus en sortait. Une `size` donnée par l'application est respectée.

- da7fd59: Champs et sélection.

  - `Select` : la liste s'ouvre désormais sous le champ, alignée à gauche, et ne recouvre plus jamais la zone de saisie (défauts de `SelectContent` : `alignItemWithTrigger={false}`, `align="start"`, au lieu de l'option choisie posée sur le champ et d'une liste centrée). **Changement visible** pour tout `Select` ; les deux réglages restent surchargeables. Une application qui enveloppait `SelectContent` pour obtenir ce comportement (et recopiait `DataTableSelectFilter` pour la même raison) peut retirer son enveloppe.
  - `SelectContent` : sans option, y compris avec un `SelectGroup` vide, la liste affiche « Aucune option. » au lieu d'une fenêtre vide, dans une zone de statut annoncée aux lecteurs d'écran (`vide` pour un autre texte) ; des options posées sans `SelectGroup` ont la même marge que dans un groupe.
  - `SelectItem` accepte `description` : une précision sous le libellé, reliée à l'option (`aria-describedby`), par exemple la raison d'une option `disabled`, qui reste lisible quand le libellé s'estompe. Le nom de l'option reste son libellé, qui passe à la ligne au lieu d'être coupé.
  - `Checkbox` : une case s'estompe d'après son propre état (`data-disabled`, `aria-disabled`, `fieldset` désactivé, où elle est réellement inactive). Dans une `CheckboxList` posée dans un `FormField`, une case figée n'estompe plus toutes les autres ; une case `aria-disabled` (lecture seule) prend l'apparence figée.
  - `ComboboxInput` ancre lui-même la liste de son `Combobox` sur son cadre, et non plus sur le seul champ que décale un addon de tête : la liste de `SearchSelect` s'aligne sur le bord du champ, loupe comprise, à sa largeur exacte, dès l'ouverture (`defaultOpen` compris). Rien à câbler ; une `anchor` explicite (puces) l'emporte toujours. La largeur minimale d'une liste de `Combobox` est celle de son ancre, sans les 28 px ajoutés par shadcn.
  - `DatePicker` : `moisInitial` choisit le mois montré à l'ouverture tant qu'aucune date n'est choisie (une date de naissance ne s'ouvre plus sur le mois courant) ; le calendrier le suit s'il change, y revient quand la date est effacée, et le ramène entre `dateMin` et `dateMax`. Fermé au clavier ou par un jour choisi, le calendrier rend le focus au champ : un seul Échap de plus ferme le dialogue englobant. Après un clic ailleurs, le focus reste où l'on a cliqué. Le champ porte `NO_AUTOFILL` : les gestionnaires de mots de passe n'y proposent plus d'identifiant.
  - `PhoneInput` : en erreur (`aria-invalid` du numéro), le groupe est traité comme un seul champ : bordure rouge sur le sélecteur de pays comme sur le numéro, et un seul halo autour des deux.
  - `formaterTelephone(numero, { paysParDefaut = "FR" })` : un numéro E.164 écrit pour l'affichage hors d'un champ, sans drapeau : national pour le pays par défaut (`06 55 18 92 45`), international pour tout autre, pour que son pays se lise, tel quel s'il est illisible. Pour une application qui affichait jusqu'ici l'E.164 brut hors de France métropolitaine, **l'affichage change** : un numéro d'outre-mer ou étranger s'écrit désormais au format international espacé (`+590 590 12 34 56`, `+44 20 7946 0958`) au lieu de `+590590123456`. Dans une longue liste, mémoïser le résultat.
  - Base UI, date-fns et la locale française du calendrier sont importés par sous-chemin, ce qu'impose désormais une règle ESLint : les outils sans tree-shaking (vitest) ne chargent plus tous les composants de Base UI, toutes les fonctions de date-fns ni toutes les locales.

- 2adbdf0: Coquille, fiches et requêtes.

  - `AppShell` : le `bandeau` reçoit les gouttières de `PageContainer` ; l'application le passe nu, sans enveloppe de marges. Un bandeau absent ou qui ne rend rien ne laisse pas d'espace. Il sert aux messages de toute l'application : il prend la largeur du contenu, pas celle d'une page étroite ; un message propre à une page va dans son `PageContainer`. Sur mobile, le bouton du menu n'a plus qu'un nom, « Ouvrir le menu ».
  - `SidebarTrigger` : `libelle` est ajouté, le nom lu du bouton (« Afficher ou masquer le menu » par défaut), au lieu d'un `aria-label` qui masquait ce texte. Rien n'est retiré : des `children` remplacent toujours l'icône et le libellé.
  - `useAuthObjectUrlEtat(src, charger, cle?)` donne `{ url, enCours, echec, erreur }` : une page peut dire « aperçu indisponible » au lieu de charger sans fin. `useAuthObjectUrl` ne change pas. `AuthImage` accepte `secoursEchec`, affiché en cas d'échec.
  - `Avatar` et `AuthAvatar` acceptent `diametre` (en px), au-delà de 40 px : les initiales suivent (36 % du diamètre) et prennent la graisse de la racine (`className="font-semibold"`). Avec un diamètre, `size` ne s'applique plus ; un diamètre de 0 est ignoré.
  - `QueryErrorBanner({ requete })` est exporté : le bandeau d'erreur de `QueryBoundary`, avec « Réessayer », pour une page qui place elle-même ses données.
  - `QueryBoundary` accepte `introuvable` (texte ou nœud, avec un lien de retour) : affiché à la place du bandeau quand l'erreur porte un `status` 404 (`ErreurApi` de `@etic-insa/auth`, ou toute erreur de même forme), sans « Réessayer ». Les autres échecs, et `introuvable` à `null` ou `false`, gardent le bandeau.
  - Nouveaux `Disclosure` et `DisclosureTrigger` : section repliable à chevron tournant, `variante` `lien`, `discret` ou `carte`, `compteur` en pastille, ouverte ou non d'emblée, ou contrôlée ; `classNameDeclencheur` et `classNameContenu` pour aligner le déclencheur et le panneau. Le « Détails » d'`ErrorBanner` l'emploie : son chevron passe à gauche du libellé et pointe à droite, fermé.
  - Nouveau `CenteredScreen` : écran hors de la coquille (connexion, page introuvable), contenu centré sur toute la hauteur.
  - Onglets `variant="line"` : sous 640 px, ils passent à la ligne au lieu de déborder, chacun à la largeur de son libellé. Au-delà, rien ne change.

- da66f79: Dans `AppShell`, la validation de la déconnexion est en rouge (variante `destructive`), comme celle d'un `ConfirmDialog`.

  `Checkbox` : le bord d'une case vide se voit en clair (`--control-border`, `--muted-foreground` à 80 %, ≥ 3:1 ; inchangé en sombre).

  `IconToggle` accepte `ton` (`neutral`, `success`, `warning`, `destructive`) : actif, le bouton prend cette couleur, `warning` (jaune) par défaut, puisqu'il signale un élément sensible ; `ton="neutral"` garde le fond gris du `Toggle`. Inactif, il est gris (`--muted-foreground`), comme les icônes d'action voisines.

- b4f35d3: `DetailHeader` accepte `tailleActions` (`"default"` ou `"lg"`) : le bouton « Plus d'actions » prend la taille des boutons d'action (`icon-lg` à côté de boutons `size="lg"`) au lieu de rester à 32 px, et son menu s'ouvre à 6 px du bouton au lieu de 4, à l'échelle.
- 6f181ac: `DetailList` accepte `disposition` (type exporté `DetailListDisposition`) : `grille` (défaut, rendu inchangé : une colonne sur téléphone, autant que la largeur en permet au-delà), `pile` (une seule colonne à toute largeur, libellé au-dessus de la valeur, pour une carte étroite, un dialogue ou des valeurs longues : remplace `className="sm:grid-cols-1"`) ou `ligne` (métadonnées secondaires : « libellé : valeur » en petit et en discret, l'une après l'autre sur toute la largeur). La liste porte `data-disposition`.
- 5ff92ac: Dialogues : `DialogContent` et `AlertDialogContent` plafonnent leur hauteur à l'écran (`max-h-[calc(100dvh-2rem)]`) : sur téléphone, le bas d'un long dialogue et ses boutons ne sortent plus de l'écran, et rien ne défile à l'horizontale. Le contenu est une colonne ; le nouveau `DialogBody` est la zone qui défile seule, titre, croix et pied restant visibles (`FormDialog`, `ConfirmDialog` et `DraftResumeDialog` s'en servent ; sans lui, tout le contenu défile). Une règle locale sur `[data-slot="dialog-content"]` devient inutile. Les titres et descriptions d'`AlertDialog` (et donc de `ConfirmDialog`) sont alignés à gauche dès le téléphone, comme leur contenu, sauf avec un `AlertDialogMedia`.

  `ConfirmDialog` vide la saisie de `saisie` quand `saisie.attendu` change pendant l'ouverture (nombre d'éléments changé côté serveur), sans remonter le dialogue : le focus reste dans le champ, et la `key` forcée pour le vider n'est plus nécessaire. Ce champ porte `NO_AUTOFILL` : les gestionnaires de mots de passe ne s'y invitent plus. Nouvelles options : `verrou` (confirmation impossible, la raison en infobulle et en description du bouton, qui reste focalisable et garde le focus quand le verrou tombe), `libelleAnnuler`, `taille` (`"sm"` par défaut, `"md"` ou `"lg"` pour un récapitulatif, sur toute la largeur du téléphone), `elements` avec `libelleElements` (liste nommée des éléments concernés, qui défile ; une adresse sans espace passe à la ligne) et `onAnnuler`, appelé seulement quand la personne renonce (« Annuler » ou Échap), alors que `onOuvertChange(false)` suit aussi une confirmation réussie.

  `TooltipButton` garde le même bouton quand son `verrou` ou son `infobulle` apparaît ou disparaît : il n'est plus remonté, et garde le focus.

  `FormDialog` s'ouvre sur le premier contrôle actif et affiché (case, liste, choix segmenté…) quand le formulaire n'a pas de champ où l'on tape (le focus allait à « Annuler ») ; un champ masqué (panneau replié) n'est plus visé. Nouvelles options : `libelleAnnuler` et `actionSecondaire` (`libelle`, `onChoisir`, `destructif`), une troisième sortie discrète en tête du pied, occupée pendant l'envoi.

  Nouveaux : `DraftResumeDialog`, le dialogue « un brouillon existe » qui accompagne `useDraftAutosave` (quitter, repartir de zéro avec suppression attendue, reprendre au même point ; sans croix ; `erreur` affiche l'échec d'une suppression lancée ailleurs, jusqu'à ce que la personne la relance) ; `useUnsavedChangesWarning(modifie)`, qui retient la fermeture de l'onglet tant que la page est modifiée (`modifie` : un booléen, ou une fonction lue au moment de quitter ; `useDraftAutosave` s'en sert), et `UnsavedChangesDialog`, qui confirme une navigation retenue par le routeur de l'application (`blocage` : le `useBlocker` de react-router se passe tel quel).

- 437c61c: Harmonisation des boutons occupés, des liens et des explications.

  - Un seul état « en cours » : la confirmation de `ConfirmDialog`, l'envoi de `FormDialog`, « Repartir de zéro » de `DraftResumeDialog`, « Réessayer » d'`ErrorBanner`, `FileUploadButton` et `IconToggle` sont tous le `Button` en cours (roue muette à la place de l'icône, `aria-busy`, `data-en-cours`, focus gardé). La roue de `FileUploadButton` n'a plus de nom « Chargement » lu en double.
  - `IconToggle` est rendu en `Button` à icône et change d'allure : en `sm` (par défaut), il passe de 34 × 28 px avec une icône de 14 px à un carré de 28 × 28 px avec une icône de 16 px, la géométrie de la corbeille de `DeleteButton` et des `TooltipButton` `icon-sm` qui l'entourent (`default` : 32 px, `lg` : 36 px). Son API ne change pas.
  - `FormDialog` : `actionSecondaire.onChoisir` peut renvoyer une promesse, attendue comme un envoi (bouton en cours, dialogue figé, erreur en tête) ; une action qui aboutit après la fermeture du dialogue est ignorée (pas d'erreur périmée à la réouverture, ici comme dans `ConfirmDialog` et `DraftResumeDialog`) ; une action secondaire `destructif` est grise et rouge au survol, comme `TooltipButton destructif`, au lieu d'un texte rouge.
  - `LienProvider lien={RouterLink}` (et `useLien`, type `LienComposant`) : `AppShell`, `DetailHeader`, `ButtonLink` et `DataTableCellLink` prennent le lien du routeur sans `lien={…}` à chaque appel ; la prop `lien` reste prioritaire (`lien="a"` pour un téléchargement ou une adresse externe). `RouterLink` doit être une référence stable, définie au niveau du module. `AppShellLienComposant` reste un alias, déprécié. Migration d'une application qui avait son propre `ButtonLink` sur le `Link` de son routeur : `to` devient `href` (le `LienRouteur` le traduit : `({ href, ...props }) => <Link to={href} {...props} />`).
  - `ErrorBoundary` : « Retour à l'accueil » est un `ButtonLink` (`lien="a"`, rechargement complet gardé).
  - `Toggletip` : explication sur `Popover`, ouverte au toucher, au clic, au survol et au focus, fermée au toucher ailleurs, à Échap ou quand le focus part ; son clic ne remonte pas à une ligne ou une carte cliquable, et les props de son élément `render` (gestionnaires, `ref`, classes) sont fusionnées. `ExplainedBadge` en est fait (même API) : son explication s'ouvre maintenant au toucher.
  - `PopoverContent` (écart shadcn) accepte `anchor`, pour un popover sans `PopoverTrigger`.
  - Infobulles (écart shadcn) : `TooltipTrigger` ne s'ouvre plus sur le focus qu'un popup (menu, calendrier, dialogue) rend à son déclencheur en se fermant, par Échap ou par un choix. L'Échap suivant ferme bien le dialogue englobant (`ThemeMenu`, « Plus d'actions » de `DetailHeader`). Tout autre focus clavier l'ouvre comme avant, y compris le focus initial d'un dialogue ouvert par Entrée.

- 30076b3: Statuts et indicateurs :

  - `StatusTon` gagne `info` (bleu, pour un changement sans gravité) : `StatusBadge`, `StatTile`, `IconToggle` et la nouvelle variante `info` de `Badge` l'acceptent.
  - `Progress` accepte `ton` (piste et remplissage de la couleur de l'état : `warning` au-delà d'un seuil, `destructive` quand c'est plein) et `size="lg"` (piste de 8 px) : plus besoin de viser `[data-slot=progress-track]` par `className`.
  - `SegmentedControlOption` accepte `ton` : le segment choisi prend la couleur de l'état que produit le choix (fond, texte, liseré), sans `className`.
  - `Badge` accepte `size="lg"` (28 px), et `RemovableBadge` est un badge de cette taille terminé par une croix « Retirer » (`onRetirer`, `libelleRetirer` qui nomme l'élément, `enCours` occupé sans perdre le focus, `verrou` qui dit pourquoi le retrait est impossible).
  - Nouveaux `ExplainedBadge` (badge dont l'explication s'ouvre au survol et au focus et se lit après le badge), `SaveBar` (« Enregistrer », « Annuler » au besoin, statut annoncé « Enregistré » ou, avec `modifie`, « Modifications non enregistrées », variante `collante` en bas d'un long formulaire) et `StatGrid` (rangée de `StatTile` en colonnes de `largeurMin` au moins, une seule sur téléphone).

  `StatusTon` s'importe toujours de la racine du paquet.

  Seul point de compatibilité : une application qui associe une valeur à chaque ton par un `Record<StatusTon, …>` doit y ajouter `info` (erreur de type sinon). Rien ne change à l'exécution.

- 3eaf2a2: Tableaux : `useDataTable` filtre, trie et pagine côté client. `paginationClient` découpe la liste en pages de 25 lignes, que `DataTablePagination table={table}` pilote et que `DataTableCount` (ou le `compteur` de `DataTableToolbar`) compte avec `{ table }`. `filtreGlobal` cherche sans casse ni accents, `filtresColonnes` applique le `filterFn` de chaque colonne, et le tri `sortFn: "texteFr"` suit l'ordre alphabétique français (`comparerFr`, exporté avec `normaliserRecherche`). Un changement de filtre ou de tri ramène à la première page ; une suppression garde la page courante. Les tableaux paginés côté serveur ne changent pas.

  `DataTable` accepte `requete` (le résultat de `useQuery`) : en échec, le `QueryErrorBanner` (« Réessayer ») s'affiche au-dessus du tableau, sans état vide qui le contredise. Les colonnes gardent leur largeur quand le tableau se vide. Quand une ligne qui avait le focus disparaît, quelle que soit la commande (corbeille, menu, dialogue), le tableau rend le focus à la ligne voisine, sinon à lui-même. Nouveaux : `dataTableActionsColumn` (colonne « Actions » prête à l'emploi, `enableHiding` pour la rendre masquable), `DataTableCellLink` (titre de ligne en lien, routeur compris, ou en bouton) et `table.options.meta.deselectionner(ids)` (retirer quelques lignes de la sélection). `focaliserTableau` est exporté.

  `DataTableViewOptions` et `DataTableBulkActions` servent aussi un tableau rendu à la main, sans `useDataTable` : `colonnes` et les options de colonnes de `useDataTable` (`visibiliteColonnes`, `ordreColonnes` et leurs `on…Change`) pour l'un ; `nombre`, `onToutDeselectionner` et `racine` pour l'autre.

  `useColumnPrefs` et `usePersistedState` (sous la portée `PorteeStockageLocal`) gardent dans le navigateur, par personne, les colonnes d'une liste et un réglage simple. Les clés et le format sont ceux d'ETIC Members : ses réglages sont repris tels quels. `prefs.optionsTableau` s'étale dans `useDataTable` comme dans `DataTableViewOptions` ; avec `colonnesReglables`, le panneau « Colonnes » ne propose plus que les colonnes des préférences (ni les colonnes fixes en tête, ni les autres).

  Correctifs :

  - L'en-tête d'un tableau ne se surligne plus au survol.
  - La recherche de `DataTableToolbar` écarte les gestionnaires de mots de passe (`NO_AUTOFILL`) et accepte des attributs (`recherche.attributs`).
  - Une case verrouillée (ligne non sélectionnable, dernière colonne du sélecteur) reste lisible au lieu d'être estompée.
  - La zone tactile de la colonne de sélection ne déborde plus sur la colonne suivante.
  - `DeleteButton` accepte `size`, et sa corbeille est le `TooltipButton destructif`.

- c1a3e07: Thème : les neutres passent à la couleur de base `gray` de shadcn (palette `gray` de Tailwind 4, légèrement bleutée), commune à toute la suite. Fonds, panneaux, bordures et textes changent légèrement de teinte, en clair comme en sombre ; une application qui surchargeait ces jetons pour obtenir des gris bleutés (`--background`, `--card`, `--muted`, `--border`…, et les jetons qui les suivaient : `--card-foreground`, `--secondary`, `--accent`, `--sidebar-*`…) peut retirer ces surcharges. Nouveau jeton `--page` (classe `bg-page`), le fond de la page elle-même : gray-50 en clair, `--background` en sombre. Le `body`, le contenu d'`AppShell` et sa barre mobile le prennent, si bien que cartes, menus et tableaux blancs s'en détachent ; `--background` reste le blanc du registre, la surface de shadcn (onglet actif, bouton `outline`…). Une application qui peint un conteneur pleine page en `bg-background` passe à `bg-page`. Le cadre de `DataTable` prend `bg-card` : un tableau posé sur la page est blanc comme une carte. `--success` est un cran plus foncé en clair, pour rester ≥ 4,5:1 sur sa teinte posée sur la page. Le contrat d'accent ne change pas. `--muted-foreground` reste un peu plus foncé que le registre en clair (≥ 4,5:1 sur `--muted`), et le bord d'une case à cocher vide (`--control-border`) atteint 3:1 en sombre aussi. Les couleurs de graphique (`--chart-*`) sont celles du registre `gray`.

  `RadioGroupItem` (contour non coché) et `Switch` (rail éteint) prennent `--control-border` comme la case à cocher : ≥ 3:1 sur la page et sur une carte, en clair comme en sombre (le registre restait à 1,6:1 et 1,3:1 en sombre).

  En clair, la barre latérale est blanche (`--sidebar` = `--background`, au lieu du gray-50 du registre, identique à la page) ; inchangée en sombre.

  `color-scheme` suit le thème (`light` dans `:root`, `dark` dans `.dark`) : barres de défilement et contrôles natifs dans le thème de la page, même forcé à l'inverse du système. Les applications retirent leurs propres déclarations.

  Application du thème : `appliquerTheme(theme)` pose la classe `dark` sur `<html>` et, en `"system"`, suit `prefers-color-scheme` et ses changements ; `useThemeApplique(theme, onThemeAutreOnglet)` peint le thème du compte dès qu'il est connu (`null` ou valeur inconnue : `"system"`), le mémorise dans ce navigateur (`localStorage`) et suit les changements faits dans un autre onglet, transmis au rappel (obligatoire) pour aligner l'état de l'application. Le type `ThemePreference` reste exporté. Le script de démarrage `@etic-insa/ui/theme-boot.js` peint le thème mémorisé avant le premier rendu : l'application le copie dans `public/` et le charge dans `<head>` (voir le README).

  `CenteredScreen` est posé sur `bg-muted/40` au lieu de `bg-muted` : un fond moins appuyé, surtout en sombre.

- 6d90376: Utilitaires et hooks communs à la suite, exportés par `@etic-insa/ui` :

  - accords et nombres : `compte(1234, "ligne")` → « 1 234 lignes » (0 et 1 au singulier), `accorde` (le mot seul, pluriel irrégulier en option), et les helpers que la famille `DataTable` employait déjà en interne, `nombreFr`, `uniteAccordee`, `participe` (type `Unite`) ;
  - octets et durées : `formaterOctets` (« 1,5 Ko »), `formaterDuree` (« 3 j 4 h »), `formaterDureeArrondie` (« 3 j »), `formaterAnciennete` (« il y a 3 j 4 h », « à l'instant ») ;
  - dates en français : `formaterDate` (« 05 juillet 2026 » ; une date sans heure garde son jour à l'ouest de Greenwich), `formaterDateHeure`, `formaterHorodatage`, `formaterDateHeureLongue`. Une valeur absente rend « — » ou le repli donné, une valeur illisible est rendue telle quelle ;
  - `lireDateIso` et `ecrireDateIso` : une date sans heure de l'API (`AAAA-MM-JJ`) vers la `Date` du `DatePicker` et retour, en heure locale, sans décalage d'un jour ;
  - `normaliser` (sans accents ni casse) et `correspondance(recherche)(...textes)` pour filtrer une liste locale ;
  - `NO_AUTOFILL`, les attributs qui écartent les gestionnaires de mots de passe d'un champ ;
  - `useDebouncedValue(valeur, delai = 300)` et `useDocumentTitle(titre)`.

  `useDraftAutosave` ne sérialise plus le `contenu` à chaque rendu, seulement quand il change d'identité : un gros brouillon ne coûte plus rien aux rendus qui ne le touchent pas. Le `contenu` doit donc être une référence stable (état React, `useMemo`) et ne jamais être modifié sur place.

### Patch Changes

- 32aadf2: `DataTableBulkActions` : sur mobile, le compte et « Tout désélectionner » occupent la première ligne de la barre, les actions la suivante. La croix ne se retrouve plus seule sur une dernière ligne.
- 73debda: `DataTableBulkActions` : « Tout désélectionner » n'affiche plus la touche « Échap ». Le raccourci reste actif depuis le tableau ou la barre, et annoncé aux lecteurs d'écran (`aria-keyshortcuts`).

## 0.2.0

### Minor Changes

- 9cc335d: Changement cassant (API de 0.1.0) : `ThemeMenu.changer` devient `onValeurChange` (de même dans `theme` d'`AppShell` : `{ valeur, onValeurChange }`), `AppShellCompte.seDeconnecter` devient `onSeDeconnecter`, et l'action d'une entrée du menu du compte, `onSelect`, devient `onChoisir`. Les dépendances pairs exigent React 19.2 ou plus récent (`react`, `react-dom` : `^19.2.0`) et `lucide-react` (`^1.64.0`), fourni par l'application au lieu d'être embarqué.
- 9cc335d: Formulaires : nommage unifié et corrections d'accessibilité. Renommages : `changer` devient `onValeurChange` (`DatePicker`, `PhoneInput`, `SegmentedControl`, `SearchSelect`) ou `onValeursChange` (`CheckboxList`) ; `desactive` devient `disabled` ; `choisir` et `refuser` deviennent `onChoisir` et `onRefuser` ; `libelle`, `cle`, `option` et `texteVide` de `SearchSelect` deviennent `libelleElement`, `idElement`, `rendreOption` et `vide` ; les types `FichiersOptions` et `Accept` deviennent `FileUploadOptions` et `FileUploadAccept`. Le calendrier se parcourt aux flèches. `DatePicker` accepte les chiffres seuls, dit pourquoi une saisie est refusée et le signale (`{ invalide }`). `SearchSelect` n'affiche plus de résultats périmés pendant une recherche, propose « Réessayer » et relaie les attributs du champ. Avec `name`, `DatePicker` et `PhoneInput` soumettent leur valeur. `FormField` vise le champ d'un `InputGroup`, et ses erreurs ne sont plus des alertes. `CheckboxList` et `SegmentedControl` se disent « obligatoire » sans `aria-required`. `FileUploadButton` garde le focus pendant l'envoi et relaie les props de `Button`. `useDraftAutosave` renvoie un objet stable et ne réécrit plus un brouillon chargé.
- 9cc335d: Ajoute `PageContainer` (marges, largeur maximale et espacement d'une page dans `AppShell`), la primitive shadcn `Slider`, les variantes `warning`, `info` et `success` d'`Alert` (couleur `--info` du thème) et un lien « Aller au contenu » et un bouton de repli visible dans `AppShell`. `ConfirmDialog`, `FormDialog` et `DeleteButton` restent ouverts sans erreur quand leur action renvoie `false` (suppression en deux temps), gardent le focus pendant l'action et acceptent `finalFocus` ; `FormDialog` vérifie les champs sans la bulle du navigateur et accepte `verrouEnvoi`. `CopyButton` signale un échec de copie et accepte `verrou`. Sous `prefers-reduced-motion: reduce`, animations et transitions sont neutralisées. Ctrl+B ne replie plus la barre latérale depuis un champ de saisie.
- 9cc335d: `DataTable` : lignes dépliables, sur le modèle de TanStack et de shadcn — colonne `dataTableExpandColumn` (chevron avec `aria-expanded` et `aria-controls`), détail rendu sous la ligne par `rendreDetail`, et dans `useDataTable` `ligneDepliable`, `uneSeuleLigneDepliee`, `lignesDepliees`/`onLignesDeplieesChange`. Le tableau annonce le tri choisi et le chargement, garde le focus quand un contrôle disparaît (pagination en bout de liste, « Réinitialiser », bandeau et barre de sélection), et ne redessine que la ligne dont la sélection change.
- 9cc335d: Ajoute les compositions de formulaire : `FormField` (un champ `obligatoire` rend son contrôle requis ; contexte lu par le hook `useFormField()`), `FormSection`, `RequiredMark`, `DatePicker` (saisie au clavier et calendrier), `PhoneInput` (pays cherché dans un Combobox, valeur E.164), `SearchSelect` (recherche asynchrone), `FileUploadButton` et `FileDropZone` (react-dropzone), `SegmentedControl`, `CheckboxList` et le hook `useDraftAutosave`.
- 9cc335d: Ajoute les primitives shadcn `Alert`, `Badge` (avec les variantes `success` et `warning`), `Breadcrumb`, `ButtonGroup`, `Calendar` (en français, semaine commençant le lundi, jours de 36 px sous le seuil mobile), `Card`, `Checkbox` (la case partielle affiche un trait sur fond plein), `Collapsible`, `Combobox`, `Dialog`, `Empty`, `Field`, `InputGroup`, `Item`, `Kbd`, `Label`, `NativeSelect`, `Pagination`, `Popover`, `Progress`, `RadioGroup`, `ScrollArea`, `Select`, `Spinner`, `Switch`, `Table`, `Tabs`, `Textarea`, `Toggle` et `ToggleGroup`, et leurs dépendances : TanStack Table, dnd-kit, date-fns, react-day-picker, libphonenumber-js.
- 9cc335d: Compositions « retours et mise en page » : `ConfirmDialog` (avec saisie de confirmation), `FormDialog`, `PageHeader`, `DetailHeader`, `SectionCard`, `DetailList`, `DetailItem`, `ErrorBanner`, `ErrorBoundary`, `EmptyState`, `Loading`, `SkeletonTable`, `SkeletonCard`, `SkeletonPage`, `QueryBoundary`, `StatTile`, `StatusBadge`, `CopyButton`, `DeleteButton`, `IconToggle`, `TooltipButton`, `AuthImage`, `AuthAvatar` et `useAuthObjectUrl`. `ton` des badges et statistiques : `neutral`, `success`, `warning`, `destructive`. `QueryBoundary` accepte le résultat de `useQuery` de TanStack Query sans que la bibliothèque en dépende.
- 9cc335d: Ajoute la famille « tableau de données » sur TanStack Table v9, d'après le guide Data Table de shadcn : `useDataTable` (tri client ou serveur, colonnes, sélection, et sélection de tous les éléments au-delà de la page, à la Gmail, avec `total` et `toutSelectionne`), `DataTable` (état vide, chargement, défilement horizontal sur mobile, proposition « Sélectionner les N éléments » au-dessus des lignes), `DataTableColumnHeader` (tri en un clic), `dataTableSelectionColumn` (Maj+clic pour une plage, raison d'une case verrouillée), `DataTableRowActions`, `DataTableViewOptions` (colonnes affichées et réordonnées par glisser-déposer, au clavier compris), `DataTableToolbar` avec `DataTableSelectFilter` et `DataTableCount`, `DataTablePagination` (par décalage) et `DataTableBulkActions`.

### Patch Changes

- 9cc335d: Thème : `--muted-foreground` plus foncé en clair et `--destructive` ajusté (plus foncé en clair, plus clair en sombre) pour atteindre 4,5:1 sur `--muted` et sur la teinte destructive (bouton, badge). Coquille : sur mobile, une ancre ne s'arrête plus sous la barre du haut.
- 9cc335d: Finitions avant 0.2.0. `QueryBoundary` ne rend plus d'enveloppe : le bandeau et le contenu vont directement dans le parent (grille, flex), qui règle l'espacement. `FormDialog` marque les champs fautifs (`aria-invalid`) et nomme une liste à entrée cachée (`Select`, `SearchSelect`) par le libellé de son `FormField`. `SearchSelect` relaie `form` à l'entrée cachée qui porte la valeur, relance une recherche échouée par Entrée (même identique) et garde le texte tapé quand la liste se ferme. `DatePicker` garde une saisie refusée même si l'application ignore le `undefined` émis. `FileUploadButton` n'ajoute plus d'élément au flux sans refus, affiche ses refus en rouge et masque ses `input type=file` de l'arbre d'accessibilité (`FileDropZone` aussi). `DataTable` garde une entrée `false` de la sélection ou du dépliage contrôlés quand des lignes disparaissent ; le sélecteur de colonnes compte une colonne de rendu masquable comme colonne de données. `useDraftAutosave` lit le dernier contenu depuis un effet de mise en page. `ErrorBoundary` met le focus sur son message quand elle est montée en erreur et après un « Réessayer » qui échoue. `ConfirmDialog` annonce une description changée pendant l'ouverture. `Slider` : anneau de focus clavier, `aria-label` relayé aux curseurs, plage annoncée « minimum » et « maximum ». `Select` et `NativeSelect` passent à 16 px sous `md` (pas de zoom d'iOS). Le bouton d'ouverture de `ComboboxInput` est nommé « Afficher les options ». `Alert` `info` et `success` portent `role="status"`. Les liens d'`AppShell` donnent leur libellé entier au survol (`title`).

## 0.1.0

### Minor Changes

- 91c42a4: Coquille d'application `AppShell` (barre latérale, tiroir sous 1 025 px, menu du compte avec
  déconnexion confirmée, thème) et `ThemeMenu`. Composants shadcn ajoutés : `Sidebar`, `Sheet`,
  `DropdownMenu`, `AlertDialog`, `Avatar`, `Tooltip`, `Separator`, `Skeleton`, `Input`, et le
  hook `useIsMobile` au seuil de la suite.
- 51edf1e: Première version : thème commun (contrat d'accent, couleurs `success` et `warning`, clair et
  sombre), police Geist et composant `Button`.
