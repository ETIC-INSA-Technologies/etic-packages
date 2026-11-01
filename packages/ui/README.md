# @etic-insa/ui

Bibliothèque de composants React des applications ETIC (ETIC Members, ETIC Docs…), construite
sur [shadcn/ui](https://ui.shadcn.com) (style Nova, couleur de base Neutral) et
[Base UI](https://base-ui.com), avec Tailwind CSS 4, les icônes lucide et la police Geist.

## Utiliser la bibliothèque dans une application

```sh
npm i @etic-insa/ui
```

Prérequis (dépendances pairs) : React 19.2 ou plus récent (`useEffectEvent`), Tailwind CSS 4
(`tailwindcss` et `@tailwindcss/vite`) et `lucide-react` (les icônes passées aux composants,
`icone={UsersIcon}`, viennent de l'application).
`QueryBoundary` accepte tel quel le résultat de `useQuery` (TanStack Query), sans que la
bibliothèque dépende de TanStack Query : il ne lit que la forme de la requête.

```css
/* CSS principal de l'application */
@import "tailwindcss";
@import "@etic-insa/ui/styles.css";
/* Tailwind doit lire les classes des composants ; chemin relatif à ce fichier */
@source "../node_modules/@etic-insa/ui/dist";

/* Couleur d'accent de l'application : les quatre variables, en clair ET en sombre. */
:root {
  --primary: #2f5fdb;
  --primary-foreground: #ffffff;
  --primary-text: #2f5fdb;
  --ring: #2f5fdb;
}
.dark {
  --primary: #6d92f2;
  --primary-foreground: #0e1116;
  --primary-text: #6d92f2;
  --ring: #6d92f2;
}
```

### Thème et couleur d'accent

La bibliothèque fournit tout le thème (neutres, rayons, police, couleurs `destructive`, `success`
et `warning`, clair et sombre) sauf la couleur d'accent. Chaque application remplit, après
l'import de `styles.css`, en `:root` et en `.dark`, quatre variables :

| Variable               | Rôle                                 | Exigence                         |
| ---------------------- | ------------------------------------ | -------------------------------- |
| `--primary`            | aplats : bouton principal, sélection | —                                |
| `--primary-foreground` | texte posé sur `--primary`           | ≥ 4,5:1 sur `--primary`          |
| `--primary-text`       | l'accent employé comme texte ou lien | ≥ 4,5:1 sur le fond et `--muted` |
| `--ring`               | anneau de focus                      | ≥ 3:1 sur le fond et `--muted`   |

Un accent clair (orange, jaune, vert pâle) ne supporte ni texte blanc ni rôle de texte : il prend
un `--primary-foreground` foncé et un `--primary-text` plus sombre que lui.

Les couleurs appartiennent à chaque application : la bibliothèque n'en livre aucune et ne
connaît pas les applications. [`atelier/accents.css`](atelier/accents.css) contient seulement
des exemples, aux couleurs des applications ETIC, pour voir les composants avec un vrai accent
dans l'atelier ; `npm test` vérifie que ces exemples tiennent les exigences ci-dessus. Il n'est
pas publié et n'est pas la référence d'une application.

Dans les classes, l'accent comme texte s'écrit `text-primary-text`, jamais `text-primary`. Les
composants shadcn d'origine emploient `text-primary` (variante `link` du bouton et du badge,
liens survolés) : c'est corrigé dans `src/components/ui/`, et `npm test` échoue si
`text-primary` y réapparaît.

Le thème sombre s'active par la classe `dark` sur `<html>`.

```tsx
import { Button } from "@etic-insa/ui"

export function Export() {
  return (
    <Button variant="outline" className="w-full">
      Exporter
    </Button>
  )
}
```

### Coquille d'application

`AppShell` pose la mise en page commune : barre latérale de shadcn (marque, rubriques, menu du
compte, thème), repliable en colonne d'icônes sur ordinateur (rail ou Ctrl+B, état gardé dans le
cookie `sidebar_state` de shadcn), qui devient un tiroir ouvert par une barre du haut sous
1 025 px (téléphones et tablettes). Il ne connaît ni le routeur ni l'authentification : l'application donne les liens et
leur état actif, le compte et le thème, et son composant de lien.

```tsx
import { AppShell } from "@etic-insa/ui"
import { Link, Outlet, useLocation } from "react-router-dom"
import { UsersIcon } from "lucide-react"

const LienRouteur = ({ href, ...props }: React.ComponentProps<"a">) => (
  <Link to={href!} {...props} />
)

export function MiseEnPage() {
  const { pathname } = useLocation()
  return (
    <AppShell
      application={{ nom: "ETIC Docs", logo: <img src={logo} alt="" /> }}
      sections={[
        {
          titre: "Études",
          liens: [
            {
              libelle: "Études",
              href: "/etudes",
              icone: UsersIcon,
              actif: pathname.startsWith("/etudes"),
            },
          ],
        },
      ]}
      compte={{ nom: "Ada Lovelace", initiales: "AL", onSeDeconnecter }}
      theme={{ valeur: theme, onValeurChange: changerTheme }}
      lien={LienRouteur}
    >
      <Outlet />
    </AppShell>
  )
}

// Dans chaque page
export function Groupes() {
  return (
    <PageContainer>
      <PageHeader titre="Groupes" />
      <SectionCard titre="Liste">…</SectionCard>
    </PageContainer>
  )
}
```

`onValeurChange` peut renvoyer une promesse : rejetée, elle affiche « Thème non enregistré »
quelques secondes. La déconnexion (`onSeDeconnecter`) est toujours confirmée ; une entrée du
menu du compte est un lien (`href`) ou une action (`onChoisir`). La coquille fournit l'élément
`<main>` : les pages n'en ajoutent pas. Elle ouvre la tabulation par un lien « Aller au
contenu », visible au focus, qui met le focus sur ce `<main>`. Sur ordinateur, un bouton de
l'en-tête replie la colonne (Ctrl+B aussi, sauf dans un champ de saisie, où il reste au
gras d'un éditeur). Sur mobile, la page réserve en haut la hauteur de la barre collante
(`scroll-padding-top`) : une ancre ne s'arrête pas dessous. `ThemeMenu` existe aussi seul
(page de connexion…) ; son `className` va sur le bouton.

`bandeau` (un `ErrorBanner` qui concerne toute l'application…) s'affiche au-dessus du
contenu avec les marges latérales de `PageContainer` : l'application le passe nu. Un bandeau
qui ne rend rien (`ErrorBanner` sans erreur) ne laisse pas d'espace vide.

`PageContainer` est le conteneur de chaque page dans `AppShell` : marges (16 px sur
téléphone, 24 puis 32 px au-delà), espacement vertical régulier entre les blocs (`gap-6`),
et `largeur` maximale centrée (`md`, `lg`, `xl`, ou `full` par défaut). Les pages ne posent
pas leurs propres marges.

### Retours et mise en page

Compositions des primitives shadcn pour les états d'une page et les actions courantes. Elles ne
connaissent ni l'API ni le routeur : l'application fournit ses fonctions (envoi, suppression,
chargement d'une image) et, au besoin, son composant de lien (`lien`, comme pour `AppShell`).

| Composant                                                                | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ConfirmDialog`                                                          | Confirmation (`AlertDialog`) : `titre` qui nomme l'action, `description` qui nomme ce qu'elle touche, `saisie` pour exiger de taper une valeur non affichée (action critique). L'erreur de l'action s'affiche dans le dialogue, qui reste ouvert.                                                                                                                                                                       |
| `FormDialog`                                                             | Formulaire dans un `Dialog` : pied « Annuler / Enregistrer », curseur dans le premier champ à remplir, état d'envoi (champs figés), erreur en tête, `taille` `sm` à `xl`, `verrouEnvoi` pour dire pourquoi l'envoi est impossible. Les contraintes des champs (`required`, `type`, `pattern`…) sont vérifiées sans la bulle du navigateur : la liste des champs à corriger s'affiche en français.                       |
| `PageContainer`                                                          | Conteneur de page dans `AppShell` : marges, `largeur` maximale, espacement entre les blocs.                                                                                                                                                                                                                                                                                                                             |
| `PageHeader`, `DetailHeader`                                             | En-tête de page (`<h1>`, description, actions) ; en-tête de fiche avec fil d'Ariane (`chemin`), badges, méta, actions et menu « Plus d'actions » (`actionsSecondaires` : `onChoisir`, `destructif`, `verrou` affiché sous le libellé ; `tailleActions="lg"` pour des actions en `size="lg"`), `compact` quand la fiche répète déjà son nom.                                                                             |
| `SectionCard`, `DetailList`, `DetailItem`                                | Carte de section titrée (`<h2>`) ; grille `<dl>` de paires libellé / valeur, « — » pour une valeur absente (`null`, `undefined`, `false`, chaîne vide) ; `discret` pour des métadonnées secondaires : « libellé : valeur » en petit, en ligne.                                                                                                                                                                          |
| `ErrorBanner`                                                            | `Alert` destructive : message, code, détail technique replié (même circulaire), « Réessayer » (`onReessayer`, occupé pendant `enCours`). Lit toute erreur ayant un `message` (et `code`, `details`).                                                                                                                                                                                                                    |
| `ErrorBoundary`                                                          | Filet sous le rendu : message, détail technique, « Réessayer », « Retour à l'accueil » ; `cleReinitialisation` (la route) l'efface. Le focus perdu avec la partie cassée passe sur le message.                                                                                                                                                                                                                          |
| `EmptyState`, `Loading`, `SkeletonTable`, `SkeletonCard`, `SkeletonPage` | État vide (`Empty` dans un cadre pointillé, `icone` lucide : `icone={InboxIcon}`) ; attente annoncée (`Spinner`) ; squelettes de tableau, de carte et de fiche, un seul statut « Chargement… » chacun.                                                                                                                                                                                                                  |
| `QueryBoundary`                                                          | Chargement, erreur (avec « Réessayer »), vide et données d'une requête ; accepte tel quel le résultat de `useQuery`. L'échec d'une actualisation garde les données, montées, sous le bandeau d'erreur ; pendant une nouvelle tentative, le bandeau reste, son bouton occupé. Sans enveloppe : rendu dans le parent, qui règle l'espacement.                                                                             |
| `QueryBoundary introuvable`, `erreurIntrouvable`                         | Fiche : `introuvable` (texte ou nœud, avec un lien de retour) remplace le bandeau quand l'erreur dit 404 (`status`, lu par `erreurIntrouvable` ; `estIntrouvable` pour une autre règle), sans « Réessayer ». Les autres échecs gardent le bandeau : une panne n'est jamais annoncée « introuvable ».                                                                                                                    |
| `QueryErrorBanner`                                                       | Le bandeau d'erreur de `QueryBoundary`, seul (`requete` : `isError`, `error`, `isFetching`, `refetch`), pour une page qui place elle-même ses données ; rien tant que la requête n'a pas échoué. Accepte `titre`, `description`, `className` d'`ErrorBanner`.                                                                                                                                                           |
| `Disclosure`, `DisclosureTrigger`                                        | Section repliable à chevron tournant, fermée par défaut : `titre`, `compteur` en pastille, `variante` `lien` (en ligne), `discret` (fantôme estompé) ou `carte` (bloc encadré), `defautOuvert` ou `ouvert` / `onOuvertChange`. `DisclosureTrigger` seul pour un `Collapsible` composé à la main.                                                                                                                        |
| `CenteredScreen`                                                         | Écran hors de la coquille (connexion, page introuvable, vérification de session) : le `<main>` de la page, contenu centré sur toute la hauteur, fond estompé.                                                                                                                                                                                                                                                           |
| `StatTile`, `StatusBadge`                                                | Chiffre clé d'un résumé ; badge d'état à pastille. `ton` (type `StatusTon`) : `neutral`, `success`, `warning`, `destructive`.                                                                                                                                                                                                                                                                                           |
| `CopyButton`, `DeleteButton`, `IconToggle`                               | Copie avec retour « Copié ! », ou « Copie impossible » si le navigateur refuse (`onCopie`, `onEchec`) ; corbeille qui ouvre une confirmation ; bouton à icône qui pose ou retire un marqueur (`Toggle`, `aria-pressed`, `onActifChange`, `enCours` occupé sans perdre le focus ; actif, en couleur de son `ton`, `warning` par défaut). Tous ont une infobulle, et `verrou` pour dire pourquoi l'action est impossible. |
| `TooltipButton`                                                          | `Button` avec infobulle et état `verrou` (désactivé mais focalisable, la raison en infobulle) : la règle pour tout bouton à icône seule, que l'infobulle nomme (`aria-label`, sauf nom donné). `destructif` : gris, rouge au survol seulement (corbeille, retrait dans une liste).                                                                                                                                      |
| `ButtonLink`                                                             | Lien à l'allure de bouton (`variant`, `size` de `Button`), annoncé comme un lien ; `lien` : le composant de lien du routeur de l'application, comme pour `AppShell` (`<a>` par défaut).                                                                                                                                                                                                                                 |
| `AuthAvatar`, `AuthImage`, `useAuthObjectUrl`                            | Image servie par une adresse authentifiée : l'application passe `charger(src, signal)` (type `AuthImageCharger`) qui renvoie le `Blob` ; l'avatar garde les initiales tant que la photo manque.                                                                                                                                                                                                                         |
| `useAuthObjectUrlEtat`, `secoursEchec`, `diametre`                       | État complet d'une image authentifiée (`url`, `enCours`, `echec`, `erreur`) pour dire « indisponible » plutôt que charger sans fin ; `secoursEchec` d'`AuthImage` en cas d'échec ; `diametre` (px) d'`AuthAvatar` et d'`Avatar`, initiales proportionnées (leur graisse suit la racine).                                                                                                                                |

`ConfirmDialog` et `FormDialog` s'ouvrent par un `declencheur`, ou sont contrôlés (`ouvert`,
`onOuvertChange`). `DeleteButton` est son propre déclencheur ; `ouvert` et `onOuvertChange`
permettent de suivre sa confirmation. Leur action (`onConfirmer`, `onEnvoyer`, `onSupprimer`)
peut renvoyer une promesse : le dialogue l'attend (boutons occupés mais focalisables, Échap sans
effet), se ferme si elle aboutit, affiche l'erreur si elle échoue. Avec TanStack Query, passer
`mutateAsync`. Si l'action renvoie `false` (ou une promesse résolue à `false`), le dialogue
reste ouvert sans erreur : suppression en deux temps, où la page change sa question (la
description de `ConfirmDialog` est une région polie : la nouvelle est lue).

Hors de ces dialogues, un bouton qui lance une action longue passe `enCours` au `Button` (ou au
`TooltipButton`) : la roue remplace ses icônes, `libelleEnCours` (« Suppression… ») son texte,
et il reste focalisable (`aria-busy`, clics ignorés, curseur d'attente, pas de survol). Un
dialogue composé à la main s'ouvre normalement mais refuse de se fermer pendant l'action avec
`onOpenChange={fermerSaufEnCours(enCours, setOuvert)}`. Un lien dans
une phrase ou une cellule : `<Button variant="link" size="inline">`. `SpinnerDecoratif` est
la roue muette, à côté d'un texte qui dit déjà l'attente. Un `CopyButton` placé dans un
`InputGroupAddon` passe à 24 px, comme le bouton de shadcn dans un groupe (sauf `size` donnée).

Un envoi de `FormDialog` refusé par les contraintes marque chaque champ fautif
(`aria-invalid`, retiré dès qu'il est corrigé) et le nomme par son libellé, y compris une
liste (`Select`, `SearchSelect`…) dont l'entrée cachée porte la valeur : le libellé de son
`FormField`, et le focus va à son contrôle visible.

Une action qui fait disparaître le déclencheur (ligne supprimée) passe `finalFocus` (un ref
ou une fonction, comme le `finalFocus` de Base UI) : le focus va à la ligne suivante ou au
titre de la liste au lieu de tomber sur la page.

```tsx
<DeleteButton
  libelle="ce groupe"
  confirmation={{ description: `Le groupe « ${groupe.nom} » sera supprimé définitivement.` }}
  verrou={groupe.critique ? "Groupe critique : suppression impossible" : undefined}
  finalFocus={titreListe}
  onSupprimer={() => supprimer.mutateAsync(groupe.id)}
/>

// Suppression en deux temps : le serveur répond 409 « confirmation requise ».
const [conflit, setConflit] = useState(false)
<ConfirmDialog
  titre="Supprimer le groupe"
  description={conflit ? "14 rattachements seront supprimés aussi." : "Le groupe sera supprimé."}
  libelleConfirmer={conflit ? "Supprimer quand même" : "Supprimer"}
  onOuvertChange={(ouvert) => !ouvert && setConflit(false)}
  onConfirmer={async () => {
    try {
      await supprimer.mutateAsync({ id, confirmer: conflit })
    } catch (erreur) {
      if (conflit || !confirmationRequise(erreur)) throw erreur
      setConflit(true)
      return false
    }
  }}
  declencheur={<Button variant="destructive">Supprimer</Button>}
/>

<QueryBoundary requete={useQuery(...)} vide="Aucun groupe.">
  {(groupes) => <TableGroupes groupes={groupes} />}
</QueryBoundary>
```

Primitives shadcn ajoutées pour ces usages : `Alert` a, en plus de `destructive`, les variantes
`warning`, `info` et `success` (couleur `--info` dans le thème, contrastes vérifiés) ; `info` et
`success`, messages d'état, portent `role="status"` (annoncés sans interrompre), les autres
`role="alert"` comme dans shadcn. `Slider` (Base UI) se nomme par `aria-labelledby` ou
`aria-label` (relayé à chaque curseur) et prend une valeur simple (`value={1.5}`, un curseur)
ou un tableau (une plage, dont les curseurs s'annoncent « minimum » et « maximum »).

Utilitaires : `cn(...classes)` fusionne des classes Tailwind (la dernière l'emporte en cas de
conflit, comme `clsx` + `tailwind-merge`) ; `useIsMobile()` vaut vrai sous le seuil mobile de
la suite, `MOBILE_MEDIA_QUERY` (`(width < 1025px)`), dès le premier rendu.

Mouvement réduit : sous `prefers-reduced-motion: reduce`, `styles.css` neutralise animations
et transitions (squelettes, ouverture des dialogues et des menus, tiroir, repli de la barre) ;
seule la roue de chargement tourne encore.

### Formulaires

Compositions des primitives `Field`, `Combobox`, `Popover` + `Calendar`, `ToggleGroup` et
`Checkbox` de shadcn. Les champs sont contrôlés : `valeur` et `onValeurChange`
(`valeurs` et `onValeursChange` pour `CheckboxList`) ; les fichiers n'ont pas de valeur, ils
arrivent à `onChoisir`. Désactiver : `disabled`, comme en HTML. Règle : toujours le
composant shadcn le plus adapté à l'usage plutôt qu'un contrôle natif ou minimal (une longue
liste prend un `Combobox` avec recherche).

Dans les composites (`DatePicker`, `PhoneInput`, `SearchSelect`), `className` va à
l'enveloppe (`InputGroup` ou `ButtonGroup`) et les autres attributs (`ref`, `onBlur`,
`autoComplete`, `data-*`…) au champ de saisie. Avec `name`, `DatePicker` et `PhoneInput`
soumettent leur valeur (date ISO `2026-03-05`, numéro E.164) par un champ caché, et non le
texte affiché ; `SearchSelect` soumet `idElement(valeur)`.

- `FormField` : libellé (astérisque si `obligatoire`), contrôle, `description` et `erreur`
  (texte ou liste), reliés au contrôle par `htmlFor`, `aria-describedby` et `aria-invalid`.
  L'erreur n'est pas une alerte (`role="alert"` de shadcn retiré) : cinq champs fautifs
  feraient cinq annonces. Un astérisque implique un champ requis. Règle, sur le modèle du
  `useFormField()` du Form de shadcn :
  - l'enfant direct reçoit toujours `id`, `aria-describedby` et `aria-invalid` ; autour d'un
    `InputGroup`, c'est son champ (`InputGroupInput`, `InputGroupTextarea`) qui les reçoit ;
  - s'il est un champ natif ou une primitive shadcn de saisie (`Input`, `Textarea`,
    `NativeSelect`, champ d'`InputGroup`), il reçoit `required` ; sinon `aria-required`
    (déclencheur de `Select`, `ComboboxInput`…) ;
  - un contrôle composite lit le contexte du champ, `useFormField()`, et pose lui-même ces
    attributs et un vrai `required` sur son élément de saisie : c'est ce que font
    `DatePicker`, `PhoneInput` et `SearchSelect`, et ce que doit faire un composant de
    l'application ;
  - un groupe (`CheckboxList`, `SegmentedControl`) n'a ni `required` natif ni droit à
    `aria-required` (`role="group"`) : il cite le libellé du champ par
    `aria-labelledby={champ.libelleId}` (un `<label for>` ne nomme pas un groupe) et, s'il
    est obligatoire, une mention masquée, ce qui donne le nom « Groupes obligatoire ». Il
    prend aussi `required` hors d'un `FormField`. La vérification reste à l'application.

  `useFormField()` renvoie `{ id, libelleId, descriptionId, erreurId, describedBy,
obligatoire, invalide }`, ou `null` hors d'un `FormField`. `RequiredMark` existe seul.
  `FormSection` regroupe des champs sous un titre (`FieldSet` + `FieldLegend`).

- `DatePicker` : le Date Picker de shadcn avec saisie au clavier (jj/mm/aaaa, ou les chiffres
  seuls `05032026` pour le pavé numérique de l'iPhone ; lue en quittant le champ ou sur
  Entrée), calendrier en français navigable aux flèches, bornes `dateMin`/`dateMax`, listes du
  mois et de l'année (`listesMoisAnnee`, pour une date de naissance), bouton d'effacement.
  Valeur : `Date`. Une saisie illisible ou hors bornes dit pourquoi sous le champ, bloque
  l'envoi d'un formulaire natif, et `onValeurChange(undefined, { invalide: true })` prévient
  l'application (à bloquer avant l'envoi).
- `PhoneInput` : sélecteur de pays (Combobox : drapeau et indicatif, recherche sur le nom du
  pays ou l'indicatif) et numéro, lus et validés par
  libphonenumber-js. `onValeurChange(valeur, { valide, pays })` reçoit l'E.164
  (`+33612345678`) dès que la longueur est possible ; un numéro tapé avec « + » choisit le
  pays.
- `SearchSelect` : choix dans une longue liste cherchée par l'application.
  `rechercher(texte, signal)` renvoie une promesse (texte vide : premières suggestions) ;
  `libelleElement`, `idElement` et `rendreOption` décrivent un élément. Anti-rebond,
  chargement (la liste reste vide tant que la réponse ne correspond pas à la saisie : un
  ancien résultat ne se choisit pas), échec avec « Réessayer » (l'erreur va à `onErreur`, ou
  à la console ; au clavier, Entrée dans le champ relance la recherche, même identique),
  liste vide (`vide`) et effacement sont gérés. Sans élément choisi, le texte tapé reste
  quand la liste se ferme (Entrée, Tab), et la recherche reprend à la réouverture. `form`
  va, comme `name`, à l'entrée cachée qui porte la valeur.
- `FileUploadButton` et `FileDropZone` : bouton, ou zone de glisser-déposer avec bouton, sur
  react-dropzone. Types (`accepter={{ "text/csv": [".csv"] }}`) et taille (`tailleMax`, en
  octets) vérifiés, refus en français : à `onRefuser` pour les deux, et affichés dans la zone
  (après le bouton s'il n'y a pas d'`onRefuser`, en rouge, sur une ligne entière dans une
  rangée `flex-wrap` ; sans refus, rien d'autre que le bouton n'occupe le flux, ce qui le
  laisse dans une barre d'outils ou un `ButtonGroup`). Pendant `enCours`, le bouton reste
  focalisé, indisponible, et l'envoi est annoncé. `FileUploadButton` relaie les props de
  `Button` (`id`, `aria-*` : il fonctionne dans un `FormField`).
- `SegmentedControl` : choix exclusif en boutons joints (`ToggleGroup`), sans désélection ;
  le segment choisi prend, en plus du fond `bg-muted`, un liseré intérieur. L'`infobulle`
  d'une option nomme un segment à icône seule, sans masquer un libellé texte.
- `CheckboxList` : plusieurs valeurs parmi une liste de cases (`CheckboxGroup` de Base UI) ;
  la `description` d'une option est reliée à sa case.
- `useDraftAutosave({ contenu, enregistrer })` : sauvegarde automatique d'un brouillon là où
  l'application le range (API ou stockage du navigateur) — anti-rebond, sans doublon, une
  écriture à la fois, version pour un verrou optimiste, `erreur` et `reessayer()`, alerte à la
  fermeture de l'onglet ; `enregistrerMaintenant()` avant de quitter. Démonté (navigation
  interne), il range aussitôt l'écriture en attente ; `annuler()` (avant de supprimer le
  brouillon) l'abandonne, elle et celles en file. Un brouillon chargé (`versionInitiale` > 0)
  n'est pas réécrit au montage ; `enregistrer` reçoit le contenu tel quel (sans passer par
  JSON) ; l'objet renvoyé est stable. `marquerEnregistre(contenu)` : appelé dans le même
  gestionnaire que la mise à jour du contenu, passer le nouveau.

```tsx
<FormField libelle="Téléphone" obligatoire erreur={erreurs.telephone}>
  <PhoneInput valeur={telephone} onValeurChange={setTelephone} />
</FormField>

<FormField libelle="Taille maximale">
  <InputGroup>
    <InputGroupInput inputMode="numeric" />
    <InputGroupAddon align="inline-end">
      <InputGroupText>Mo</InputGroupText>
    </InputGroupAddon>
  </InputGroup>
</FormField>
```

```tsx
// Contrôle de l'application dans un FormField
function ChampCode() {
  const champ = useFormField()
  return (
    <input
      id={champ?.id}
      required={champ?.obligatoire}
      aria-describedby={champ?.describedBy}
      aria-invalid={champ?.invalide || undefined}
    />
  )
}
```

### Tableau de données

La famille `DataTable` suit le [guide Data Table de shadcn](https://ui.shadcn.com/docs/components/data-table)
sur [TanStack Table v9](https://tanstack.com/table/latest) : les colonnes se déclarent avec
l'assistant typé, `useDataTable` crée l'instance, les composants la reçoivent en `table`.

| Composant                  | Rôle                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `useDataTable`             | instance TanStack : tri (client, ou serveur avec `triManuel`), colonnes, sélection, dépliage |
| `DataTable`                | la Table de shadcn ; état vide, lignes fantômes du chargement, clic de ligne, détail déplié  |
| `DataTableColumnHeader`    | en-tête triable : un clic trie par ordre croissant, le suivant inverse le sens               |
| `dataTableSelectionColumn` | colonne de cases ; Maj+clic sélectionne une plage ; raison d'une case verrouillée            |
| `dataTableExpandColumn`    | colonne du chevron qui déplie une ligne (`aria-expanded`, `aria-controls`)                   |
| `DataTableRowActions`      | menu « … » d'une ligne                                                                       |
| `DataTableViewOptions`     | bouton « Colonnes » : afficher, masquer, réordonner (glisser-déposer, clavier compris)       |
| `DataTableToolbar`         | recherche, filtres (`DataTableSelectFilter`), compteur (`DataTableCount`), commandes         |
| `DataTablePagination`      | pagination par décalage (offset/limit, total connu), nombre de lignes par page               |
| `DataTableBulkActions`     | barre d'actions groupées, collante en bas, avec la sélection ; Échap désélectionne           |

```tsx
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableRowActions,
  DataTableToolbar,
  DataTableViewOptions,
  createDataTableColumnHelper,
  dataTableSelectionColumn,
  useDataTable,
  type SortingState,
} from "@etic-insa/ui"

const aide = createDataTableColumnHelper<Etude>()
// Hors du composant (ou mémorisées) : des colonnes recréées à chaque rendu recalculent tout.
const colonnes = aide.columns([
  dataTableSelectionColumn<Etude>({
    libelleLigne: (e) => `Sélectionner ${e.titre}`,
  }),
  aide.accessor("titre", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} libelle="Titre" />
    ),
    meta: { libelle: "Titre" }, // nom dans le sélecteur de colonnes et l'annonce du tri
  }),
  aide.display({
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      // Un nom propre à la ligne : sinon, une liste de boutons « Actions » indiscernables.
      <DataTableRowActions libelle={`Actions pour ${row.original.titre}`}>
        {/* DropdownMenuItem… */}
      </DataTableRowActions>
    ),
  }),
])

