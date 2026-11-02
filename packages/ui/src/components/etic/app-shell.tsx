import { useId, useState, type ReactNode } from "react"
import { cn } from "cn"
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  PanelLeftIcon,
  type LucideIcon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@etic-ui/components/ui/alert-dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@etic-ui/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@etic-ui/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@etic-ui/components/ui/sidebar"
import { TooltipProvider } from "@etic-ui/components/ui/tooltip"
import { GOUTTIERES_PAGE } from "@etic-ui/components/etic/page-container"
import {
  ThemeMenu,
  type ThemeMenuProps,
} from "@etic-ui/components/etic/theme-menu"
import { TooltipButton } from "@etic-ui/components/etic/tooltip-button"
import { useLien, type LienComposant } from "@etic-ui/components/etic/lien"

/** @deprecated Nom de la 0.2.0 : utiliser `LienComposant`. */
export type AppShellLienComposant = LienComposant

export interface AppShellLien {
  libelle: string
  href: string
  icone?: LucideIcon
  /** Page à l'écran. Calculé par l'application, seule à savoir qu'une fiche
   *  appartient à telle rubrique. */
  actif?: boolean
}

export interface AppShellSection {
  titre?: string
  liens: AppShellLien[]
}

/** Entrée du menu du compte : un lien, ou une action. */
export type AppShellEntreeCompte = {
  libelle: string
  icone?: LucideIcon
} & (
  { href: string; onChoisir?: never } | { onChoisir: () => void; href?: never }
)

export interface AppShellCompte {
  /** « Prénom Nom », ou le rôle d'un compte fonctionnel. */
  nom: string
  /** Seconde ligne, l'adresse par exemple. */
  detail?: string
  initiales: string
  /** Photo ; les initiales s'affichent tant qu'elle manque ou charge. */
  photo?: string | null
  /** La fiche du compte est la page à l'écran. */
  actif?: boolean
  /** Entrées du menu du compte, avant « Se déconnecter ». */
  entrees?: AppShellEntreeCompte[]
  /** Appelé après confirmation. */
  onSeDeconnecter: () => void
}

export interface AppShellProps {
  application: {
    nom: string
    sousTitre?: string
    /** Image ou icône, carrée : 32 px dans la barre latérale, 24 px dans la
     *  barre du haut sur mobile. */
    logo?: ReactNode
    /** Lien de la marque ; « / » par défaut. */
    href?: string
  }
  sections: AppShellSection[]
  compte?: AppShellCompte
  theme?: Pick<ThemeMenuProps, "valeur" | "onValeurChange">
  /** Composant de lien du routeur ; par défaut, celui du `LienProvider`,
   *  sinon un `<a>`. */
  lien?: LienComposant
  /**
   * Au-dessus du contenu, avec les gouttières de `PageContainer` : message
   * qui concerne toute l'application (reprise de session impossible…). Il
   * prend toute la largeur du contenu : la coquille ignore la `largeur` de
   * la page, si bien qu'il déborde d'une page étroite (`largeur="md"`) sur
   * grand écran. Un message propre à une page se place dans son
   * `PageContainer`.
   */
  bandeau?: ReactNode
  children: ReactNode
}

/**
 * Coquille commune des applications ETIC : la barre latérale de shadcn
 * (navigation par rubriques, menu du compte, thème), qui devient un tiroir
 * sous 1 025 px, ouvert par une barre du haut. Le tiroir se referme quand on
 * suit un de ses liens. Ne connaît ni le routeur ni l'authentification : l'application
 * fournit les liens, l'état actif, le compte et le thème.
 *
 * Un lien « Aller au contenu », visible au focus, ouvre la tabulation : il
 * saute la navigation et met le focus sur le `<main>`.
 */
