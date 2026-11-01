// Démonstration de la famille « tableau de données » : une liste paginée par
// décalage, triée et filtrée comme le ferait un serveur, puis un journal à
// lignes dépliables.
import { useMemo, useRef, useState } from "react"
import { PencilIcon, TrashIcon } from "lucide-react"

import {
  Button,
  DataTable,
  DataTableBulkActions,
  DataTableCellLink,
  DataTableColumnHeader,
  DeleteButton,
  dataTableActionsColumn,
  useColumnPrefs,
  DataTablePagination,
  DataTableRowActions,
  DataTableSelectFilter,
  DataTableToolbar,
  DataTableViewOptions,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Label,
  StatusBadge,
  Switch,
  createDataTableColumnHelper,
  dataTableExpandColumn,
  dataTableSelectionColumn,
  useDataTable,
  type ColumnVisibilityState,
  type SortingState,
} from "@etic-ui/index"

interface Personne {
  id: string
  nom: string
  email: string
  ville: string
  pole: string
  statut: "actif" | "ancien"
  arrivee: string
}

const PRENOMS = [
  "Ada",
  "Alan",
  "Grace",
  "Edsger",
  "Barbara",
  "Donald",
  "Margaret",
  "Ken",
  "Radia",
  "Tim",
]
const NOMS = [
  "Lovelace",
  "Turing",
  "Hopper",
  "Dijkstra",
  "Liskov",
  "Knuth",
  "Hamilton",
  "Thompson",
  "Perlman",
  "Berners-Lee",
]
const VILLES = ["Lyon", "Paris", "Toulouse", "Rennes", "Strasbourg"]
const POLES = ["DSI", "Communication", "Trésorerie", "Qualité"]

const PERSONNES: Personne[] = Array.from({ length: 137 }, (_, i) => {
  const prenom = PRENOMS[i % PRENOMS.length]
  // Décalé à chaque dizaine : cent noms différents, pas dix répétés.
  const nom = NOMS[(i * 7 + Math.floor(i / 10)) % NOMS.length]
  // Au-delà de cent, les paires reviennent : une initiale les distingue.
  const initiale = i >= 100 ? " J." : ""
  return {
    id: String(i + 1),
    nom: `${prenom}${initiale} ${nom}`,
    email: `${prenom}.${nom}${i}@example.org`.toLowerCase(),
    ville: VILLES[(i * 3) % VILLES.length],
    pole: POLES[(i * 5) % POLES.length],
    statut: i % 6 === 0 ? "ancien" : "actif",
    arrivee: new Date(2020, i % 12, (i % 27) + 1).toLocaleDateString("fr-FR"),
  }
})

/** Le premier compte est protégé : jamais sélectionnable. */
const selectionnable = (p: Personne) => p.id !== "1"

const aide = createDataTableColumnHelper<Personne>()
const COLONNES = aide.columns([
  dataTableSelectionColumn<Personne>({
    libelleLigne: (p) => `Sélectionner ${p.nom}`,
    verrouLigne: (p) =>
      p.id === "1"
        ? "Votre propre compte ne peut pas être sélectionné."
        : undefined,
  }),
  aide.accessor("nom", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} libelle="Nom" />
    ),
    meta: { libelle: "Nom" },
    enableHiding: false,
    cell: ({ row }) => <span className="font-medium">{row.original.nom}</span>,
  }),
  aide.accessor("email", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} libelle="E-mail" />
    ),
    meta: { libelle: "E-mail" },
  }),
  aide.accessor("pole", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} libelle="Pôle" />
    ),
    meta: { libelle: "Pôle" },
  }),
  aide.accessor("ville", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} libelle="Ville" />
    ),
    meta: { libelle: "Ville" },
  }),
  aide.accessor("statut", {
    header: "Statut",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.statut === "actif" ? (
        <StatusBadge ton="success">Actif</StatusBadge>
      ) : (
        <StatusBadge>Ancien</StatusBadge>
      ),
  }),
  aide.accessor("arrivee", { header: "Arrivée", enableSorting: false }),
  aide.display({
    id: "actions",
    enableHiding: false,
    meta: { className: "w-10 text-right" },
    cell: ({ row }) => (
      <DataTableRowActions libelle={`Actions pour ${row.original.nom}`}>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <PencilIcon />
            Modifier
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <TrashIcon />
          Supprimer
        </DropdownMenuItem>
      </DataTableRowActions>
    ),
  }),
])

