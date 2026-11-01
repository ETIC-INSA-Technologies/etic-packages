// Démonstrations des compositions « retours et mise en page ».
import { useRef, useState, type ReactNode } from "react"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InboxIcon,
  InfoIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
  AuthAvatar,
  AuthImage,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  CopyButton,
  DeleteButton,
  DetailHeader,
  DetailItem,
  DetailList,
  EmptyState,
  ErrorBanner,
  ErrorBoundary,
  ExplainedBadge,
  Field,
  FieldLabel,
  FormDialog,
  IconToggle,
  Input,
  Label,
  Loading,
  PageHeader,
  Progress,
  ProgressLabel,
  ProgressValue,
  QueryBoundary,
  RemovableBadge,
  SaveBar,
  SectionCard,
  SkeletonCard,
  SkeletonPage,
  SkeletonTable,
  Slider,
  StatGrid,
  StatTile,
  StatusBadge,
  TooltipButton,
  type QueryBoundaryRequete,
} from "@etic-ui/index"

/** Attend un peu, puis réussit ou échoue : de quoi voir l'état en cours. */
const attendre = (echec: boolean) =>
  new Promise<void>((resoudre, rejeter) =>
    setTimeout(
      () =>
        echec
          ? rejeter({
              message: "Le serveur a refusé l'opération.",
              code: "CONFLIT",
              details: { raison: "élément utilisé ailleurs" },
            })
          : resoudre(),
      1200
    )
  )

// Une image générée, servie comme le ferait une adresse authentifiée.
const chargerPhoto = async () => {
  await new Promise((r) => setTimeout(r, 600))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#7c9cf0"/><circle cx="32" cy="26" r="12" fill="#fff"/><rect x="14" y="42" width="36" height="22" rx="11" fill="#fff"/></svg>`
  return new Blob([svg], { type: "image/svg+xml" })
}
const chargerEchec = () => Promise.reject(new Error("403"))

function DemoConfirmation() {
  const [echec, setEchec] = useState(true)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ConfirmDialog
        titre="Supprimer le dossier"
        description="Le dossier « Étude 2026-14 » et ses 3 documents seront supprimés définitivement."
        libelleConfirmer="Supprimer"
        onConfirmer={() => attendre(echec)}
        declencheur={<Button variant="destructive">Supprimer…</Button>}
      />
      <ConfirmDialog
        titre="Supprimer 14 éléments"
        description="Les éléments sélectionnés seront supprimés définitivement."
        libelleConfirmer="Supprimer définitivement"
        saisie={{
          attendu: "14",
          libelle: "Saisissez en chiffres le nombre d'éléments à supprimer",
          messageErreur: "Ce n'est pas le nombre d'éléments sélectionnés.",
          numerique: true,
        }}
        onConfirmer={() => attendre(false)}
        declencheur={<Button variant="outline">Action critique…</Button>}
      />
      <Label className="font-normal">
        <Checkbox checked={echec} onCheckedChange={setEchec} />« Supprimer… »
        échoue (à chaque essai)
      </Label>
    </div>
  )
}

/**
 * Suppression en deux temps : le serveur refuse d'abord (« confirmation
 * requise », des éléments liés seraient touchés) ; l'action renvoie `false`,
 * le dialogue reste ouvert sans erreur et pose la question renforcée.
 */
function DemoDeuxTemps() {
  const [conflit, setConflit] = useState(false)
  return (
    <ConfirmDialog
      titre="Supprimer le groupe"
      description={
        conflit
          ? "Ce groupe est rattaché à 14 membres : ces rattachements seront supprimés aussi."
          : "Le groupe « Trésorerie » sera supprimé définitivement."
      }
      libelleConfirmer={conflit ? "Supprimer quand même" : "Supprimer"}
      onOuvertChange={(ouvert) => {
        if (!ouvert) setConflit(false)
      }}
      onConfirmer={async () => {
        await attendre(false)
        if (conflit) return
        // Réponse 409 « confirmation requise » du serveur, simulée.
        setConflit(true)
        return false
      }}
      declencheur={
        <Button variant="outline">Suppression en deux temps…</Button>
      }
    />
  )
}

/** Après la suppression, la ligne (et sa corbeille) disparaît : le focus
 *  va au titre de la liste plutôt que de tomber sur la page. */
