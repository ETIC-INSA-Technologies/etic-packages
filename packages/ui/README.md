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

Les neutres (fonds, panneaux, bordures, textes) sont ceux de la couleur de base `zinc` de
shadcn (palette `zinc` de Tailwind 4, gris froid presque neutre), communs à toute la suite : une
application ne les redéfinit pas. `--muted-foreground` est un peu plus foncé en clair
(≥ 4,5:1 sur `--muted`), écart vérifié avec les contrastes par `src/theme.test.ts`.

Le fond de la page elle-même est un jeton ajouté, `--page` (classe `bg-page`) : zinc-50 en
clair, si bien que cartes, menus et tableaux blancs s'en détachent (en sombre, il vaut
`--background` et les cartes sont déjà plus claires). Le `body` et le contenu d'`AppShell`
le prennent ; un conteneur pleine page d'une application aussi, plutôt que `bg-background`,
qui reste la surface blanche de shadcn (onglet actif, bouton `outline`, calendrier…).
`color-scheme` suit le thème (`light`, `dark`) : barres de défilement et contrôles natifs
compris.

#### Thème clair, sombre ou système

`appliquerTheme(theme)` pose la classe `dark` sur `<html>` pour `"dark"`, la retire pour
`"light"` et, pour `"system"`, suit `prefers-color-scheme`, y compris quand le système change.
La préférence vient du compte (`theme` de `@etic-insa/auth`) ; `useThemeApplique` la peint,
la mémorise dans ce navigateur (`localStorage`, clé `"etic-theme"`) et suit un changement
fait dans un autre onglet. Une valeur `null` ou inconnue vaut `"system"`. Le rappel est
obligatoire : sans lui, l'état de l'application garderait l'ancien thème et le rechoisir ne
changerait rien.

```tsx
import { useThemeApplique } from "@etic-insa/ui"

// Une fois, près de la racine : thème du compte, undefined tant qu'il n'est pas chargé.
useThemeApplique(me?.preferences?.theme, (theme) => {
  /* autre onglet : aligner l'état local sans rappeler le serveur */
})
```

Hors de React (atelier, page sans compte), `appliquerTheme` seul : il ne mémorise rien.