const PERSONNES_UNITE = { singulier: "personne", pluriel: "personnes" }

export function DemoTableaux() {
  return (
    <>
      <DemoPersonnes />
      <h3 className="mt-4 text-base font-medium">Lignes dépliables</h3>
      <p className="text-sm text-muted-foreground">
        Le chevron (ou un clic sur la ligne) affiche le détail sous la ligne,
        une ligne à la fois. Sur mobile, le détail reste dans la partie visible
        pendant que les colonnes défilent.
      </p>
      <DemoJournal />
      <h3 className="mt-4 text-base font-medium">
        Liste chargée d'un bloc (côté client)
      </h3>
      <p className="text-sm text-muted-foreground">
        Le tableau filtre, trie et découpe lui-même la liste : recherche sans
        accents, tri alphabétique français, colonnes gardées dans le navigateur.
        Supprimer une ligne rend le focus à la ligne suivante.
      </p>
      <DemoPostes />
    </>
  )
}

interface Poste {
  id: string
  nom: string
  pole: string
  places: number
}

const POSTES: Poste[] = Array.from({ length: 42 }, (_, i) => ({
  id: `p${i + 1}`,
  nom: `${["Chargé", "Responsable", "Élève"][i % 3]} ${POLES[i % POLES.length]} ${i + 1}`,
  pole: POLES[i % POLES.length],
  places: (i % 4) + 1,
}))

const aidePostes = createDataTableColumnHelper<Poste>()

function DemoPostes() {
  const [postes, setPostes] = useState(POSTES)
  const [recherche, setRecherche] = useState("")
  const [pole, setPole] = useState<string | null>(null)
  const [enErreur, setEnErreur] = useState(false)
  const colonnesPrefs = useColumnPrefs({
    cle: "atelier:postes",
    colonnes: ["pole", "places"],
    visiblesParDefaut: ["pole", "places"],
    fixesEnTete: ["nom"],
  })
  const colonnes = useMemo(
    () =>
      aidePostes.columns([
        aidePostes.accessor("nom", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} libelle="Poste" />
          ),
          meta: { libelle: "Poste" },
          sortFn: "texteFr",
          enableHiding: false,
          cell: ({ row }) => (
            <DataTableCellLink onClick={() => {}}>
              {row.original.nom}
            </DataTableCellLink>
          ),
        }),
        aidePostes.accessor("pole", {
          header: "Pôle",
          filterFn: "equalsString",
        }),
        aidePostes.accessor("places", { header: "Places" }),
        dataTableActionsColumn<Poste>({
          actions: (p) => (
            <DeleteButton
              libelle={`le poste ${p.nom}`}
              confirmation={{
                description: `Le poste ${p.nom} sera supprimé définitivement.`,
              }}
              onSupprimer={() =>
                setPostes((avant) => avant.filter((x) => x.id !== p.id))
              }
            />
          ),
        }),
      ]),
    []
  )
  // Le filtre du pôle reste à la page (Select contrôlé) ; le tableau
  // l'applique.
  const filtresColonnes = useMemo(
    () => (pole ? [{ id: "pole", value: pole }] : []),
    [pole]
  )
  const table = useDataTable({
    donnees: enErreur ? AUCUN_POSTE : postes,
    colonnes,
    idLigne: (p) => p.id,
    paginationClient: true,
    filtreGlobal: recherche,
    onFiltreGlobalChange: setRecherche,
    filtresColonnes,
    ...colonnesPrefs.optionsTableau,
  })
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Switch
          id="atelier-erreur"
          checked={enErreur}
          onCheckedChange={setEnErreur}
        />
        <Label htmlFor="atelier-erreur">Requête en échec</Label>
      </div>
      <DataTableToolbar
        recherche={{
          valeur: recherche,
          onValeurChange: setRecherche,
          placeholder: "Poste, pôle…",
        }}
        filtres={
          <DataTableSelectFilter
            libelle="Filtrer par pôle"
            valeur={pole}
            onValeurChange={setPole}
            options={POLES.map((p) => ({ valeur: p, libelle: p }))}
            libelleTous="Tous les pôles"
          />
        }
        filtresActifs={pole ? 1 : 0}
        onReinitialiser={() => setPole(null)}
        compteur={{ table, unite: { singulier: "poste", pluriel: "postes" } }}
      >
        <DataTableViewOptions table={table} />
      </DataTableToolbar>
      <DataTable
        table={table}
        libelle="Postes"
        requete={{
          isError: enErreur,
          error: enErreur
            ? new Error("Les postes n'ont pas pu être chargés.")
            : null,
          refetch: () => setEnErreur(false),
        }}
        vide="Aucun poste ne correspond à ces critères."
      />
      <DataTablePagination table={table} />
    </div>
  )
}