export function AppShell({
  application,
  sections,
  compte,
  theme,
  lien,
  bandeau,
  children,
}: AppShellProps) {
  const Lien = useLien(lien)
  const idContenu = useId()
  return (
    <TooltipProvider>
      <a
        href={`#${idContenu}`}
        data-slot="app-shell-skip-link"
        onClick={(event) => {
          // Le focus, pas seulement le défilement ; et pas de `#…` ajouté à
          // l'adresse, que le routeur de l'application lirait.
          event.preventDefault()
          document.getElementById(idContenu)?.focus()
        }}
        className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium shadow-md ring-3 ring-ring/50 outline-none focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Aller au contenu
      </a>
      <SidebarProvider defaultOpen={!colonneRepliee()}>
        <Colonne>
          <SidebarHeader className="flex-row items-center group-data-[collapsible=icon]:flex-col">
            <Marque application={application} Lien={Lien} />
            <BoutonRepli />
          </SidebarHeader>
          <SidebarContent>
            <Navigation sections={sections} Lien={Lien} />
          </SidebarContent>
          {compte || theme ? (
            <SidebarFooter className="flex-row items-center gap-2 group-data-[collapsible=icon]:flex-col">
              {compte ? <MenuCompte compte={compte} Lien={Lien} /> : null}
              {theme ? (
                <ThemeMenu
                  {...theme}
                  side="top"
                  // Sans fond propre, comme le menu du compte voisin (le
                  // dark:bg-input/30 d'outline tranchait sur la barre), et
                  // son survol.
                  className="size-12 shrink-0 bg-sidebar group-data-[collapsible=icon]:size-8 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground dark:bg-sidebar dark:hover:bg-sidebar-accent"
                />
              ) : null}
            </SidebarFooter>
          ) : null}
        </Colonne>
        <SidebarInset
          id={idContenu}
          tabIndex={-1}
          // Fond de page (bg-page) au lieu de bg-background (shadcn).
          className="min-w-0 bg-page outline-none"
        >
          <BarreMobile application={application} Lien={Lien} />
          {/* Gouttières de `PageContainer`, qui suit et pose sa propre marge
              haute. Masqué quand le bandeau est absent ou ne rend rien
              (`ErrorBanner` sans erreur…). */}
          <div
            data-slot="app-shell-bandeau"
            className={cn(
              "empty:hidden",
              GOUTTIERES_PAGE.laterales,
              GOUTTIERES_PAGE.haute
            )}
          >
            {bandeau}
          </div>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

/** Colonne repliée lors de la dernière visite : shadcn écrit le cookie
 *  `sidebar_state` à chaque repli, sans le relire. */
function colonneRepliee() {
  return (
    typeof document !== "undefined" &&
    /(?:^|;\s*)sidebar_state=false(?:;|$)/.test(document.cookie)
  )
}

/** Attribut des éléments, autres que les liens, qui referment le tiroir. */
const FERME_TIROIR = "data-ferme-tiroir"

/**
 * Sur ordinateur, le bouton visible qui replie ou déplie la colonne (le rail
 * de shadcn n'est ni visible ni atteignable au clavier, et Ctrl+B ne se
 * devine pas). Sur mobile, la barre du haut s'en charge.
 */
function BoutonRepli() {
  const { isMobile, open, toggleSidebar } = useSidebar()
  if (isMobile) return null
  const libelle = open ? "Replier le menu" : "Déplier le menu"
  return (
    <TooltipButton
      variant="ghost"
      size="icon-sm"
      aria-label={libelle}
      infobulle={`${libelle} (Ctrl+B)`}
      aria-keyshortcuts="Control+B Meta+B"
      data-slot="app-shell-collapse"
      className="shrink-0"
      onClick={toggleSidebar}
    >
      <PanelLeftIcon />
    </TooltipButton>
  )
}

/**
 * La barre latérale. Sur ordinateur, elle se replie en colonne d'icônes
 * (bouton de l'en-tête, rail, ou Ctrl+B hors d'un champ de saisie). Sur mobile, le tiroir se referme dès
 * qu'on suit un de ses liens dans la page, ou une entrée marquée
 * `data-ferme-tiroir` : un seul écouteur, qui reçoit aussi les clics des
 * menus ouverts depuis le tiroir (React fait remonter les évènements des
 * portails dans l'arbre des composants). Un clic qui ouvre un nouvel onglet
 * (Ctrl, Cmd, Maj) le laisse ouvert.
 */
function Colonne({ children }: { children: ReactNode }) {
  const { isMobile, setOpenMobile } = useSidebar()
  return (
    <Sidebar collapsible="icon">
      <div
        className="contents"
        onClick={(event) => {
          if (!isMobile || event.ctrlKey || event.metaKey || event.shiftKey) {
            return
          }
          const cible = event.target as Element
          if (cible.closest(`a[href], [${FERME_TIROIR}]`)) setOpenMobile(false)
        }}
      >
        {children}
      </div>
      <SidebarRail />
    </Sidebar>
  )
}

function Logo({
  application,
  className,
}: Pick<AppShellProps, "application"> & { className: string }) {
  return application.logo ? (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center [&_img]:size-full [&_svg]:size-full",
        className
      )}
    >
      {application.logo}
    </span>
  ) : null
}