Pour que la première image soit déjà dans le bon thème, avant le chargement du compte,
l'application charge le script de démarrage du paquet dans `<head>`, avant le bundle, sans
`type="module"`, depuis sa propre origine (une CSP `script-src 'self'` l'admet) :

```html
<script src="/theme-boot.js"></script>
```

Vite ne regroupe pas un script classique : le copier dans `public/` avant `dev` et `build`
(copie ignorée dans git) :

```json
"scripts": {
  "theme-boot": "node -e \"const fs = require('fs'); fs.mkdirSync('public', { recursive: true }); fs.copyFileSync(require.resolve('@etic-insa/ui/theme-boot.js'), 'public/theme-boot.js')\"",
  "predev": "npm run theme-boot",
  "prebuild": "npm run theme-boot"
}
```

Il relit le thème mémorisé ; sans thème mémorisé, il suit le système.

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

Le composant de lien du routeur se donne une fois, autour de l'application :
`<LienProvider lien={LienRouteur}>`, où `LienRouteur` est une référence stable, définie
au niveau du module (un composant écrit en ligne serait nouveau à chaque rendu, et React
remonterait tous les liens). `AppShell`, `DetailHeader`, `ButtonLink` et
`DataTableCellLink` le prennent alors par défaut, sans `lien={…}` à chaque appel ; leur
prop `lien` reste prioritaire. Téléchargement ou adresse externe : `lien="a"` (un vrai
`<a>`, rechargement complet). Sans fournisseur ni prop, un `<a>`. `useLien(lien?)` rend le
même choix aux liens propres de l'application (`const Lien = useLien()`) ; le type
`LienComposant` le décrit (`AppShellLienComposant`, son ancien nom, est déprécié).

`bandeau` (un `ErrorBanner` qui concerne toute l'application…) s'affiche au-dessus du
contenu avec les marges latérales de `PageContainer` : l'application le passe nu. Un bandeau
qui ne rend rien (`ErrorBanner` sans erreur) ne laisse pas d'espace vide. Il prend toute la
largeur du contenu, car la coquille ignore la `largeur` de la page : sur grand écran, il
déborde d'une page étroite (`largeur="md"`). Il sert donc aux messages de toute
l'application ; un message propre à une page se place dans son `PageContainer`.

`PageContainer` est le conteneur de chaque page dans `AppShell` : marges (16 px sur
téléphone, 24 puis 32 px au-delà), espacement vertical régulier entre les blocs (`gap-6`),
et `largeur` maximale centrée (`md`, `lg`, `xl`, ou `full` par défaut). Les pages ne posent
pas leurs propres marges.

### Retours et mise en page

Compositions des primitives shadcn pour les états d'une page et les actions courantes. Elles ne
connaissent ni l'API ni le routeur : l'application fournit ses fonctions (envoi, suppression,
chargement d'une image) et, au besoin, son composant de lien (`lien`, comme pour `AppShell`).

| Composant                                                                | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ConfirmDialog`                                                          | Confirmation (`AlertDialog`) : `titre` qui nomme l'action, `description` qui nomme ce qu'elle touche, `saisie` pour exiger de taper une valeur non affichée (action critique). L'erreur de l'action s'affiche dans le dialogue, qui reste ouvert.                                                                                                                                                                                                   |
| `FormDialog`                                                             | Formulaire dans un `Dialog` : pied « Annuler / Enregistrer », curseur dans le premier champ à remplir, état d'envoi (champs figés), erreur en tête, `taille` `sm` à `xl`, `verrouEnvoi` pour dire pourquoi l'envoi est impossible. Les contraintes des champs (`required`, `type`, `pattern`…) sont vérifiées sans la bulle du navigateur : la liste des champs à corriger s'affiche en français.                                                   |
| `DraftResumeDialog`                                                      | Ouverture d'un utilitaire à brouillon (compagnon de `useDraftAutosave`) : « Quitter », `libelleRepartir` (suppression du brouillon, `onRepartir` attendue, bouton occupé, erreur affichée, comme `erreur` venue d'ailleurs) et « Reprendre au même point » si `reprenable`. Sans croix ; Échap quitte, jamais pendant la suppression.                                                                                                               |
| `UnsavedChangesDialog`, `useUnsavedChangesWarning`                       | Garde « modifications non enregistrées », sans routeur : `useUnsavedChangesWarning(modifie)` (booléen, ou fonction lue au moment de quitter) retient la fermeture de l'onglet ; le dialogue confirme une navigation retenue par l'application (`blocage` : `state`, `proceed`, `reset`, la forme du `useBlocker` de react-router).                                                                                                                  |
| `PageContainer`                                                          | Conteneur de page dans `AppShell` : marges, `largeur` maximale, espacement entre les blocs.                                                                                                                                                                                                                                                                                                                                                         |
| `PageHeader`, `DetailHeader`                                             | En-tête de page (`<h1>`, description, actions) ; en-tête de fiche avec fil d'Ariane (`chemin`), badges, méta, actions et menu « Plus d'actions » (`actionsSecondaires` : `onChoisir`, `destructif`, `verrou` affiché sous le libellé ; `tailleActions="lg"` pour des actions en `size="lg"`), `compact` quand la fiche répète déjà son nom.                                                                                                         |
| `SectionCard`, `DetailList`, `DetailItem`                                | Carte de section titrée (`<h2>`) ; liste `<dl>` de paires libellé / valeur, « — » pour une valeur absente (`null`, `undefined`, `false`, chaîne vide). `disposition` : `grille` (défaut, autant de colonnes que la largeur en permet), `pile` (une seule colonne, libellé au-dessus de la valeur : carte étroite, dialogue, valeurs longues), `ligne` (métadonnées secondaires : « libellé : valeur » en petit et en discret, l'une après l'autre). |
| `ErrorBanner`                                                            | `Alert` destructive : message, code, détail technique replié (même circulaire), « Réessayer » (`onReessayer`, occupé pendant `enCours`). Lit toute erreur ayant un `message` (et `code`, `details`).                                                                                                                                                                                                                                                |
| `ErrorBoundary`                                                          | Filet sous le rendu : message, détail technique, « Réessayer », « Retour à l'accueil » ; `cleReinitialisation` (la route) l'efface. Le focus perdu avec la partie cassée passe sur le message.                                                                                                                                                                                                                                                      |
| `EmptyState`, `Loading`, `SkeletonTable`, `SkeletonCard`, `SkeletonPage` | État vide (`Empty` dans un cadre pointillé, `icone` lucide : `icone={InboxIcon}`) ; attente annoncée (`Spinner`) ; squelettes de tableau, de carte et de fiche, un seul statut « Chargement… » chacun.                                                                                                                                                                                                                                              |
| `QueryBoundary`                                                          | Chargement, erreur (avec « Réessayer »), vide et données d'une requête ; accepte tel quel le résultat de `useQuery`. L'échec d'une actualisation garde les données, montées, sous le bandeau d'erreur ; pendant une nouvelle tentative, le bandeau reste, son bouton occupé. Sans enveloppe : rendu dans le parent, qui règle l'espacement.                                                                                                         |
| `QueryBoundary introuvable`                                              | Fiche : `introuvable` (texte ou nœud, avec un lien de retour) remplace le bandeau quand l'erreur porte un `status` 404 (`ErreurApi` de `@etic-insa/auth`, ou même forme), sans « Réessayer ». Les autres échecs gardent le bandeau : une panne n'est jamais annoncée « introuvable ».                                                                                                                                                               |
| `QueryErrorBanner`                                                       | Le bandeau d'erreur de `QueryBoundary`, seul (`requete` : `isError`, `error`, `isFetching`, `refetch`), pour une page qui place elle-même ses données ; rien tant que la requête n'a pas échoué. Accepte `titre`, `description`, `className` d'`ErrorBanner`.                                                                                                                                                                                       |
| `Disclosure`, `DisclosureTrigger`                                        | Section repliable à chevron tournant, fermée par défaut : `titre`, `compteur` en pastille, `variante` `lien` (en ligne), `discret` (fantôme estompé) ou `carte` (bloc encadré), `defautOuvert` ou `ouvert` / `onOuvertChange`. `DisclosureTrigger` seul pour un `Collapsible` composé à la main.                                                                                                                                                    |
| `CenteredScreen`                                                         | Écran hors de la coquille (connexion, page introuvable, vérification de session) : le `<main>` de la page, contenu centré sur toute la hauteur, fond estompé.                                                                                                                                                                                                                                                                                       |
| `StatTile`, `StatGrid`, `StatusBadge`                                    | Chiffre clé d'un résumé ; rangée de tuiles (colonnes de `largeurMin` au moins, 190 px par défaut, une seule sur téléphone) ; badge d'état à pastille. `ton` (type `StatusTon`) : `neutral`, `info`, `success`, `warning`, `destructive` ; il colore aussi `Progress` (8 px avec `size="lg"`), le segment choisi d'un `SegmentedControl` et un `IconToggle` actif.                                                                                   |
| `RemovableBadge`, `ExplainedBadge`                                       | Badge de 28 px (`size="lg"`, aussi pour les badges sans croix de la même liste) terminé par une croix « Retirer » (`onRetirer`, `libelleRetirer`, `enCours`, `verrou`) ; badge dont l'`explication` s'ouvre au toucher, au clic, au survol et au focus (un `Toggletip`) et se lit après lui (`render` : un autre porteur, `<time>` par exemple).                                                                                                    |
| `Toggletip`                                                              | Explication d'un élément qui n'est pas une action (date, sigle) : bulle sur `Popover`, ouverte au toucher, au clic, au survol et au focus, fermée au toucher ailleurs, à Échap ou quand le focus part ; clic sans effet sur un parent cliquable ; lue après le contenu (`texteLu`). Un bouton qui agit garde son infobulle (`TooltipButton`).                                                                                                       |
| `SaveBar`                                                                | Pied d'un formulaire de page : « Enregistrer » (soumet le formulaire, ou `onEnregistrer`), occupé mais focalisable pendant `enCours` ; « Annuler » avec `onAnnuler` ; statut annoncé : « Enregistré » (`enregistre`), « Modifications non enregistrées » (`modifie`). `collante` : barre collée en bas d'un long formulaire.                                                                                                                        |
| `CopyButton`, `DeleteButton`, `IconToggle`                               | Copie avec retour « Copié ! », ou « Copie impossible » si le navigateur refuse (`onCopie`, `onEchec`) ; corbeille qui ouvre une confirmation ; bouton à icône qui pose ou retire un marqueur (`Toggle`, `aria-pressed`, `onActifChange`, `enCours` occupé sans perdre le focus ; actif, en couleur de son `ton`, `warning` par défaut). Tous ont une infobulle, et `verrou` pour dire pourquoi l'action est impossible.                             |
| `TooltipButton`                                                          | `Button` avec infobulle et état `verrou` (désactivé mais focalisable, la raison en infobulle) : la règle pour tout bouton à icône seule, que l'infobulle nomme (`aria-label`, sauf nom donné). `destructif` : gris, rouge au survol seulement (corbeille, retrait dans une liste).                                                                                                                                                                  |
| `ButtonLink`                                                             | Lien à l'allure de bouton (`variant`, `size` de `Button`), annoncé comme un lien ; `lien` : le composant de lien du routeur, par défaut celui du `LienProvider` (`<a>` sans lui ; `lien="a"` force un rechargement complet).                                                                                                                                                                                                                        |
| `AuthAvatar`, `AuthImage`, `useAuthObjectUrl`                            | Image servie par une adresse authentifiée : l'application passe `charger(src, signal)` (type `AuthImageCharger`) qui renvoie le `Blob` ; l'avatar garde les initiales tant que la photo manque.                                                                                                                                                                                                                                                     |
| `useAuthObjectUrlEtat`, `secoursEchec`, `diametre`                       | État complet d'une image authentifiée (`url`, `enCours`, `echec`, `erreur`) pour dire « indisponible » plutôt que charger sans fin ; `secoursEchec` d'`AuthImage` en cas d'échec ; `diametre` (px) d'`AuthAvatar` et d'`Avatar`, initiales proportionnées (leur graisse suit la racine).                                                                                                                                                            |

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

Options de `ConfirmDialog` : `verrou` (confirmation impossible, et pourquoi : bouton focalisable,
raison en infobulle et en description), `libelleAnnuler` (« Revenir au tableau »), `taille`
(`sm` par défaut, `md` ou `lg` pour un récapitulatif), `elements` et `libelleElements` (liste
nommée des éléments concernés, qui défile au-delà d'une dizaine de lignes), `onAnnuler`
(appelé quand la personne renonce : « Annuler » ou Échap ; jamais après une
réussite, alors que `onOuvertChange(false)` suit les deux). Si `saisie.attendu` change pendant
l'ouverture (le nombre d'éléments a changé côté serveur), la saisie est vidée, sans remonter le
dialogue : pas de `key` à forcer. `FormDialog` prend `libelleAnnuler` (« Plus tard ») et
`actionSecondaire` (`libelle`, `onChoisir`, `destructif`) : une troisième sortie discrète en
tête du pied (« Se déconnecter »), indisponible pendant l'envoi, qui ne ferme pas le dialogue
d'elle-même ; si `onChoisir` renvoie une promesse, le dialogue l'attend comme un envoi (ce
bouton en cours, le reste figé, erreur en tête), et `destructif` la rend grise, rouge au
survol (comme `TooltipButton`). Les boutons occupés de ces dialogues, de « Réessayer »
(`ErrorBanner`), de `FileUploadButton` et d'`IconToggle` sont tous le `Button` en cours. Sans champ où l'on tape, il s'ouvre sur le premier contrôle actif et affiché (case,
liste, choix segmenté… ; un panneau replié est ignoré). Tous les dialogues plafonnent leur
hauteur à l'écran et gardent le focus : Tab et Maj+Tab en font le tour sans en sortir. Dans
`FormDialog`, `ConfirmDialog` et `DraftResumeDialog`, seul le corps défile : titre, croix et
pied restent visibles. Un dialogue composé à la main obtient la même chose en plaçant son
contenu dans `DialogBody` (aussi dans un `AlertDialogContent`) ; sans lui, tout le contenu
défile.

```tsx
// Garde « modifications non enregistrées » avec react-router (routeur « data »).
useUnsavedChangesWarning(modifie)
const blocage = useBlocker(
  ({ currentLocation, nextLocation }) =>
    modifie && currentLocation.pathname !== nextLocation.pathname
)
<UnsavedChangesDialog blocage={blocage} />
```

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
  l'application (à bloquer avant l'envoi). `moisInitial` : mois montré à l'ouverture tant
  qu'aucune date n'est choisie (une date de naissance s'ouvre ainsi vingt ans plus tôt, pas
  sur le mois courant), et où il revient quand la date est effacée. Fermé au clavier ou par
  un jour choisi, le calendrier rend le focus au champ (un Échap de plus ferme le dialogue
  englobant, sans infobulle à fermer d'abord) ; après un clic ailleurs, le focus reste où
  l'on a cliqué.
- `PhoneInput` : sélecteur de pays (Combobox : drapeau et indicatif, recherche sur le nom du
  pays ou l'indicatif) et numéro, lus et validés par
  libphonenumber-js. `onValeurChange(valeur, { valide, pays })` reçoit l'E.164
  (`+33612345678`) dès que la longueur est possible ; un numéro tapé avec « + » choisit le
  pays. En erreur (`aria-invalid` du numéro), le groupe est traité comme un seul champ :
  bordure rouge sur le sélecteur de pays comme sur le numéro, un seul halo autour des deux.
  `formaterTelephone(numero, { paysParDefaut = "FR" })` écrit un numéro pour l'affichage
  hors d'un champ (fiche, liste), sans drapeau : national pour le pays par défaut
  (`06 55 18 92 45`), international pour tout autre, pour que son pays se lise
  (`+44 20 7946 0958`), tel quel s'il est illisible. Le `PhoneInput`, lui, écrit toujours le
  format national, le pays étant montré par son drapeau. Chaque appel relit le numéro :
  dans une longue liste, mémoïser le résultat.
- `SearchSelect` : choix dans une longue liste cherchée par l'application.
  `rechercher(texte, signal)` renvoie une promesse (texte vide : premières suggestions) ;
  `libelleElement`, `idElement` et `rendreOption` décrivent un élément. Anti-rebond,
  chargement (la liste reste vide tant que la réponse ne correspond pas à la saisie : un
  ancien résultat ne se choisit pas), échec avec « Réessayer » (l'erreur va à `onErreur`, ou
  à la console ; au clavier, Entrée dans le champ relance la recherche, même identique),
  liste vide (`vide`) et effacement sont gérés. Sans élément choisi, le texte tapé reste
  quand la liste se ferme (Entrée, Tab), et la recherche reprend à la réouverture. `form`
  va, comme `name`, à l'entrée cachée qui porte la valeur. La liste s'aligne sur le cadre du
  champ, loupe comprise (comme toute liste d'un `ComboboxInput`).
- `Select` (shadcn) : la liste s'ouvre sous le champ, alignée à gauche, sans jamais le
  recouvrir (`alignItemWithTrigger` et `align` restent réglables sur `SelectContent`).
  Les options vont dans un `SelectGroup`, comme chez shadcn ; posées directement dans
  `SelectContent`, elles ont la même marge. Sans option (y compris un `SelectGroup` vide),
  la liste dit « Aucune option. » (`vide` de `SelectContent`), dans une zone de statut
  annoncée aux lecteurs d'écran. `SelectItem` prend une `description` sous son libellé,
  reliée à l'option : la raison d'une option figée (`disabled`), qui reste lisible quand le
  libellé s'estompe ; le libellé passe alors à la ligne plutôt que d'être coupé.
- `FileUploadButton` et `FileDropZone` : bouton, ou zone de glisser-déposer avec bouton, sur
  react-dropzone. Types (`accepter={{ "text/csv": [".csv"] }}`) et taille (`tailleMax`, en
  octets) vérifiés, refus en français : à `onRefuser` pour les deux, et affichés dans la zone
  (après le bouton s'il n'y a pas d'`onRefuser`, en rouge, sur une ligne entière dans une
  rangée `flex-wrap` ; sans refus, rien d'autre que le bouton n'occupe le flux, ce qui le
  laisse dans une barre d'outils ou un `ButtonGroup`). Pendant `enCours`, le bouton reste
  focalisé, indisponible, et l'envoi est annoncé. `FileUploadButton` relaie les props de
  `Button` (`id`, `aria-*` : il fonctionne dans un `FormField`).
- `SegmentedControl` : choix exclusif en boutons joints (`ToggleGroup`), sans désélection ;
  le segment choisi prend, en plus du fond `bg-muted`, un liseré intérieur, ou la couleur
  du `ton` de son option (celle de l'état que produit le choix). L'`infobulle`
  d'une option nomme un segment à icône seule, sans masquer un libellé texte.
- `CheckboxList` : plusieurs valeurs parmi une liste de cases (`CheckboxGroup` de Base UI) ;
  la `description` d'une option est reliée à sa case. Une case figée n'estompe que sa ligne.
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

| Composant                  | Rôle                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `useDataTable`             | instance TanStack : tri, filtre et pagination (côté client, ou serveur avec `triManuel`), colonnes, sélection, dépliage   |
| `DataTable`                | la Table de shadcn ; état vide, lignes fantômes du chargement, bandeau d'erreur (`requete`), clic de ligne, détail déplié |
| `DataTableColumnHeader`    | en-tête triable : un clic trie par ordre croissant, le suivant inverse le sens                                            |
| `dataTableSelectionColumn` | colonne de cases ; Maj+clic sélectionne une plage ; raison d'une case verrouillée                                         |
| `dataTableExpandColumn`    | colonne du chevron qui déplie une ligne (`aria-expanded`, `aria-controls`)                                                |
| `dataTableActionsColumn`   | colonne des commandes d'une ligne : en-tête lu mais invisible, commandes à droite                                         |
| `DataTableCellLink`        | titre d'une ligne : vrai lien (`href`, routeur par `lien`) ou bouton                                                      |
| `DataTableRowActions`      | menu « … » d'une ligne                                                                                                    |
| `DataTableViewOptions`     | bouton « Colonnes » : afficher, masquer, réordonner (glisser-déposer, clavier compris)                                    |
| `DataTableToolbar`         | recherche, filtres (`DataTableSelectFilter`), compteur (`DataTableCount`), commandes                                      |
| `DataTablePagination`      | pagination par décalage (offset/limit, total connu), ou celle du tableau (`table`)                                        |
| `DataTableBulkActions`     | barre d'actions groupées, collante en bas, avec la sélection ; Échap désélectionne                                        |
| `useColumnPrefs`           | colonnes affichées et leur ordre, gardés dans le navigateur par liste et par personne                                     |
| `usePersistedState`        | `useState` gardé dans le navigateur (filtre choisi…), sous la portée `PorteeStockageLocal`                                |

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
d'une partie interne. La sélection se limite par défaut aux lignes affichées (changer de page
ou de filtre la réduit) ; `conserverSelection` la garde ; `table.options.meta.deselectionner(ids)`
en retire quelques lignes (refus d'une action groupée pour certaines). Sur mobile, le tableau
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
ou un bouton pour le clavier (`DataTableCellLink`). Un bouton passé dans `vide` (« Réinitialiser
les filtres ») disparaît avec l'état vide : l'application rend d'abord le focus au champ de
recherche. Quand une ligne qui avait le focus disparaît (suppression par un `DeleteButton`, un
menu « … » ou un dialogue de l'application ouvert depuis elle, liste rechargée), `DataTable`
rend le focus à la même cellule de la ligne suivante (ou précédente), sinon au tableau ; pour un
tableau rendu à la main, `focaliserTableau(cadre)` donne la même cible. `size` règle la taille
du `DeleteButton` (`icon-lg`, ou `lg` avec `avecTexte`, dans un `DetailHeader`
`tailleActions="lg"`). La recherche de `DataTableToolbar` porte `NO_AUTOFILL` ;
`recherche.attributs` lui ajoute des attributs.

L'en-tête du tableau ne se surligne pas au survol (seules les lignes de données le font). Quand
le tableau se vide (filtre sans résultat, page suivante en chargement), ses colonnes gardent leur
largeur. La colonne de sélection a la largeur de la zone de ses cases (40 px) ; une case
verrouillée reste lisible (fond gris, ou gris foncé cochée) au lieu d'être estompée.

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

#### Liste chargée d'un bloc : filtre, tri et pagination côté client

Comme dans le guide de shadcn (`getPaginationRowModel`, `getFilteredRowModel`), `useDataTable`
filtre, trie et découpe lui-même une liste reçue en entier. `paginationClient` l'active (25
lignes par page, `etatInitial.pagination` pour une autre taille) ; `DataTablePagination` et
`DataTableCount` reçoivent alors `table` au lieu de leurs nombres. `filtreGlobal` cherche dans
toutes les colonnes à accesseur, sans casse ni accents (« tresorerie » trouve « Trésorerie ») ;
`filtresColonnes` applique la fonction de chaque colonne (`filterFn`). Le tri nommé
`texteFr` (`sortFn: "texteFr"`) suit l'ordre alphabétique français de `comparerFr`, accents
compris, et « Poste 2 » avant « Poste 10 » ; le filtre nommé `texteFr` est celui de la
recherche (`normaliserRecherche`) ; une recherche vide ne filtre rien. Un changement de filtre
ou de tri ramène à la première page : le contenu est comparé, un `filtresColonnes` recréé à
l'identique à chaque rendu ne change pas la page. Supprimer une ligne garde la page courante (la
dernière page existante si elle disparaît) ; une page de départ (`etatInitial`, ou lue dans
l'URL) est gardée tant que les données ne sont pas arrivées. Changer le nombre de lignes par
page revient à la première page en une seule mise à jour (`setPagination`).
`DataTablePagination table={…}` sans `paginationClient` n'affiche rien et prévient dans la
console : la table ne découpe pas de pages.

```tsx
const colonnes = aide.columns([
  aide.accessor("nom", {
    header: ({ column }) => <DataTableColumnHeader column={column} libelle="Poste" />,
    sortFn: "texteFr",
    cell: ({ row }) => (
      <DataTableCellLink href={`/postes/${row.original.id}`} lien={RouterLink}>
        {row.original.nom}
      </DataTableCellLink>
    ),
  }),
  aide.accessor("pole", { header: "Pôle", filterFn: "equalsString" }),
  dataTableActionsColumn<Poste>({
    actions: (p) => <DeleteButton libelle={`le poste ${p.nom}`} … />,
    // enableHiding: true pour une colonne d'actions masquable et déplaçable.
  }),
])

const [recherche, setRecherche] = useState("")
const table = useDataTable({
  donnees: data ?? AUCUN,
  colonnes,
  idLigne: (p) => p.id,
  paginationClient: true,
  filtreGlobal: recherche,
  onFiltreGlobalChange: setRecherche,
  filtresColonnes: useMemo(() => (pole ? [{ id: "pole", value: pole }] : []), [pole]),
})
<DataTableToolbar
  recherche={{ valeur: recherche, onValeurChange: setRecherche }}
  compteur={{ table, unite: { singulier: "poste", pluriel: "postes" } }}
/>
<DataTable table={table} libelle="Postes" requete={requetePostes} />
<DataTablePagination table={table} />
```

#### Erreur de la requête

`requete` (le résultat de `useQuery` convient tel quel) affiche en échec le `QueryErrorBanner`
(« Réessayer ») au-dessus du tableau, rendu dans le parent comme pour `QueryBoundary` (le parent
règle l'espacement : `flex flex-col gap-4`). L'état vide se tait alors : « Aucun résultat »
contredirait le bandeau. Sans `enChargement`, `isFetching` en tient lieu.

#### Colonnes gardées dans le navigateur

`useColumnPrefs` garde, pour chaque liste et chaque personne, les colonnes affichées et leur
ordre (`localStorage`, format `{ order, visible }`) ; `optionsTableau` s'étale dans
`useDataTable`. Une colonne apparue depuis l'enregistrement s'ajoute à la fin, affichée si elle
l'est par défaut ; une colonne non offerte ici (`disponibles` : droit manquant) garde son état et
sa place ; `fixesEnTete` reste hors préférences. `optionsTableau.colonnesReglables` (une option
de `useDataTable` et de `DataTableViewOptions`) limite le panneau « Colonnes » aux colonnes des
préférences : les fixes et les autres n'y sont ni masquables ni déplaçables. `reinitialiser()`
revient aux valeurs par
défaut. `usePersistedState(cle, defaut, { accepter })` garde de même un réglage simple (un filtre
choisi) ; rien n'est écrit tant que rien n'est choisi, et `accepter` écarte une valeur
enregistrée devenue invalide. La portée (la personne connectée) se fournit une fois :
`<PorteeStockageLocal portee={moi?.id}>` ; les clés écrites sont `<portée>:<clé>` (`anon:`
sans personne), comme celles d'ETIC Members.

```tsx
const prefs = useColumnPrefs({
  cle: "membres:personnes",
  colonnes: ["email", "statut", "telephone"],
  visiblesParDefaut: ["email", "statut"],
  fixesEnTete: ["select", "nom"],
})
const table = useDataTable({
  donnees,
  colonnes,
  idLigne,
  ...prefs.optionsTableau,
})
```

#### Tableau rendu à la main

Un tableau que `DataTable` ne sait pas rendre (deux rangées d'en-tête, cellules éditables)
garde le sélecteur de colonnes et la barre d'actions sans instance `useDataTable` :
`DataTableViewOptions` reçoit `colonnes` (`{ id, libelle, masquable? }`) et les options de
`useDataTable` qui règlent les colonnes (`visibiliteColonnes`, `onVisibiliteColonnesChange`,
`ordreColonnes`, `onOrdreColonnesChange` ; sans ce dernier, pas de glisser-déposer), donc
`prefs.optionsTableau` de `useColumnPrefs` tel quel ; `DataTableBulkActions` reçoit `nombre`,
`onToutDeselectionner` et `racine` (le cadre du tableau, où Échap vide la sélection et où le
focus revient).

```tsx
<DataTableViewOptions colonnes={COLONNES} {...prefs.optionsTableau} />
<DataTableBulkActions
  nombre={selection.size}
  onToutDeselectionner={() => setSelection(new Set())}
  racine={cadreRef}
>
  …
</DataTableBulkActions>
```

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
  - même règle pour le contour d'une radio non cochée (`radio-group.tsx`, focus dans un
    `field-label` compris) et le rail d'un switch éteint (`switch.tsx`, `--control-border` à la
    place de `bg-input`) : ≥ 3:1 sur la page et sur une carte, en clair comme en sombre (le
    registre restait à 1,6:1 et 1,3:1 en sombre) ; le pouce reste distinct du rail ;
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
  - `select.tsx` : liste sous le champ et alignée à gauche par défaut
    (`alignItemWithTrigger={false}`, `align="start"`) au lieu d'être posée sur le champ et
    centrée (elle le masquait, et débordait des deux côtés d'un champ étroit) ; options
    posées sans `SelectGroup` à la même marge que dans un groupe ; `vide` de `SelectContent`
    (« Aucune option. » en `role="status"` au lieu d'une fenêtre vide) ; `description` de
    `SelectItem`, sous le libellé, qui reste lisible quand l'option est figée, avec un
    libellé qui passe à la ligne ;
  - `checkbox.tsx` : la case s'estompe d'après son propre état (`data-disabled`,
    `aria-disabled`, `fieldset` désactivé) et non par `group-has-disabled/field`, qui
    estompait toutes les cases d'un champ dès qu'une seule y était figée ; variantes
    `disabled:` retirées (la racine est un `<span>`, jamais `:disabled`). Dans un
    `<fieldset disabled>`, la case est réellement inactive (Base UI la coche par son entrée
    cachée, que le fieldset désactive) et en a l'air ;
  - `combobox.tsx` : la liste s'ancre sur le cadre (`InputGroup`) du `ComboboxInput`, et
    non sur le seul champ que décale un addon de tête. `Combobox` porte une ref vers ce
    cadre, que `ComboboxInput` remplit et que `ComboboxContent` passe à `anchor` (juste dès
    l'ouverture, `defaultOpen` compris) ; une `anchor` explicite (puces,
    `useComboboxAnchor`) l'emporte ; sans `ComboboxInput` hors de la liste, l'ancre reste
    le déclencheur ; un `ComboboxInput` placé dans la liste (recherche d'un sélecteur
    ouvert par un bouton) ne s'enregistre pas. Largeur minimale : celle de l'ancre
    (`min-w-(--anchor-width)`), au lieu de l'ancre + 28 px de shadcn, qui couvraient
    l'addon d'un champ seul ;
  - imports par sous-chemin, imposés par la règle ESLint `no-restricted-imports`
    (`eslint.config.js`) : Base UI (`@base-ui/react/combobox` dans `combobox.tsx`, que
    shadcn importe par la racine), date-fns, et la seule locale `react-day-picker/locale/fr`
    dans `calendar.tsx`. Les racines chargent tous les composants, toutes les fonctions ou
    toutes les locales aux outils sans tree-shaking (vitest des applications) ;
  - `alert.tsx` : `role="status"` pour `info` et `success` (messages d'état, annoncés sans
    interrompre), `role="alert"` gardé pour les autres variantes ;
  - onglets `variant="line"` de `tabs.tsx` qui passent à la ligne sous 640 px (`max-sm:` :
    liste en `h-auto max-w-full flex-wrap justify-start`, déclencheurs en `h-7 flex-none`)
    au lieu de déborder ; un défilement couperait le trait de l'onglet actif. Au-delà, et pour
    la variante par défaut en pastille, rien ne change ;
  - `avatar.tsx` : `diametre` (px) au-delà des tailles `sm`, `default` et `lg` (24 à 40 px),
    qui pose largeur, hauteur et taille des initiales (36 % du diamètre), reprise par
    `AvatarFallback` (`group-data-diametre/avatar:text-[length:inherit]`) ;
  - `SidebarTrigger` de `sidebar.tsx` : `libelle`, le nom lu du bouton (« Afficher ou masquer
    le menu » par défaut), au lieu d'un `aria-label` qui masquerait ce texte ;
  - `badge.tsx` : variante `info` (sur le modèle de `success`) et taille `size="lg"` (28 px,
    la hauteur d'un badge qui porte un bouton « Retirer ») ;
  - `progress.tsx` : `ton` (piste à 15 % et remplissage de la couleur, `StatusTon`, classes
    dans `lib/ton.ts`) et `size="lg"` (piste de 8 px au lieu de 4), au lieu de recolorer la
    piste et le remplissage par sélecteurs `[data-slot=…]` ;
  - `dialog.tsx` et `alert-dialog.tsx` : hauteur plafonnée à l'écran
    (`max-h-[calc(100dvh-2rem)]`), sans quoi le bas d'un long dialogue (et ses boutons) sortait
    de l'écran sur téléphone. Le contenu est une colonne (`flex flex-col` au lieu de `grid`) ;
    `DialogBody`, ajouté à `dialog.tsx`, est la zone qui défile seule (`min-h-0
overflow-y-auto`), en-tête, croix et pied restant visibles ; sans elle, tout le contenu
    défile (`overflow-y-auto`), jamais à l'horizontale (`overflow-x-hidden`) ;
  - `alert-dialog.tsx` : à la taille par défaut et sans `AlertDialogMedia`, titre et
    description alignés à gauche dès le téléphone (shadcn les centre sous `sm`), comme la liste
    et les champs du corps ; avec un média, la grille de shadcn reste telle quelle ;
  - `table.tsx` : la ligne d'en-tête ne se surligne pas au survol (`[&_tr:hover]:bg-transparent`
    sur `TableHeader`) ; les lignes de données gardent le survol de shadcn ;
  - `tooltip.tsx` : le focus qu'un popup (menu, calendrier, dialogue) rend à son
    déclencheur en se fermant, par Échap ou par un choix, n'ouvre plus l'infobulle de
    `TooltipTrigger` : elle absorbait l'Échap suivant, celui qui ferme le dialogue
    englobant (`ThemeMenu`, « Plus d'actions » de `DetailHeader`, tout `TooltipTrigger` posé
    sur un `DropdownMenuTrigger`). Reconnu par `lib/focus-rendu.ts` : le déclencheur a perdu
    le focus son popup ouvert (`aria-expanded`), ou le focus vient d'un popup qui ne le
    contient pas. Tout autre focus clavier l'ouvre comme avant (focus initial d'un dialogue
    ouvert par Entrée compris) ; le survol et l'`onFocus` de l'application ne changent pas.
    `CLASSES_BULLE` et `CLASSES_FLECHE` (internes) portent l'allure de la bulle, partagée
    avec `Toggletip` ;
  - `popover.tsx` : `PopoverContent` accepte `anchor` (celui du `Positioner` de Base UI),
    pour un popover sans `PopoverTrigger` (`Toggletip`, ancré sur l'élément qu'il explique).

  Le thème ajoute aussi (`styles.css`, hors composants shadcn) la règle de mouvement réduit.

  Thème : couleur de base `zinc` de shadcn (registre `colors/zinc.json`, `cssVarsV4`) au lieu
  de `neutral` ; jeton ajouté `--page` (`bg-page`, zinc-50 en clair, `--background` en
  sombre), pris par le `body` au lieu de `bg-background`, `--background` restant celui du
  registre ; `--success` clair un cran plus foncé (≥ 4,5:1 sur sa teinte posée sur la page
  zinc-50) ; `--muted-foreground` clair un
  peu plus foncé que zinc-500 (≥ 4,5:1 sur `--muted`) ; `--control-border`
  (`--muted-foreground` à 80 %) en sombre aussi, au lieu de `--input` (sous 2:1) ; `--sidebar`
  clair = `--background` (barre latérale blanche, au lieu du zinc-50 du registre) ;
  `color-scheme` dans `:root` et `.dark`. Les valeurs sont commentées dans `styles.css` ;
  `theme.test.ts` compare chaque jeton au registre, écarts (`ECARTS`) exceptés, et en vérifie
  les contrastes. Hors `ui/` : `CenteredScreen` est posé sur `bg-muted/40` au lieu du
  `bg-muted` des blocs de connexion de shadcn (fond moins appuyé, en sombre surtout) ; le
  contenu d'`AppShell` (`SidebarInset`) et sa barre mobile sont en `bg-page` ; le cadre de
  `DataTable` et la `Disclosure` `carte` sont en `bg-card`, blancs comme une carte.

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