const AUCUN_POSTE: Poste[] = []

function DemoPersonnes() {
  const [recherche, setRecherche] = useState("")
  const [statut, setStatut] = useState<string | null>(null)
  const [pole, setPole] = useState<string | null>(null)
  const [tri, setTri] = useState<SortingState>([{ id: "nom", desc: false }])
  const [visibilite, setVisibilite] = useState<ColumnVisibilityState>({
    arrivee: false,
  })
  const [decalage, setDecalage] = useState(0)
  const [limite, setLimite] = useState(10)
  const [chargement, setChargement] = useState(false)
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [toutSelectionne, setToutSelectionne] = useState(false)

  // Ce que ferait le serveur : filtre, tri, puis la page demandée.
  const resultats = useMemo(() => {
    const texte = recherche.trim().toLowerCase()
    const filtres = PERSONNES.filter(
      (p) =>
        (!texte || `${p.nom} ${p.email}`.toLowerCase().includes(texte)) &&
        (!statut || p.statut === statut) &&
        (!pole || p.pole === pole)
    )
    const [critere] = tri
    if (critere) {
      const cle = critere.id as keyof Personne
      filtres.sort(
        (a, b) => a[cle].localeCompare(b[cle], "fr") * (critere.desc ? -1 : 1)
      )
    }
    return filtres
  }, [recherche, statut, pole, tri])
  const page = useMemo(
    () => (chargement ? [] : resultats.slice(decalage, decalage + limite)),
    [resultats, decalage, limite, chargement]
  )

  const table = useDataTable({
    donnees: page,
    colonnes: COLONNES,
    idLigne: (p) => p.id,
    tri,
    onTriChange: (maj) => {
      setTri(maj)
      setDecalage(0)
      setToutSelectionne(false)
    },
    triManuel: true,
    visibiliteColonnes: visibilite,
    onVisibiliteColonnesChange: setVisibilite,
    ligneSelectionnable: selectionnable,
    // Tout sélectionner : l'application enverrait ses filtres au serveur.
    // `total` ne compte que les éléments sélectionnables : c'est le nombre
    // annoncé (« Sélectionner les N personnes ») et visé par l'action.
    total: resultats.filter(selectionnable).length,
    toutSelectionne,
    onToutSelectionneChange: setToutSelectionne,
  })

  const filtrer = (changer: () => void) => {
    changer()
    setDecalage(0)
    setToutSelectionne(false)
  }
  // Le bouton de l'état vide disparaît avec lui : le focus passe d'abord au
  // champ de recherche.
  const conteneurRef = useRef<HTMLDivElement>(null)
  const reinitialiser = () => {
    conteneurRef.current
      ?.querySelector<HTMLElement>('input[type="search"]')
      ?.focus()
    filtrer(() => {
      setRecherche("")
      setStatut(null)
      setPole(null)
    })
  }

  return (
    <div ref={conteneurRef} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Switch
          id="atelier-chargement"
          checked={chargement}
          onCheckedChange={setChargement}
        />
        <Label htmlFor="atelier-chargement">Chargement</Label>
      </div>
      <DataTableToolbar
        recherche={{
          valeur: recherche,
          onValeurChange: (v) => filtrer(() => setRecherche(v)),
          placeholder: "Nom, e-mail…",
        }}
        filtres={
          <>
            <DataTableSelectFilter
              libelle="Filtrer par statut"
              valeur={statut}
              onValeurChange={(v) => filtrer(() => setStatut(v))}
              options={[
                { valeur: "actif", libelle: "Actif" },
                { valeur: "ancien", libelle: "Ancien" },
              ]}
              libelleTous="Tous les statuts"
            />
            <DataTableSelectFilter
              libelle="Filtrer par pôle"
              valeur={pole}
              onValeurChange={(v) => filtrer(() => setPole(v))}
              options={POLES.map((p) => ({ valeur: p, libelle: p }))}
              libelleTous="Tous les pôles"
            />
          </>
        }
        filtresActifs={[statut, pole].filter(Boolean).length}
        onReinitialiser={() =>
          filtrer(() => {
            setStatut(null)
            setPole(null)
          })
        }
        compteur={{
          total: resultats.length,
          decalage,
          nombre: page.length,
          unite: PERSONNES_UNITE,
          feminin: true,
        }}
      >
        <DataTableViewOptions table={table} />
      </DataTableToolbar>
      <DataTable
        table={table}
        libelle="Personnes"
        enChargement={chargement}
        lignesChargement={limite}
        vide={
          <div className="flex flex-col items-center gap-2">
            <p>Aucune personne ne correspond à ces critères.</p>
            <Button variant="outline" size="sm" onClick={reinitialiser}>
              Réinitialiser les filtres
            </Button>
          </div>
        }
        onActiverLigne={(p) => setOuverte(p.nom)}
        unite={PERSONNES_UNITE}
        feminin
      />
      <DataTablePagination
        total={resultats.length}
        decalage={decalage}
        limite={limite}
        onDecalageChange={setDecalage}
        onLimiteChange={setLimite}
      />
      {ouverte ? (
        <p className="text-sm text-muted-foreground">
          Ligne ouverte : {ouverte}
        </p>
      ) : null}
      <DataTableBulkActions table={table} unite={PERSONNES_UNITE} feminin>
        <Button size="sm" variant="destructive">
          <TrashIcon data-icon="inline-start" />
          Supprimer
        </Button>
      </DataTableBulkActions>
    </div>
  )
}