export function Etudes() {
  const [tri, setTri] = useState<SortingState>([{ id: "titre", desc: false }])
  const [decalage, setDecalage] = useState(0)
  const [limite, setLimite] = useState(25)
  const { data, isFetching } = useQuery({
    queryKey: ["etudes", tri, decalage, limite], // le serveur trie et pagine
    queryFn: () => api.etudes({ tri, decalage, limite }),
    // Garde la page affichée pendant le chargement de la suivante : le compteur
    // et la pagination ne retombent pas à 0, la hauteur ne saute pas.
    placeholderData: keepPreviousData,
  })
  const table = useDataTable({
    donnees: data?.items ?? AUCUNE, // référence stable, pas un nouveau [] à chaque rendu
    colonnes,
    idLigne: (e) => e.id,
    tri,
    onTriChange: setTri,
    triManuel: true,
  })
  return (
    <>
      <DataTableToolbar
        compteur={{
          total: data?.total ?? 0,
          decalage,
          nombre: data?.items.length ?? 0,
        }}
      >
        <DataTableViewOptions table={table} />
      </DataTableToolbar>
      <DataTable
        table={table}
        libelle="Études"
        enChargement={isFetching}
        lignesChargement={limite}
      />
      <DataTablePagination
        total={data?.total ?? 0}
        decalage={decalage}
        limite={limite}
        onDecalageChange={setDecalage}
        onLimiteChange={setLimite}
      />
    </>
  )
}
```

Chaque partie de l'état (`tri`, `visibiliteColonnes`, `ordreColonnes`, `selection`,
`lignesDepliees`) est contrôlée si l'application la fournit avec son `on…Change` (pour la
garder, en `localStorage` par exemple), interne sinon ; `etatInitial` donne la valeur de départ
d'une partie interne. La sélection se limite par défaut aux lignes présentes dans `donnees`
(changer de page ou de filtre la réduit) ; `conserverSelection` la garde. Sur mobile, le tableau
garde ses colonnes et son cadre défile horizontalement. Une colonne se masque par « Colonnes »,
pas depuis son en-tête ; la dernière colonne de données affichée ne se masque pas.

`donnees` et `colonnes` doivent être des références stables. `idLigne` peut s'écrire en ligne :
il n'est relu que quand `donnees` change. Une ligne ne se redessine que si ses données, sa
sélection, son dépliage ou les colonnes changent (cocher une case ne redessine pas les 1 000
autres) : une cellule qui affiche un autre état le lit elle-même (hook, contexte).

Accessibilité : le tri choisi, le chargement et « tous sélectionnés » sont annoncés par le
tableau ; `DataTableCount` est une zone de statut (le nouveau compte après une recherche ou un
filtre est annoncé) ; `DataTablePagination` annonce la page atteinte. Quand un contrôle disparaît
sous le focus (« Réinitialiser », la croix de la recherche, le bandeau ou la barre de sélection),
le focus passe à un élément stable (champ de recherche, premier filtre, case d'en-tête). Le clic
de ligne (`onActiverLigne`) est un raccourci à la souris : une cellule doit aussi offrir un lien
ou un bouton pour le clavier. Un bouton passé dans `vide` (« Réinitialiser les filtres »)
disparaît avec l'état vide : l'application rend d'abord le focus au champ de recherche.

#### Sélectionner tous les éléments

La case d'en-tête (« Sélectionner la page ») coche les lignes de la page. Avec la pagination
côté serveur, le tableau ne connaît pas les identifiants des autres pages : pour tout
sélectionner, `useDataTable` reçoit `total` et un état `toutSelectionne` que l'application
interprète (en envoyant ses filtres au serveur au lieu d'une liste d'identifiants, par exemple).
Avec `ligneSelectionnable`, `total` ne compte que les éléments sélectionnables : c'est le nombre
annoncé et visé par l'action groupée (le tableau ne connaît pas les lignes des autres pages).

```tsx
const [toutSelectionne, setToutSelectionne] = useState(false)
const table = useDataTable({
  // …
  total: data?.total,
  toutSelectionne,
  onToutSelectionneChange: setToutSelectionne,
})
// Filtres ou tri changés : la sélection ne vaut plus.
const changerFiltre = (valeur) => {
  setFiltre(valeur)
  setToutSelectionne(false)
}
// Action groupée
const supprimer = () =>
  toutSelectionne
    ? api.supprimerSelon(filtres)
    : api.supprimer(table.getSelectedRowIds())