function Marque({
  application,
  Lien,
}: Pick<AppShellProps, "application"> & { Lien: LienComposant }) {
  return (
    <SidebarMenu className="min-w-0 flex-1">
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          render={<Lien href={application.href ?? "/"} />}
        >
          {/* 32 px, comme le sélecteur d'équipe de shadcn : toute la hauteur
              utile du bouton (48 px moins ses marges) ; dans la barre
              repliée, il remplit le bouton de 32 px, donc centré. */}
          <Logo application={application} className="size-8" />
          <span className="grid flex-1 text-left leading-tight">
            <span className="truncate font-semibold">{application.nom}</span>
            {application.sousTitre ? (
              <span className="truncate text-xs text-muted-foreground">
                {application.sousTitre}
              </span>
            ) : null}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function Navigation({
  sections,
  Lien,
}: Pick<AppShellProps, "sections"> & { Lien: LienComposant }) {
  return (
    <nav aria-label="Navigation principale">
      {sections.map((section, index) => (
        <SidebarGroup key={index}>
          {section.titre ? (
            <SidebarGroupLabel>{section.titre}</SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {section.liens.map(
                ({ libelle, href, icone: Icone, actif }, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuButton
                      isActive={actif}
                      tooltip={libelle}
                      render={
                        <Lien
                          href={href}
                          aria-current={actif ? "page" : undefined}
                        />
                      }
                    >
                      {Icone ? <Icone /> : null}
                      {/* Tronqué s'il est trop long : `title` le donne en
                          entier au survol, barre dépliée. */}
                      <span title={libelle}>{libelle}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  )
}

function MenuCompte({
  compte,
  Lien,
}: {
  compte: AppShellCompte
  Lien: LienComposant
}) {
  const [confirmer, setConfirmer] = useState(false)

  return (
    <>
      <SidebarMenu className="min-w-0 flex-1">
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  isActive={compte.actif}
                  aria-label={`${compte.nom}, menu du compte`}
                  // rounded-lg : le survol épouse l'avatar et le bouton de thème.
                  // Le contour du bouton de thème voisin (outline : --border,
                  // --input en sombre), tracé en ombre comme la variante
                  // outline de SidebarMenuButton : une bordure rognerait
                  // l'avatar de la barre repliée (size-8, p-0).
                  className="rounded-lg shadow-[0_0_0_1px_var(--border)] data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground dark:shadow-[0_0_0_1px_var(--input)]"
                />
              }
            >
              {/* Carré arrondi, comme le nav-user de shadcn : la forme du
                  survol du bouton et du bouton de thème. */}
              <Avatar className="rounded-lg after:rounded-lg">
                {compte.photo ? (
                  <AvatarImage
                    src={compte.photo}
                    alt=""
                    className="rounded-lg"
                  />
                ) : null}
                <AvatarFallback className="rounded-lg">
                  {compte.initiales}
                </AvatarFallback>
              </Avatar>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{compte.nom}</span>
                {compte.detail ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {compte.detail}
                  </span>
                ) : null}
              </span>
              <ChevronsUpDownIcon className="ml-auto" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="min-w-56">
              {compte.entrees?.length ? (
                <>
                  <DropdownMenuGroup>
                    {compte.entrees.map(
                      ({ libelle, icone: Icone, href, onChoisir }, i) => (
                        <DropdownMenuItem
                          key={i}
                          render={href ? <Lien href={href} /> : undefined}
                          onClick={onChoisir}
                          {...{ [FERME_TIROIR]: true }}
                        >
                          {Icone ? <Icone /> : null}
                          {libelle}
                        </DropdownMenuItem>
                      )
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onClick={() => setConfirmer(true)}>
                <LogOutIcon />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AlertDialog open={confirmer} onOpenChange={setConfirmer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se déconnecter</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment vous déconnecter&#8239;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmer(false)
                compte.onSeDeconnecter()
              }}
            >
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** Sous le seuil mobile, la barre latérale n'est plus à l'écran : cette barre
 *  porte le bouton qui l'ouvre en tiroir, et la marque. */
function BarreMobile({
  application,
  Lien,
}: Pick<AppShellProps, "application"> & { Lien: LienComposant }) {
  const { isMobile, openMobile } = useSidebar()
  if (!isMobile) return null
  return (
    // Sa hauteur (h-12) est reprise par le `scroll-padding-top` de styles.css :
    // une ancre ne passe pas sous la barre collante. Sur le fond de la page.
    <header
      data-slot="app-shell-mobile-bar"
      className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-page px-2"
    >
      {/* Un seul nom, par `libelle` : un `aria-label` aurait masqué le texte
          lu de shadcn, qui en divergeait. */}
      <SidebarTrigger
        libelle="Ouvrir le menu"
        aria-expanded={openMobile}
        className="size-9"
      />
      <Lien
        href={application.href ?? "/"}
        className="flex min-w-0 items-center gap-2 rounded-md px-1 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Logo application={application} className="size-6" />
        <span className="truncate">{application.nom}</span>
      </Lien>
    </header>
  )
}