function DemoListe() {
  const [groupes, setGroupes] = useState(["Bureau", "Trésorerie", "DSI"])
  const titre = useRef<HTMLHeadingElement>(null)
  return (
    <div className="flex flex-col gap-2">
      <h3 ref={titre} tabIndex={-1} className="text-sm font-medium">
        Groupes ({groupes.length})
      </h3>
      <ul className="flex flex-col gap-1">
        {groupes.map((nom) => (
          <li key={nom} className="flex items-center gap-2 text-sm">
            {nom}
            <DeleteButton
              libelle={`le groupe ${nom}`}
              confirmation={{
                description: `Le groupe « ${nom} » sera supprimé.`,
              }}
              finalFocus={titre}
              onSupprimer={async () => {
                await attendre(false)
                setGroupes((liste) => liste.filter((g) => g !== nom))
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function DemoFormulaire() {
  return (
    <FormDialog
      titre="Nouveau groupe"
      description="Le groupe sera créé vide."
      libelleEnvoyer="Créer"
      onEnvoyer={(event) => {
        const nom = new FormData(event.currentTarget).get("nom")
        return attendre(nom === "erreur")
      }}
      declencheur={
        <Button>
          <PlusIcon data-icon="inline-start" />
          Nouveau groupe
        </Button>
      }
    >
      <Field>
        <FieldLabel htmlFor="atelier-groupe">
          Nom (« erreur » pour voir l'échec)
        </FieldLabel>
        <Input id="atelier-groupe" name="nom" required />
      </Field>
    </FormDialog>
  )
}

function Bombe(): ReactNode {
  throw new Error("Rendu impossible : donnée inattendue")
}

function DemoErrorBoundary() {
  const [casse, setCasse] = useState(false)
  return casse ? (
    <ErrorBoundary portee="cet encadré">
      <Bombe />
    </ErrorBoundary>
  ) : (
    <Button variant="outline" onClick={() => setCasse(true)}>
      Provoquer une erreur de rendu
    </Button>
  )
}

function DemoBascule() {
  const [actif, setActif] = useState(true)
  const [enCours, setEnCours] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <IconToggle
        actif={actif}
        enCours={enCours}
        onActifChange={async (suivant) => {
          setEnCours(true)
          await attendre(false)
          setActif(suivant)
          setEnCours(false)
        }}
        icone={LockIcon}
        libelle="Groupe critique"
        infobulles={{
          activer: "Marquer ce groupe comme critique",
          desactiver: "Retirer le marqueur critique",
        }}
      />
      <IconToggle
        actif
        onActifChange={() => {}}
        icone={LockIcon}
        libelle="Droit critique"
        verrou="Indispensable à l'application : marqueur permanent"
      />
    </div>
  )
}

function DemoBadges() {
  const [groupes, setGroupes] = useState(["Bureau", "Trésorerie", "Pôle info"])
  const [enCours, setEnCours] = useState<string | null>(null)
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Groupes du membre">
      {groupes.map((groupe) => (
        <li key={groupe}>
          <RemovableBadge
            libelleRetirer={`Retirer le groupe ${groupe}`}
            enCours={enCours === groupe}
            onRetirer={async () => {
              setEnCours(groupe)
              await attendre(false)
              setGroupes((g) => g.filter((x) => x !== groupe))
              setEnCours(null)
            }}
          >
            {groupe}
          </RemovableBadge>
        </li>
      ))}
      <li>
        <RemovableBadge
          libelleRetirer="Retirer *"
          verrou="Le joker du superadministrateur est indétachable"
          onRetirer={() => {}}
          className="font-mono"
        >
          *
        </RemovableBadge>
      </li>
      <li>
        <ExplainedBadge explication="Groupe imposé par le poste « Trésorier » : il ne peut pas être retiré manuellement.">
          <Badge variant="outline" size="lg">
            Comptabilité
            <LockIcon className="text-muted-foreground" aria-hidden />
          </Badge>
        </ExplainedBadge>
      </li>
    </ul>
  )
}

function DemoSaveBar() {
  const [nom, setNom] = useState("Ada")
  const [enregistreSous, setEnregistreSous] = useState("Ada")
  const [enCours, setEnCours] = useState(false)
  const [enregistre, setEnregistre] = useState(false)
  const modifie = nom !== enregistreSous
  const envoyer = async () => {
    setEnCours(true)
    await attendre(false)
    setEnregistreSous(nom)
    setEnCours(false)
    setEnregistre(true)
  }
  return (
    <form
      className="flex max-w-md flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void envoyer()
      }}
    >
      <Field>
        <FieldLabel htmlFor="demo-save-bar-nom">Prénom</FieldLabel>
        <Input
          id="demo-save-bar-nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
      </Field>
      <SaveBar
        enCours={enCours}
        desactive={!modifie || !nom.trim()}
        enregistre={enregistre}
        modifie={modifie}
        onAnnuler={modifie ? () => setNom(enregistreSous) : undefined}
      />
      <SaveBar
        collante
        modifie={modifie}
        enCours={enCours}
        desactive={!modifie || !nom.trim()}
        enregistre={enregistre}
        onEnregistrer={() => void envoyer()}
      />
    </form>
  )
}

const REQUETES: Record<string, QueryBoundaryRequete<string[]>> = {
  chargement: { data: undefined, error: null, isError: false, isLoading: true },
  erreur: {
    data: undefined,
    error: new Error("Serveur injoignable"),
    isError: true,
    isLoading: false,
  },
  vide: { data: [], error: null, isError: false, isLoading: false },
  données: {
    data: ["Bureau", "Trésorerie"],
    error: null,
    isError: false,
    isLoading: false,
  },
  // Nouvelle tentative en arrière-plan échouée : les données restent.
  "données et erreur": {
    data: ["Bureau", "Trésorerie"],
    error: new Error("Actualisation impossible"),
    isError: true,
    isLoading: false,
  },
}

function DemoQueryBoundary() {
  const [etat, setEtat] = useState("chargement")
  // « Réessayer » : la nouvelle tentative échoue après un délai.
  const [enCours, setEnCours] = useState(false)
  const requete = {
    ...REQUETES[etat],
    isFetching: enCours,
    refetch: async () => {
      setEnCours(true)
      await new Promise((r) => setTimeout(r, 1200))
      setEnCours(false)
    },
  }
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="État" className="flex flex-wrap gap-2">
        {Object.keys(REQUETES).map((nom) => (
          <Button
            key={nom}
            size="sm"
            variant={etat === nom ? "default" : "outline"}
            aria-pressed={etat === nom}
            onClick={() => setEtat(nom)}
          >
            {nom}
          </Button>
        ))}
      </div>
      <QueryBoundary
        requete={requete}
        vide="Aucun groupe."
        squelette={<SkeletonTable lignes={2} colonnes={3} />}
      >
        {(groupes) => <p className="text-sm">{groupes.join(", ")}</p>}
      </QueryBoundary>
    </div>
  )
}

function DemoSlider() {
  const [zoom, setZoom] = useState(1.5)
  const [plage, setPlage] = useState([20, 80])
  return (
    <div className="flex max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span id="atelier-zoom">Zoom</span>
          <span className="text-muted-foreground tabular-nums">
            {zoom.toFixed(1)}×
          </span>
        </div>
        <Slider
          aria-labelledby="atelier-zoom"
          value={zoom}
          onValueChange={(valeur) => setZoom(valeur as number)}
          min={1}
          max={3}
          step={0.1}
        />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span id="atelier-plage">Budget (k€)</span>
          <span className="text-muted-foreground tabular-nums">
            {plage[0]} à {plage[1]}
          </span>
        </div>
        <Slider
          aria-labelledby="atelier-plage"
          value={plage}
          onValueChange={(valeur) => setPlage(valeur as number[])}
        />
      </div>
    </div>
  )
}

export const RETOURS: { id: string; titre: string; rendu: () => ReactNode }[] =
  [
    {
      id: "confirm-dialog",
      titre: "ConfirmDialog, DeleteButton",
      rendu: () => (
        <div className="flex flex-col gap-4">
          <DemoConfirmation />
          <DemoDeuxTemps />
          <div className="flex items-center gap-2">
            <DeleteButton
              libelle="ce groupe"
              confirmation={{
                description:
                  "Le groupe « Bureau » et ses 4 rattachements seront supprimés.",
              }}
              onSupprimer={() => attendre(false)}
            />
            <DeleteButton
              libelle="ce groupe"
              verrou="Groupe protégé : suppression impossible"
              confirmation={{ description: "" }}
              onSupprimer={() => {}}
            />
            <DeleteButton
              avecTexte
              libelle="cette fiche"
              confirmation={{
                description: "La fiche sera supprimée définitivement.",
              }}
              onSupprimer={() => attendre(false)}
            />
          </div>
          <DemoListe />
        </div>
      ),
    },
    { id: "form-dialog", titre: "FormDialog", rendu: () => <DemoFormulaire /> },
    {
      id: "page-header",
      titre: "PageHeader, DetailHeader",
      rendu: () => (
        <div className="flex flex-col gap-8">
          <PageHeader
            titre="Groupes"
            description="Les groupes de droits de l'association."
            actions={
              <Button>
                <PlusIcon data-icon="inline-start" />
                Nouveau groupe
              </Button>
            }
          />
          <DetailHeader
            chemin={[{ libelle: "Groupes", href: "#page-header" }]}
            titre="Bureau"
            badges={<StatusBadge ton="success">Actif</StatusBadge>}
            meta="bureau · créé le 3 septembre 2026"
            actions={
              <Button variant="outline">
                <PencilIcon data-icon="inline-start" />
                Modifier
              </Button>
            }
            actionsSecondaires={[
              {
                libelle: "Archiver",
                onChoisir: () => {},
                verrou: "Un groupe critique ne s'archive pas",
              },
              { libelle: "Supprimer", onChoisir: () => {}, destructif: true },
            ]}
          />
          <DetailHeader
            compact
            chemin={[{ libelle: "Comptes", href: "#page-header" }]}
            titre="Ada Lovelace"
            actions={
              <Button variant="outline" size="sm">
                Modifier
              </Button>
            }
          />
        </div>
      ),
    },
    {
      id: "section-card",
      titre: "SectionCard, DetailList",
      rendu: () => (
        <SectionCard
          titre="Identité"
          description="Informations du profil."
          actions={
            <TooltipButton
              variant="ghost"
              size="icon-sm"
              aria-label="Modifier l'identité"
              infobulle="Modifier l'identité"
            >
              <PencilIcon />
            </TooltipButton>
          }
        >
          <DetailList>
            <DetailItem libelle="Adresse">
              <span className="inline-flex items-center gap-1">
                ada@example.org
                <CopyButton
                  valeur="ada@example.org"
                  libelle="Copier l'adresse"
                  variant="ghost"
                  size="icon-xs"
                />
              </span>
            </DetailItem>
            <DetailItem libelle="Téléphone">{null}</DetailItem>
            <DetailItem libelle="Promotion">2027</DetailItem>
          </DetailList>
        </SectionCard>
      ),
    },
    {
      id: "error-banner",
      titre: "ErrorBanner, ErrorBoundary",
      rendu: () => (
        <div className="flex flex-col gap-4">
          <ErrorBanner
            erreur={{
              message: "Requête invalide",
              code: "VALIDATION",
              details: { champ: "email", motif: "déjà utilisé" },
            }}
            onReessayer={() => {}}
          />
          <DemoErrorBoundary />
        </div>
      ),
    },
    {
      id: "alert-variantes",
      titre: "Alert : variantes",
      rendu: () => (
        <div className="flex flex-col gap-3">
          <Alert variant="info">
            <InfoIcon />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              Le secret ne sera affiché qu'une seule fois.
            </AlertDescription>
          </Alert>
          <Alert variant="success">
            <CircleCheckIcon />
            <AlertTitle>Sauvegardes à jour</AlertTitle>
            <AlertDescription>Dernière il y a 2 heures.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <TriangleAlertIcon />
            <AlertTitle>Attention</AlertTitle>
            <AlertDescription>
              La dernière sauvegarde date de 9 jours.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Échec</AlertTitle>
            <AlertDescription>La sauvegarde n'a pas abouti.</AlertDescription>
          </Alert>
        </div>
      ),
    },
    {
      id: "empty-state",
      titre: "EmptyState, Loading, squelettes",
      rendu: () => (
        <div className="flex flex-col gap-4">
          <EmptyState
            icone={InboxIcon}
            titre="Aucun document"
            description="Les documents déposés apparaîtront ici."
            action={<Button size="sm">Déposer un document</Button>}
          />
          <Loading />
          <SkeletonCard />
          <SkeletonPage />
        </div>
      ),
    },
    {
      id: "query-boundary",
      titre: "QueryBoundary",
      rendu: () => <DemoQueryBoundary />,
    },
    {
      id: "stat-tile",
      titre: "StatTile, StatGrid, StatusBadge",
      rendu: () => (
        <div className="flex flex-col gap-4">
          <StatGrid aria-label="Résumé du serveur">
            <StatTile libelle="Membres actifs" valeur={128} />
            <StatTile
              libelle="Mises à jour"
              valeur={3}
              ton="info"
              indication="Disponibles"
            />
            <StatTile
              libelle="Sauvegardes"
              valeur="À jour"
              ton="success"
              indication="Dernière il y a 2 h"
            />
            <StatTile
              libelle="Disque"
              valeur="84 %"
              ton="warning"
              indication="Seuil d'alerte : 80 %"
            />
            <StatTile
              libelle="Certificat"
              valeur="Expiré"
              ton="destructive"
              indication="Depuis le 2 octobre"
            />
          </StatGrid>
          <div className="flex flex-wrap gap-2">
            <StatusBadge>Alumni</StatusBadge>
            <StatusBadge ton="info">Mis à jour</StatusBadge>
            <StatusBadge ton="success">Actif</StatusBadge>
            <StatusBadge ton="warning">En attente</StatusBadge>
            <StatusBadge ton="destructive">Désactivé</StatusBadge>
          </div>
        </div>
      ),
    },
    {
      id: "jauges",
      titre: "Progress : tons et épaisseur",
      rendu: () => (
        <div className="flex max-w-md flex-col gap-4">
          {(
            [
              ["Mémoire", 42, "neutral"],
              ["Disque", 84, "warning"],
              ["Fichiers", 97, "destructive"],
              ["Import", 60, "info"],
              ["Sauvegarde", 100, "success"],
            ] as const
          ).map(([libelle, valeur, ton]) => (
            <Progress
              key={libelle}
              value={valeur}
              ton={ton}
              size="lg"
              className="gap-1.5"
            >
              <ProgressLabel>{libelle}</ProgressLabel>
              <ProgressValue />
            </Progress>
          ))}
          <Progress value={30}>
            <ProgressLabel>Fine, par défaut</ProgressLabel>
          </Progress>
        </div>
      ),
    },
    {
      id: "badges",
      titre: "RemovableBadge, ExplainedBadge",
      rendu: () => <DemoBadges />,
    },
    {
      id: "save-bar",
      titre: "SaveBar",
      rendu: () => <DemoSaveBar />,
    },
    {
      id: "boutons",
      titre: "CopyButton, IconToggle, TooltipButton",
      rendu: () => (
        <div className="flex flex-wrap items-center gap-4">
          <CopyButton valeur="https://example.org" libelle="Copier le lien" />
          <CopyButton
            valeur="secret"
            libelle="Copier le secret"
            verrou="Secret déjà copié une fois"
          />
          <DemoBascule />
          <TooltipButton verrou="Droits insuffisants">Publier</TooltipButton>
        </div>
      ),
    },
    {
      id: "slider",
      titre: "Slider",
      rendu: () => <DemoSlider />,
    },
    {
      id: "auth-avatar",
      titre: "AuthAvatar, AuthImage",
      rendu: () => (
        <div className="flex items-center gap-4">
          <AuthAvatar
            size="lg"
            initiales="AL"
            src="/photos/ada"
            charger={chargerPhoto}
          />
          <AuthAvatar
            size="lg"
            initiales="AT"
            src="/photos/alan"
            charger={chargerEchec}
          />
          <AuthAvatar initiales="GH" src={null} charger={chargerEchec} />
          <AuthImage
            src="/photos/ada"
            charger={chargerPhoto}
            alt="Photo d'exemple"
            className="size-16 rounded-lg"
            secours={<div className="size-16 rounded-lg bg-muted" />}
          />
        </div>
      ),
    },
  ]