```

Quand toute la page est cochée et que `total` compte d'autres éléments, `DataTable` affiche
au-dessus des lignes « Les 25 éléments de la page sont sélectionnés. Sélectionner les 137
éléments », puis « Les 137 éléments sont sélectionnés. Tout désélectionner » (`unite` et
`feminin` accordent le texte, comme pour `DataTableCount` et `DataTableBulkActions`).
`DataTableBulkActions` compte alors le total. L'état repasse à `false` dès qu'une ligne de la
page n'est plus cochée (par le tableau ou par l'application), quand la page change (même avec
`conserverSelection`) et par « Tout désélectionner »
(`table.options.meta.toutDeselectionner()` pour un bouton de l'application) ; l'application le
remet à `false` quand ses filtres ou le tri changent.

Une ligne non sélectionnable avec `verrouLigne` garde une case focalisable, en lecture seule, qui
dit sa raison (infobulle et description). Échap vide la sélection quand le focus est dans le
tableau ou dans la barre d'actions, pas ailleurs (navigation, dialogue, menu). Un tableau rendu à
la main avec les primitives `Table` et une instance `useDataTable` pose
`ref={table.options.meta.racine}` sur son conteneur pour en profiter.

#### Lignes dépliables

Sur le modèle de TanStack (`rowExpandingFeature`) et des exemples shadcn : `dataTableExpandColumn`
ajoute le chevron (bouton à icône seule, infobulle, `aria-expanded`, `aria-controls`), et
`rendreDetail` de `DataTable` rend le détail sous la ligne, sur toute la largeur. Sans
`onActiverLigne`, un clic sur la ligne la déplie aussi ; la sélection et les commandes de la
ligne restent indépendantes. Sur mobile, le détail suit la largeur visible du cadre : il reste
lisible pendant que les colonnes défilent.

```tsx
const colonnes = aide.columns([
  dataTableExpandColumn<Evenement>({
    libelleLigne: (e) => `Détail de « ${e.action} » du ${e.date}`,
  }),
  aide.accessor("action", { header: "Action" }),
  // …
])

