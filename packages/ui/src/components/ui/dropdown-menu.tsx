import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "cn"
import { ChevronRightIcon, CheckIcon } from "lucide-react"

// Écart ETIC : le dernier déclencheur monté, pour le `finalFocus` par défaut
// de DropdownMenuContent. Gardé une fois démonté : `isConnected` dit alors
// qu'il a disparu. Un objet créé une fois plutôt qu'un état : noter le
// déclencheur ne redessine pas le menu (un par ligne d'un tableau). Avec
// plusieurs déclencheurs sur un même menu (non utilisé), c'est le dernier
// monté qui compte.
interface SuiviDeclencheur {
  noter: (element: HTMLElement | null) => void
  lire: () => HTMLElement | null
}

const DeclencheurContext = React.createContext<SuiviDeclencheur | null>(null)

function creerSuivi(): SuiviDeclencheur {
  let dernier: HTMLElement | null = null
  return {
    noter: (element) => {
      if (element) dernier = element
    },
    lire: () => dernier,
  }
}

/** Transmet l'élément à la `ref` reçue, fonction ou objet ; rend le
 *  nettoyage qu'une ref fonction peut renvoyer (React 19). */
function assignerRef<T>(ref: React.Ref<T> | undefined, valeur: T | null) {
  if (typeof ref === "function") return ref(valeur)
  if (ref) ref.current = valeur
}

// Contenu d'un sous-menu : Base UI y a sa propre logique de retour de focus
// (vers le menu parent), que la garde de DropdownMenuContent ne remplace pas.
const SousMenuContext = React.createContext(false)

type FinalFocus = MenuPrimitive.Popup.Props["finalFocus"]
type FinalFocusFonction = Extract<FinalFocus, (...args: never) => unknown>
type TypeFermeture = Parameters<FinalFocusFonction>[0]

/**
 * Écart ETIC : `finalFocus` du menu principal. À la fermeture, Base UI rend
 * le focus au déclencheur ; retiré du DOM (ligne supprimée, barre retirée),
 * il se repliait sur un historique global — un autre menu ou sélecteur de la
 * page. Rien n'est focalisé alors : le focus tombe sur `<body>`, où les
 * rattrapages (ligne supprimée d'un DataTable, barre d'actions) le
 * reprennent. Une fonction rendant le retour « explicite » pour Base UI, on
 * garde nous-mêmes sa règle : un focus parti ailleurs (dialogue ouvert depuis
 * une entrée) y reste. Le `finalFocus` donné passe d'abord ; s'il vaut
 * `true` (retour par défaut), la garde s'applique. (Une ref donnée est
 * passée telle quelle, sans garde.)
 */
function focusFinal(
  type: TypeFermeture,
  donne: FinalFocusFonction | boolean | undefined,
  suivi: SuiviDeclencheur | null
): ReturnType<FinalFocusFonction> {
  const voulu = typeof donne === "function" ? donne(type) : (donne ?? true)
  if (voulu !== true) return voulu
  const actif = document.activeElement
  if (
    actif &&
    actif !== document.body &&
    !actif.closest('[data-slot^="dropdown-menu-"]')
  )
    return false
  const declencheur = suivi?.lire()
  return !declencheur || declencheur.isConnected
}

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  const [suivi] = React.useState(creerSuivi)
  return (
    <DeclencheurContext.Provider value={suivi}>
      <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
    </DeclencheurContext.Provider>
  )
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({ ref, ...props }: MenuPrimitive.Trigger.Props) {
  const suivi = React.useContext(DeclencheurContext)
  const lier = React.useCallback(
    (element: HTMLButtonElement | null) => {
      suivi?.noter(element)
      return assignerRef(ref, element)
    },
    [suivi, ref]
  )
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      ref={lier}
      {...props}
    />
  )
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  finalFocus,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  const suivi = React.useContext(DeclencheurContext)
  const sousMenu = React.useContext(SousMenuContext)
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          finalFocus={
            sousMenu || (finalFocus && typeof finalFocus === "object")
              ? finalFocus
              : (type: TypeFermeture) => focusFinal(type, finalFocus, suivi)
          }
          className={cn(
            "z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <SousMenuContext.Provider value>
      <DropdownMenuContent
        data-slot="dropdown-menu-sub-content"
        className={cn(
          "w-auto min-w-[96px] rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        {...props}
      />
    </SousMenuContext.Provider>
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
