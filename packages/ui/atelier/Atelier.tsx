// Page d'atelier : chaque composant de la bibliothèque, dans ses variantes,
// importé comme le ferait une application.
import { useEffect, useState, type ReactNode } from "react"
import {
  BellIcon,
  BoldIcon,
  BoxIcon,
  CalendarDaysIcon,
  ChartColumnIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CircleUserIcon,
  CombineIcon,
  CreditCardIcon,
  EllipsisIcon,
  FormInputIcon,
  HeadingIcon,
  HourglassIcon,
  InboxIcon,
  InfoIcon,
  ItalicIcon,
  KeyboardIcon,
  LayersIcon,
  LayoutListIcon,
  LayoutTemplateIcon,
  ListChecksIcon,
  ListFilterIcon,
  MessageSquareIcon,
  MousePointerClickIcon,
  NavigationIcon,
  OctagonAlertIcon,
  PackageOpenIcon,
  PaletteIcon,
  PanelsTopLeftIcon,
  PanelTopIcon,
  PaperclipIcon,
  RefreshCwIcon,
  SaveIcon,
  ScrollTextIcon,
  SearchIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  SquareCheckIcon,
  SquareIcon,
  Table2Icon,
  TagIcon,
  TextCursorInputIcon,
  ToggleLeftIcon,
  TriangleAlertIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
  AppShell,
  Badge,
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  ButtonGroup,
  Calendar,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
  Kbd,
  KbdGroup,
  Label,
  NativeSelect,
  NativeSelectOption,
  PageContainer,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  type ThemePreference,
} from "@etic-ui/index"
import { BOUTONS } from "./Boutons"
import { COQUILLE } from "./Coquille"
import { DemoTableaux } from "./DemoTableaux"
import { FORMULAIRES } from "./Formulaires"
import { RETOURS } from "./Retours"

const POLES = [
  { value: "dsi", label: "DSI" },
  { value: "communication", label: "Communication" },
  { value: "tresorerie", label: "Trésorerie" },
]
const VILLES = ["Lyon", "Paris", "Toulouse", "Rennes", "Strasbourg"]

