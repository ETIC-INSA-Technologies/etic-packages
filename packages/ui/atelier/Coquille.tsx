// Démonstrations « coquille et fiches » : replis, écran centré, fiche
// introuvable, bandeau d'une requête, avatar de diamètre libre, onglets.
import { useState, type ReactNode } from "react"
import {
  ChevronRightIcon,
  CircleUserIcon,
  FileSearchIcon,
  LayoutTemplateIcon,
  PanelTopIcon,
  type LucideIcon,
} from "lucide-react"

import {
  AuthAvatar,
  AuthImage,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CenteredScreen,
  Disclosure,
  QueryBoundary,
  QueryErrorBanner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type QueryBoundaryRequete,
} from "@etic-ui/index"

// Une image générée, servie comme le ferait une adresse authentifiée.
const chargerPhoto = async () => {
  await new Promise((r) => setTimeout(r, 600))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#7c9cf0"/><circle cx="32" cy="26" r="12" fill="#fff"/><rect x="14" y="42" width="36" height="22" rx="11" fill="#fff"/></svg>`
  return new Blob([svg], { type: "image/svg+xml" })
}
const chargerEchec = async () => {
  await new Promise((r) => setTimeout(r, 600))
  throw new Error("403")
}

function DemoReplis() {
  const [avance, setAvance] = useState(false)
  return (
    <div className="flex flex-col gap-6">
      <Disclosure titre="Plus de champs : contact, intégrations, notes">
        <p className="text-sm text-muted-foreground">
          Téléphone, adresse, identifiants des outils…
        </p>
      </Disclosure>

      <Disclosure
        titre="Historique des sauvegardes (12)"
        variante="discret"
        className="border-t pt-2"
        classNameDeclencheur="-ml-2 hover:text-foreground"
      >
        <p className="text-sm">Dernière copie complète : hier, 03 h 00.</p>
      </Disclosure>

      <div className="flex flex-col gap-2">
        <Disclosure
          titre="Créations"
          compteur={3}
          variante="carte"
          defautOuvert
        >
          <p className="text-sm">Ada Lovelace, Alan Turing, Grace Hopper</p>
        </Disclosure>
        <Disclosure titre="Inchangés" compteur={41} variante="carte">
          <p className="text-sm text-muted-foreground">41 membres à jour.</p>
        </Disclosure>
      </div>

      <Disclosure
        titre={avance ? "Masquer l'expression CRON" : "Expression CRON"}
        ouvert={avance}
        onOuvertChange={setAvance}
        taille="sm"
        classNameContenu="pl-5"
      >
        <code className="font-mono text-sm">0 3 * * 0</code>
      </Disclosure>
    </div>
  )
}

function DemoEcranCentre() {
  return (
    // Dans la page, une région plutôt qu'un second `<main>`.
    <CenteredScreen
      role="region"
      aria-label="Aperçu de CenteredScreen"
      className="min-h-72 rounded-lg border"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>Avec votre compte de l'association.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Continuer</Button>
        </CardContent>
      </Card>
    </CenteredScreen>
  )
}

const ERREUR_404 = Object.assign(new Error("Groupe introuvable"), {
  status: 404,
})
const ERREUR_500 = Object.assign(new Error("Le serveur ne répond pas."), {
  status: 500,
  code: "INDISPONIBLE",
})

const FICHES: Record<string, QueryBoundaryRequete<{ nom: string }>> = {
  trouvée: {
    data: { nom: "Bureau" },
    error: null,
    isError: false,
    isLoading: false,
  },
  "404": {
    data: undefined,
    error: ERREUR_404,
    isError: true,
    isLoading: false,
  },
  "500": {
    data: undefined,
    error: ERREUR_500,
    isError: true,
    isLoading: false,
  },
}

function DemoFicheIntrouvable() {
  const [etat, setEtat] = useState("404")
  const requete = { ...FICHES[etat], refetch: () => {} }
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Réponse" className="flex flex-wrap gap-2">
        {Object.keys(FICHES).map((nom) => (
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
        introuvable={
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm">
              Ce groupe n'existe pas, ou a été supprimé.
            </p>
            <Button variant="outline" size="sm">
              Retour aux groupes
            </Button>
          </div>
        }
      >
        {(groupe) => <p className="text-sm">Groupe « {groupe.nom} »</p>}
      </QueryBoundary>
      <p className="text-sm text-muted-foreground">
        Bandeau seul (<code>QueryErrorBanner</code>), données placées par la
        page :
      </p>
      <QueryErrorBanner
        requete={{ isError: true, error: ERREUR_500, refetch: () => {} }}
        description="La liste affichée date du dernier chargement réussi."
      />
    </div>
  )
}

function DemoAvatars() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <AuthAvatar
        diametre={64}
        initiales="AL"
        src="/photos/ada"
        charger={chargerPhoto}
      />
      <AuthAvatar
        diametre={64}
        initiales="AT"
        src="/photos/alan"
        charger={chargerEchec}
        className="font-semibold"
      />
      <AuthAvatar
        diametre={96}
        initiales="GH"
        src={null}
        charger={chargerEchec}
      />
      <AuthImage
        src="/fichiers/1"
        charger={chargerEchec}
        alt="Aperçu du fichier"
        className="size-24 rounded-lg"
        secours={
          <div className="flex size-24 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
            Chargement…
          </div>
        }
        secoursEchec={
          <div className="flex size-24 items-center justify-center rounded-lg border text-center text-xs text-muted-foreground">
            Aperçu indisponible
          </div>
        }
      />
    </div>
  )
}

const ONGLETS = [
  "Sauvegardes",
  "Stockage",
  "Journaux d'erreurs",
  "Métriques",
  "Tâches planifiées",
]

function DemoOnglets() {
  return (
    <Tabs defaultValue="Sauvegardes">
      <TabsList variant="line" aria-label="Serveur">
        {ONGLETS.map((nom) => (
          <TabsTrigger key={nom} value={nom}>
            {nom}
          </TabsTrigger>
        ))}
      </TabsList>
      {ONGLETS.map((nom) => (
        <TabsContent key={nom} value={nom} className="pt-2">
          Onglet « {nom} » : sur un téléphone, les onglets passent à la ligne.
        </TabsContent>
      ))}
    </Tabs>
  )
}

export const COQUILLE: {
  id: string
  titre: string
  icone: LucideIcon
  rendu: () => ReactNode
}[] = [
  {
    id: "disclosure",
    titre: "Disclosure",
    icone: ChevronRightIcon,
    rendu: () => <DemoReplis />,
  },
  {
    id: "centered-screen",
    titre: "CenteredScreen",
    icone: LayoutTemplateIcon,
    rendu: () => <DemoEcranCentre />,
  },
  {
    id: "fiche-introuvable",
    titre: "QueryBoundary introuvable, QueryErrorBanner",
    icone: FileSearchIcon,
    rendu: () => <DemoFicheIntrouvable />,
  },
  {
    id: "avatar-diametre",
    titre: "Avatar de diamètre libre, échec d'une image",
    icone: CircleUserIcon,
    rendu: () => <DemoAvatars />,
  },
  {
    id: "onglets-ligne",
    titre: "Onglets line sur téléphone",
    icone: PanelTopIcon,
    rendu: () => <DemoOnglets />,
  },
]