const table = useDataTable({
  donnees,
  colonnes,
  idLigne: (e) => e.id,
  ligneDepliable: (e) => e.avant !== null, // pas de chevron sans détail
  uneSeuleLigneDepliee: true, // déplier une ligne replie l'autre
})
<DataTable
  table={table}
  libelle="Journal"
  rendreDetail={(e) => <DetailEvenement evenement={e} />}
/>
```

Une requête rechargée ne referme pas le détail ouvert ; une ligne qui disparaît des données est
retirée des lignes dépliées.

#### Pagination

`DataTablePagination` ramène sur la dernière page un `decalage` passé au-delà de la fin
(dernière ligne de la dernière page supprimée), par `onDecalageChange`, mais seulement une fois
le total connu (`total > 0`) : un total à 0 pendant un chargement ne renvoie pas à la première
page. Avec TanStack Query, `placeholderData: keepPreviousData` garde la page précédente (et son
total) pendant le chargement de la suivante. « Précédente » et « Suivante » restent focalisables
en bout de liste.

### Utilitaires et hooks

Textes chiffrés en français : une valeur absente rend un repli (« — » par défaut, dernier
argument ou option `repli`), une date illisible est rendue telle quelle.

| Fonction                                                                             | Rôle                                                                                                                                                        |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compte`, `accorde`, `nombreFr`, `uniteAccordee`, `participe`                        | « 1 234 lignes », « 0 doublon » (0 et 1 au singulier) ; le mot seul, pluriel irrégulier en option ; nombre au format français ; participe accordé en genre. |
| `formaterOctets`                                                                     | « 512 o », « 1,5 Ko », « 120 Mo » (base 1 024, une décimale sous 100).                                                                                      |
| `formaterDuree`, `formaterDureeArrondie`, `formaterAnciennete`                       | « 3 j 4 h » ; « 3 j » ; « il y a 3 j 4 h » ou « à l'instant » (`arrondie`, `ilYA: false` pour « 3 j »).                                                     |
| `formaterDate`, `formaterDateHeure`, `formaterHorodatage`, `formaterDateHeureLongue` | « 05 juillet 2026 » (une date sans heure reste ce jour-là dans tous les fuseaux) ; « 05/07/2026 14:30 » ; à la seconde ; « 05 juillet 2026 à 14:30 ».       |
| `lireDateIso`, `ecrireDateIso`                                                       | Date sans heure de l'API (`AAAA-MM-JJ`) ↔ `Date` du `DatePicker`, en heure locale ; un 31 février est refusé.                                               |
| `normaliser`, `correspondance`                                                       | Texte sans accents ni casse ; filtre d'une recherche locale (`correspondance(recherche)(...textes)`, recherche vide : tout passe).                          |
| `NO_AUTOFILL`                                                                        | Attributs à étaler sur un champ qui n'est pas un identifiant : les gestionnaires de mots de passe s'en écartent.                                            |
| `useDebouncedValue`, `useDocumentTitle`                                              | Valeur recopiée après un délai sans changement (300 ms par défaut) ; titre de l'onglet le temps que la page est montée.                                     |