interface Evenement {
  id: string
  date: string
  acteur: string
  action: string
  ressource: string
  avant: Record<string, unknown> | null
  apres: Record<string, unknown> | null
  navigateur: string
}

const EVENEMENTS: Evenement[] = [
  {
    id: "e1",
    date: "31/10/2026 09:12",
    acteur: "Ada Lovelace",
    action: "Membre modifié",
    ressource: "Grace Hopper",
    avant: { pole: "DSI", telephone: null },
    apres: { pole: "Qualité", telephone: "+33 6 12 34 56 78" },
    navigateur: "Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0",
  },
  {
    id: "e2",
    date: "30/10/2026 17:45",
    acteur: "Alan Turing",
    action: "Groupe créé",
    ressource: "Trésorerie",
    avant: null,
    apres: { nom: "Trésorerie", critique: false },
    navigateur: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) Safari/18.0",
  },
  {
    id: "e3",
    date: "30/10/2026 11:03",
    acteur: "Système",
    action: "Sauvegarde",
    ressource: "Base de données",
    avant: null,
    apres: null,
    navigateur: "—",
  },
  {
    id: "e4",
    date: "29/10/2026 08:30",
    acteur: "Grace Hopper",
    action: "Droit retiré",
    ressource: "Edsger Dijkstra",
    avant: { droits: ["membres.lire", "membres.modifier"] },
    apres: { droits: ["membres.lire"] },
    navigateur: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0",
  },
]

const aideJournal = createDataTableColumnHelper<Evenement>()
const COLONNES_JOURNAL = aideJournal.columns([
  dataTableExpandColumn<Evenement>({
    libelleLigne: (e) => `Détail de « ${e.action} » du ${e.date}`,
  }),
  aideJournal.accessor("date", { header: "Date" }),
  aideJournal.accessor("acteur", { header: "Acteur" }),
  aideJournal.accessor("action", { header: "Action" }),
  aideJournal.accessor("ressource", { header: "Ressource" }),
])

/** Une sauvegarde automatique n'a rien à montrer : pas de chevron. */
const depliable = (e: Evenement) => e.avant !== null || e.apres !== null

function DetailEvenement({ evenement }: { evenement: Evenement }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["Ancienne valeur", evenement.avant],
            ["Nouvelle valeur", evenement.apres],
          ] as const
        ).map(([titre, valeur]) => (
          <div key={titre} className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {titre}
            </span>
            <pre className="overflow-x-auto rounded-md bg-background p-2 font-mono text-xs">
              {JSON.stringify(valeur ?? {}, null, 2)}
            </pre>
          </div>
        ))}
      </div>
      <p className="break-words text-muted-foreground">
        Navigateur : {evenement.navigateur}
      </p>
    </div>
  )
}

function DemoJournal() {
  const table = useDataTable({
    donnees: EVENEMENTS,
    colonnes: COLONNES_JOURNAL,
    idLigne: (e) => e.id,
    ligneDepliable: depliable,
    uneSeuleLigneDepliee: true,
  })
  return (
    <DataTable
      table={table}
      libelle="Journal"
      rendreDetail={(e) => <DetailEvenement evenement={e} />}
    />
  )
}
