import { Fragment, type ReactNode } from "react"
import { cn } from "cn"
import { EllipsisIcon, type LucideIcon } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@etic-ui/components/ui/breadcrumb"
import { Button } from "@etic-ui/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@etic-ui/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"
import type { AppShellLienComposant } from "@etic-ui/components/etic/app-shell"

export interface PageHeaderProps {
  titre: ReactNode
  /** Ligne discrète sous le titre. */
  description?: ReactNode
  /** Boutons à droite (créer, exporter…) ; passent dessous sur un écran étroit. */
  actions?: ReactNode
  className?: string
}

/** En-tête d'une page : titre (le `<h1>`) et description à gauche, actions
 *  à droite. */
export function PageHeader({
  titre,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-3",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {titre}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <Actions>{actions}</Actions> : null}
    </div>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

/** Étape du fil d'Ariane, de la plus générale à la plus proche. */
export interface DetailHeaderEtape {
  libelle: string
  href: string
}

/** Action rare ou destructive, rangée sous « Plus d'actions ». */
export interface DetailHeaderActionSecondaire {
  libelle: string
  onChoisir: () => void
  icone?: LucideIcon
  /** En rouge. */
  destructif?: boolean
  /** Action impossible : l'entrée est grisée, ne fait rien, et cette raison
   *  s'affiche sous son libellé (comme `verrou` de `TooltipButton`). */
  verrou?: string
}

export interface DetailHeaderProps {
  /**
   * Où se trouve la fiche : le fil d'Ariane, qui y ramène quel que soit
   * l'historique du navigateur. La fiche elle-même (le titre) en est la
   * dernière étape.
   */
  chemin?: DetailHeaderEtape[]
  titre: string
  /** À côté du titre : badges de statut, marqueurs. */
  badges?: ReactNode
  /** Ligne discrète sous le titre : un code, une adresse. */
  meta?: ReactNode
  /** Actions courantes, en boutons. */
  actions?: ReactNode
  /** Actions rares ou destructives, derrière « Plus d'actions ». */
  actionsSecondaires?: DetailHeaderActionSecondaire[]
  /**
   * Taille des boutons de `actions` (leur `size`, à leur donner) : le bouton
   * « Plus d'actions » la suit (`icon` ou `icon-lg`) pour rester aligné.
   */
  tailleActions?: "default" | "lg"
  /**
   * Fiche dont la première carte répète déjà le nom : le fil d'Ariane porte
   * seul le titre (le `<h1>`), actions sur la même ligne. Demande `chemin`.
   */
  compact?: boolean
  /** Composant de lien du routeur, comme pour `AppShell`. */
  lien?: AppShellLienComposant
  className?: string
}

/** En-tête d'une fiche (un élément d'une liste) : fil d'Ariane, titre,
 *  badges, méta, actions courantes et menu des actions rares. */
export function DetailHeader({
  chemin = [],
  titre,
  badges,
  meta,
  actions,
  actionsSecondaires = [],
  tailleActions = "default",
  compact = false,
  lien: Lien = "a",
  className,
}: DetailHeaderProps) {
  const lesActions =
    actions || actionsSecondaires.length > 0 ? (
      <Actions>
        {actions}
        {actionsSecondaires.length > 0 ? (
          <MenuActions actions={actionsSecondaires} taille={tailleActions} />
        ) : null}
      </Actions>
    ) : null

  const etapes = chemin.map(({ libelle, href }, index) => (
    <Fragment key={index}>
      <BreadcrumbItem>
        <BreadcrumbLink render={<Lien href={href} />}>{libelle}</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
    </Fragment>
  ))

  // La dernière étape devient le titre de la page : sans elle, la page
  // n'aurait plus de <h1>.
  if (compact && chemin.length > 0) {
    return (
      <div
        data-slot="detail-header"
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
          className
        )}
      >
        <Breadcrumb className="min-w-0">
          <BreadcrumbList>
            {etapes}
            <BreadcrumbItem>
              <h1 className="text-sm font-medium">
                {/* Sans le rôle de lien désactivé de shadcn : le titre de la
                    page ne s'annonce pas « lien, indisponible ». */}
                <BreadcrumbPage role={undefined} aria-disabled={undefined}>
                  {titre}
                </BreadcrumbPage>
              </h1>
              {badges}
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {lesActions}
      </div>
    )
  }

  return (
    <div
      data-slot="detail-header"
      className={cn("flex flex-col gap-3", className)}
    >
      {chemin.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {etapes}
            <BreadcrumbItem>
              <BreadcrumbPage>{titre}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight break-words">
              {titre}
            </h1>
            {badges}
          </div>
          {meta ? (
            <p className="text-sm break-words text-muted-foreground">{meta}</p>
          ) : null}
        </div>
        {lesActions}
      </div>
    </div>
  )
}

function MenuActions({
  actions,
  taille,
}: {
  actions: DetailHeaderActionSecondaire[]
  taille: "default" | "lg"
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size={taille === "lg" ? "icon-lg" : "icon"}
                  aria-label="Plus d'actions"
                />
              }
            />
          }
        >
          <EllipsisIcon />
        </TooltipTrigger>
        <TooltipContent>Plus d'actions</TooltipContent>
      </Tooltip>
      {/* L'écart suit la taille du bouton : 4 px sous un bouton de 32, 6 sous
          un de 36 — collé à de grands boutons, le menu paraissait à l'étroit. */}
      <DropdownMenuContent
        align="end"
        sideOffset={taille === "lg" ? 6 : 4}
        className="min-w-48"
      >
        {actions.map(
          ({ libelle, onChoisir, icone: Icone, destructif, verrou }, index) => (
            <DropdownMenuItem
              key={index}
              variant={destructif ? "destructive" : "default"}
              disabled={!!verrou}
              onClick={onChoisir}
              // La raison doit rester lisible (4,5:1) : seuls l'icône et le
              // libellé sont estompés, pas toute l'entrée.
              className={verrou ? "data-disabled:opacity-100" : undefined}
            >
              {verrou ? (
                <>
                  {Icone ? <Icone className="opacity-50" /> : null}
                  {/* Une entrée désactivée ne reçoit pas le survol : la
                      raison s'affiche sous le libellé. */}
                  <span className="flex flex-col">
                    <span className="opacity-50">{libelle}</span>
                    <span
                      data-slot="detail-header-raison"
                      className="text-xs text-muted-foreground"
                    >
                      {verrou}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  {Icone ? <Icone /> : null}
                  {libelle}
                </>
              )}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