// Démonstrations sommaires des primitives shadcn, une section chacune.
const PRIMITIVES: { id: string; titre: string; rendu: () => ReactNode }[] = [
  {
    id: "alert",
    titre: "Alert",
    rendu: () => (
      <Alert>
        <InfoIcon />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>
          Les modifications sont enregistrées.
        </AlertDescription>
      </Alert>
    ),
  },
  {
    id: "badge",
    titre: "Badge",
    rendu: () => (
      <div className="flex flex-wrap gap-2">
        {(
          [
            "default",
            "secondary",
            "outline",
            "destructive",
            "ghost",
            "link",
          ] as const
        ).map((variante) => (
          <Badge key={variante} variant={variante}>
            {variante}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    id: "breadcrumb",
    titre: "Breadcrumb",
    rendu: () => (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#breadcrumb">Accueil</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Fiche</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  },
  {
    id: "button-group",
    titre: "ButtonGroup",
    rendu: () => (
      <ButtonGroup>
        <Button variant="outline" size="icon" aria-label="Gras">
          <BoldIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label="Italique">
          <ItalicIcon />
        </Button>
      </ButtonGroup>
    ),
  },
  {
    id: "calendar",
    titre: "Calendar",
    rendu: () => <Calendar mode="single" className="rounded-lg border" />,
  },
  {
    id: "card",
    titre: "Card",
    rendu: () => (
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Titre</CardTitle>
          <CardDescription>Description de la carte.</CardDescription>
        </CardHeader>
        <CardContent>Contenu.</CardContent>
        <CardFooter>
          <Button>Valider</Button>
        </CardFooter>
      </Card>
    ),
  },
  {
    id: "checkbox",
    titre: "Checkbox, RadioGroup, Switch",
    rendu: () => (
      <div className="flex flex-col gap-4">
        <Label>
          <Checkbox defaultChecked /> Accepter
        </Label>
        <RadioGroup defaultValue="a">
          <Label>
            <RadioGroupItem value="a" /> Option A
          </Label>
          <Label>
            <RadioGroupItem value="b" /> Option B
          </Label>
        </RadioGroup>
        <Label>
          <Switch /> Notifications
        </Label>
      </div>
    ),
  },
  {
    id: "collapsible",
    titre: "Collapsible",
    rendu: () => (
      <Collapsible className="flex flex-col gap-2">
        <CollapsibleTrigger render={<Button variant="outline" />}>
          Détails <ChevronsUpDownIcon />
        </CollapsibleTrigger>
        <CollapsibleContent className="text-sm">
          Contenu dévoilé.
        </CollapsibleContent>
      </Collapsible>
    ),
  },
  {
    id: "combobox",
    titre: "Combobox",
    rendu: () => (
      <Combobox items={VILLES}>
        <Field className="max-w-xs">
          <FieldLabel htmlFor="atelier-ville">Ville</FieldLabel>
          <ComboboxInput id="atelier-ville" placeholder="Choisir une ville" />
        </Field>
        <ComboboxContent>
          <ComboboxEmpty>Aucun résultat.</ComboboxEmpty>
          <ComboboxList>
            {(ville: string) => (
              <ComboboxItem key={ville} value={ville}>
                {ville}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    ),
  },
  {
    id: "dialog",
    titre: "Dialog",
    rendu: () => (
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Ouvrir
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Titre</DialogTitle>
            <DialogDescription>Description du dialogue.</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    ),
  },
  {
    id: "empty",
    titre: "Empty",
    rendu: () => (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InboxIcon />
          </EmptyMedia>
          <EmptyTitle>Aucun élément</EmptyTitle>
          <EmptyDescription>Rien à afficher pour le moment.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    ),
  },
  {
    id: "field",
    titre: "Field, Input, Textarea, InputGroup",
    rendu: () => (
      <div className="flex max-w-sm flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="atelier-nom">Nom</FieldLabel>
          <Input id="atelier-nom" />
          <FieldDescription>Tel qu'il apparaîtra.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="atelier-note">Note</FieldLabel>
          <Textarea id="atelier-note" />
        </Field>
        <InputGroup>
          <InputGroupInput placeholder="Rechercher" aria-label="Rechercher" />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>
    ),
  },
  {
    id: "item",
    titre: "Item",
    rendu: () => (
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Élément</ItemTitle>
          <ItemDescription>Une ligne de description.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm">
            Action
          </Button>
        </ItemActions>
      </Item>
    ),
  },
  {
    id: "kbd",
    titre: "Kbd, Spinner",
    rendu: () => (
      <div className="flex items-center gap-4">
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>B</Kbd>
        </KbdGroup>
        <Spinner />
      </div>
    ),
  },
  {
    id: "pagination",
    titre: "Pagination",
    rendu: () => (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#pagination" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#pagination">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#pagination" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#pagination" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    ),
  },
  {
    id: "popover",
    titre: "Popover",
    rendu: () => (
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          Ouvrir
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Titre</PopoverTitle>
            <PopoverDescription>Contenu du popover.</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    ),
  },
  {
    id: "progress",
    titre: "Progress",
    rendu: () => <Progress value={60} aria-label="Avancement" />,
  },
  {
    id: "scroll-area",
    titre: "ScrollArea",
    rendu: () => (
      <ScrollArea className="h-32 max-w-xs rounded-lg border">
        <div className="p-3 text-sm">
          {Array.from({ length: 20 }, (_, i) => (
            <p key={i}>Ligne {i + 1}</p>
          ))}
        </div>
      </ScrollArea>
    ),
  },
  {
    id: "select",
    titre: "Select, NativeSelect",
    rendu: () => (
      <div className="flex flex-wrap gap-4">
        <Select items={POLES}>
          <SelectTrigger className="w-48" aria-label="Pôle">
            <SelectValue placeholder="Pôle" />
          </SelectTrigger>
          <SelectContent>
            {POLES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <NativeSelect aria-label="Pôle (natif)">
          {POLES.map(({ value, label }) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    ),
  },
  {
    id: "table",
    titre: "Table",
    rendu: () => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Pôle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada Lovelace</TableCell>
            <TableCell>DSI</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Alan Turing</TableCell>
            <TableCell>Trésorerie</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
  {
    id: "tabs",
    titre: "Tabs",
    rendu: () => (
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Profil</TabsTrigger>
          <TabsTrigger value="b">Droits</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Onglet profil.</TabsContent>
        <TabsContent value="b">Onglet droits.</TabsContent>
      </Tabs>
    ),
  },
]

// Une icône par section de la barre latérale : repliée, elle reste lisible.
const ICONES: Record<string, LucideIcon> = {
  alert: TriangleAlertIcon,
  badge: TagIcon,
  breadcrumb: NavigationIcon,
  "button-group": CombineIcon,
  calendar: CalendarDaysIcon,
  card: CreditCardIcon,
  checkbox: SquareCheckIcon,
  collapsible: ChevronsDownUpIcon,
  combobox: ListFilterIcon,
  dialog: MessageSquareIcon,
  empty: InboxIcon,
  field: FormInputIcon,
  item: LayoutListIcon,
  kbd: KeyboardIcon,
  pagination: EllipsisIcon,
  popover: PanelTopIcon,
  progress: HourglassIcon,
  "scroll-area": ScrollTextIcon,
  select: ListChecksIcon,
  table: Table2Icon,
  tabs: PanelsTopLeftIcon,
  formulaire: TextCursorInputIcon,
  choix: ToggleLeftIcon,
  fichiers: PaperclipIcon,
  brouillon: SaveIcon,
  "confirm-dialog": OctagonAlertIcon,
  "page-header": HeadingIcon,
  "section-card": LayoutTemplateIcon,
  "error-banner": BellIcon,
  "alert-variantes": LayersIcon,
  "empty-state": PackageOpenIcon,
  "query-boundary": RefreshCwIcon,
  "stat-tile": ChartColumnIcon,
  boutons: MousePointerClickIcon,
  slider: SlidersHorizontalIcon,
  "auth-avatar": CircleUserIcon,
}
const icone = (id: string) => ICONES[id] ?? SquareIcon

/** Démonstrations groupées : une rubrique de navigation chacune, et leurs
 *  sections dans la page. */
const GROUPES: {
  titre: string
  demos: {
    id: string
    titre: string
    icone?: LucideIcon
    rendu: () => ReactNode
  }[]
}[] = [
  { titre: "Retours et mise en page", demos: RETOURS },
  { titre: "Coquille et fiches", demos: COQUILLE },
]

const VARIANTES = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const
const TAILLES = ["xs", "sm", "default", "lg"] as const

// Contrats d'accent définis dans accents.css ; « aucun » = gris de Nova.
const ACCENTS = [
  { id: "", nom: "Aucun" },
  { id: "members", nom: "ETIC Members" },
  { id: "docs", nom: "ETIC Docs" },
  { id: "intervenant", nom: "Intervenant" },
  { id: "browser", nom: "Browser" },
] as const

const SEMANTIQUES = [
  {
    nom: "destructive",
    texte: "text-destructive",
    teinte: "bg-destructive/10",
  },
  { nom: "success", texte: "text-success", teinte: "bg-success/10" },
  { nom: "warning", texte: "text-warning", teinte: "bg-warning/10" },
  { nom: "info", texte: "text-info", teinte: "bg-info/10" },
  { nom: "primary-text", texte: "text-primary-text", teinte: "bg-primary/10" },
] as const

export function Atelier() {
  const [accent, setAccent] =
    useState<(typeof ACCENTS)[number]["id"]>("members")

  const [theme, setTheme] = useState<ThemePreference>("system")
  const [section, setSection] = useState(() => location.hash || "#button")

  useEffect(() => {
    const racine = document.documentElement
    if (accent) racine.dataset.accent = accent
    else delete racine.dataset.accent
  }, [accent])

  useEffect(() => {
    const systeme = window.matchMedia("(prefers-color-scheme: dark)")
    const appliquer = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && systeme.matches)
      )
    appliquer()
    systeme.addEventListener("change", appliquer)
    return () => systeme.removeEventListener("change", appliquer)
  }, [theme])

  useEffect(() => {
    const suivre = () => setSection(location.hash || "#button")
    window.addEventListener("hashchange", suivre)
    return () => window.removeEventListener("hashchange", suivre)
  }, [])

  return (
    <AppShell
      application={{
        nom: "Atelier",
        sousTitre: "@etic-insa/ui",
        logo: <BoxIcon />,
      }}
      sections={[
        {
          titre: "Composants",
          liens: [
            { libelle: "Button", href: "#button", icone: BoxIcon },
            ...PRIMITIVES.map(({ id, titre }) => ({
              libelle: titre,
              href: `#${id}`,
              icone: icone(id),
            })),
            ...[...BOUTONS, ...FORMULAIRES].map(({ id, titre }) => ({
              libelle: titre,
              href: `#${id}`,
              icone: icone(id),
            })),
            {
              libelle: "Couleurs de texte",
              href: "#couleurs",
              icone: PaletteIcon,
            },
            { libelle: "DataTable", href: "#data-table", icone: Table2Icon },
          ].map((lien) => ({ ...lien, actif: lien.href === section })),
        },
        ...GROUPES.map(({ titre, demos }) => ({
          titre,
          liens: demos.map(({ id, titre, icone: Icone }) => ({
            libelle: titre,
            href: `#${id}`,
            icone: Icone ?? icone(id),
            actif: `#${id}` === section,
          })),
        })),
      ]}
      compte={{
        nom: "Ada Lovelace",
        detail: "ada@example.org",
        initiales: "AL",
        entrees: [
          { libelle: "Mon profil", href: "#profil", icone: UserIcon },
          { libelle: "Paramètres", href: "#parametres", icone: SettingsIcon },
        ],
        onSeDeconnecter: () => {},
      }}
      theme={{ valeur: theme, onValeurChange: setTheme }}
    >
      <PageContainer largeur="md" className="gap-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold">Atelier @etic-insa/ui</h1>
          <p className="text-sm text-muted-foreground">
            Thème : bouton au pied de la barre latérale. Sous 1 025 px, la barre
            devient un tiroir.
          </p>
          <div
            role="group"
            aria-label="Couleur d'accent"
            className="flex flex-wrap gap-2"
          >
            {ACCENTS.map(({ id, nom }) => (
              <Button
                key={id || "aucun"}
                aria-pressed={accent === id}
                variant={accent === id ? "default" : "outline"}
                size="sm"
                onClick={() => setAccent(id)}
              >
                {nom}
              </Button>
            ))}
          </div>
        </header>

        <section id="button" className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Button</h2>
          <div className="flex flex-wrap gap-2">
            {VARIANTES.map((variante) => (
              <Button key={variante} variant={variante}>
                {variante}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TAILLES.map((taille) => (
              <Button key={taille} size={taille} variant="outline">
                {taille}
              </Button>
            ))}
            <Button disabled>désactivé</Button>
          </div>
        </section>

        {PRIMITIVES.map(({ id, titre, rendu }) => (
          <section key={id} id={id} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">{titre}</h2>
            {rendu()}
          </section>
        ))}

        {[
          ...BOUTONS,
          ...FORMULAIRES,
          ...GROUPES.flatMap(({ demos }) => demos),
        ].map(({ id, titre, rendu }) => (
          <section key={id} id={id} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">{titre}</h2>
            {rendu()}
          </section>
        ))}

        <section id="couleurs" className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Couleurs de texte</h2>
          <p className="text-sm text-muted-foreground">
            Chaque couleur sur le fond, sur <code>muted</code> et sur sa propre
            teinte : toutes atteignent 4,5:1 (vérifié par{" "}
            <code>src/theme.test.ts</code>).
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SEMANTIQUES.map(({ nom, texte, teinte }) =>
              ["bg-background border", "bg-muted", teinte].map((fond) => (
                <div
                  key={`${nom}-${fond}`}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${fond} ${texte}`}
                >
                  {nom}
                </div>
              ))
            )}
          </div>
        </section>

        <section id="data-table" className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">DataTable</h2>
          <p className="text-sm text-muted-foreground">
            Tri, filtres, colonnes (glisser pour réordonner), sélection avec
            Maj+clic, actions groupées, pagination par décalage, lignes
            dépliables.
          </p>
          <DemoTableaux />
        </section>
      </PageContainer>
    </AppShell>
  )
}