```tsx
const [recherche, setRecherche] = useState("")
const rechercheDifferee = useDebouncedValue(recherche)
const correspond = correspondance(recherche)
const visibles = postes.filter((p) => correspond(p.nom, p.pole?.nom))

<DatePicker
  valeur={lireDateIso(membre.date_naissance)}
  onValeurChange={(date) => setDateNaissance(ecrireDateIso(date))}
/>
<Input type="search" {...NO_AUTOFILL} />
```

### Développer contre les sources locales

Pour voir une modification de la bibliothèque instantanément dans une application, sans publier,
avec le dépôt `etic-packages` cloné sur le même poste :

```ts
// vite.config.ts de l'application : en développement seulement
// (chemin vers packages/ui/src, ici pour une application à côté d'etic-packages)
const UI_SRC = path.resolve(__dirname, "../etic-packages/packages/ui/src")

export default defineConfig(({ command }) => ({
  resolve:
    command === "serve"
      ? {
          alias: {
            "@etic-insa/ui": UI_SRC,
            // les composants s'importent entre eux par « @etic-ui/… »
            "@etic-ui": UI_SRC,
          },
          // une seule copie de React, même si etic-packages a ses propres node_modules
          dedupe: ["react", "react-dom"],
        }
      : {},
}))
```

Côté CSS, ajouter un `@source` vers ce même dossier `src` et importer son `styles.css` au lieu
de celui du paquet.

## Développer la bibliothèque

Node : la version de `.nvmrc` (`nvm use`). Dépôt monorepo : `npm install` à la racine
d'`etic-packages` installe tous les paquets.

```sh
# depuis packages/ui
npm run dev        # atelier : tous les composants, thème au pied de la barre latérale
npm test           # vitest
npm run typecheck
npm run lint
npm run build      # dist/ : un module par composant, types, styles.css
# depuis la racine : les mêmes scripts pour tous les paquets, plus npm run format:check
```

### Organisation

- `src/components/ui/` et `src/hooks/` : composants shadcn, copiés par le CLI
  (`npx shadcn add <composant>`). Ce code est le nôtre et se modifie comme le reste. Chaque
  modification est listée ci-dessous, pour pouvoir la réappliquer si l'on reprend un jour la
  version de shadcn (`npx shadcn add <composant> --diff`, puis `--overwrite`) ;
  `src/ecarts-shadcn.test.ts` échoue si elle a disparu :
  - seuil mobile à 1 024 px compris au lieu de 768 px : `hooks/use-mobile.ts` (réécrit avec
    `useSyncExternalStore`, juste dès le premier rendu) et les variantes `md:` de
    `components/ui/sidebar.tsx`, devenues `min-[1025px]:` ;
  - textes en français, visibles ou lus par les lecteurs d'écran : `sidebar.tsx` (« Menu »,
    « Navigation de l'application. », « Afficher ou masquer le menu »), `sheet.tsx` et `dialog.tsx` (« Fermer »),
    `pagination.tsx` (« Pagination », « Précédente », « Suivante », « Page précédente »,
    « Page suivante », « Autres pages »), `breadcrumb.tsx` (« Fil d’Ariane »,
    « Niveaux masqués »), `spinner.tsx` (« Chargement »), `combobox.tsx` (« Effacer » et
    « Retirer », libellés ajoutés aux boutons à icône seule) ;
  - calendrier en français : `calendar.tsx` prend par défaut la locale `fr` de
    react-day-picker (mois, jours et libellés d'accessibilité) et `weekStartsOn={1}` ;
  - jours du calendrier de 36 px sous le seuil mobile (cible tactile), 28 px au-delà comme
    dans shadcn : `--cell-size` de `calendar.tsx` ;
  - thème (`styles.css`) : `--muted-foreground` plus foncé en clair (≥ 4,5:1 sur `--muted` :
    initiales d'`Avatar`, `Kbd`), `--destructive` plus foncé en clair et plus clair en sombre
    (≥ 4,5:1 sur sa teinte : bouton et badge `destructive`, y compris dans un pied de
    dialogue) ; contrastes vérifiés par `src/theme.test.ts` ;
  - l'accent comme texte en `text-primary-text` au lieu de `text-primary` : variante `link` de
    `button.tsx` et `badge.tsx`, liens survolés de `empty.tsx`, `field.tsx` et `item.tsx` ;
  - import inutilisé de React retiré de `scroll-area.tsx` (sans quoi `tsc` échoue) ;
  - `button.tsx` : un bouton `aria-disabled` (désactivé mais focalisable, `focusableWhenDisabled`)
    est estompé comme un bouton `disabled`, curseur interdit (d'attente s'il est `enCours`), sans
    enfoncement au clic ; pas de `pointer-events-none`, qui couperait l'infobulle de sa raison ;
  - `button.tsx` : taille `inline` (`h-auto min-h-6 gap-1 px-0`), pour un lien `variant="link"`
    dans une phrase ou une cellule, cible tactile de 24 px gardée ;
  - `button.tsx` : `enCours` (roue muette à la place des icônes, `aria-busy`, `data-en-cours`,
    pas de survol, clics ignorés, focus gardé par `focusableWhenDisabled`) et `libelleEnCours` ;
    un `children` n'est passé que s'il est donné (les enfants d'un `render` restent) ; `spinner.tsx` :
    `SpinnerDecoratif`, roue sans rôle ni nom, cachée aux lecteurs d'écran ;
  - variantes `success` et `warning` ajoutées à `badge.tsx`, sur le modèle de `destructive`
    (teinte à 10 %, 20 % en sombre, texte de la couleur) ;
  - case à cocher partielle (`indeterminate`) : `checkbox.tsx` affiche un trait sur fond plein,
    comme une case cochée, au lieu de la coche sur fond vide de shadcn (on croyait tout coché) ;
  - bord d'une case à cocher vide en `--control-border` (`styles.css`) au lieu de `--input` :
    `--muted-foreground` à 80 % en clair (≥ 3:1, le bord de Nova se voyait à peine), `--input`
    en sombre ;
  - variantes `warning`, `info` et `success` ajoutées à `alert.tsx`, sur le modèle de
    `destructive` (fond de carte, texte de la couleur, description à 90 %), et couleur `--info`
    dans `styles.css` ;
  - Ctrl+B (repli de la barre latérale) ignoré quand le focus est dans un champ de saisie
    (`input`, `textarea`, `select`, `contenteditable`) : `sidebar.tsx`, pour ne pas voler le
    gras d'un éditeur riche ;
  - anneau de focus (`focus-visible:ring-3 ring-ring/50`) sur le panneau de `tabs.tsx`, arrêt
    de tabulation qui n'en avait pas ;
  - `slider.tsx` : une valeur simple (un nombre) dessine un seul curseur, au lieu de deux ;
    anneau de focus clavier `has-focus-visible:ring-3` sur le curseur (le focus va à l'input
    range caché qu'il contient) ; `aria-label` du slider relayé aux curseurs ; une plage
    annonce « 20 (minimum) », « 80 (maximum) » au lieu de « start/end range » ;
  - déclencheurs de `select.tsx` et `native-select.tsx` en `text-base md:text-sm`, comme
    `Input` (en 14 px sur téléphone, iOS zoome à la sélection) ;
  - bouton qui ouvre la liste de `combobox.tsx` nommé « Afficher les options » ;
  - `alert.tsx` : `role="status"` pour `info` et `success` (messages d'état, annoncés sans
    interrompre), `role="alert"` gardé pour les autres variantes ;
  - onglets `variant="line"` de `tabs.tsx` qui passent à la ligne sur un écran étroit
    (liste en `h-auto max-w-full flex-wrap justify-start`, déclencheurs en `h-7 flex-none`)
    au lieu de déborder ; un défilement couperait le trait de l'onglet actif. La variante par
    défaut, en pastille, ne change pas ;
  - `avatar.tsx` : `diametre` (px) au-delà des tailles `sm`, `default` et `lg` (24 à 40 px),
    qui pose largeur, hauteur et taille des initiales (36 % du diamètre), reprise par
    `AvatarFallback` (`group-data-diametre/avatar:text-[length:inherit]`).

  Le thème ajoute aussi (`styles.css`, hors composants shadcn) la règle de mouvement réduit.

  Sans écart de code mais garanti par le même test : `Button` sans `type` rend
  `type="button"` (Base UI le fait pour un bouton natif) et ne soumet donc pas son formulaire.

- `src/components/etic/` : composants ETIC qui importent ceux de `ui/` et ajoutent
  comportement, composition ou variantes.
- `src/index.ts` : tout ce qu'une application peut importer. Un composant non exporté ici
  n'existe pas pour les applications.
- `src/styles.css` : thème commun (clair et sombre). Au build, `scripts/build-css.mjs` y recopie
  `shadcn/tailwind.css`, pour que les applications n'aient pas à installer le CLI shadcn.
- `atelier/` : la page de démonstration servie par `npm run dev`. Elle n'est pas publiée.

### Règle absolue

Le paquet et ce dépôt sont publics : aucun secret, URL interne, nom de client ni code métier.
