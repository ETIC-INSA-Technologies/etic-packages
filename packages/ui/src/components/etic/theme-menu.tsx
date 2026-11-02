import { useEffect, useRef, useState } from "react"
import { cn } from "cn"
import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@etic-ui/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"
import { THEMES, type ThemePreference } from "@etic-ui/theme"

const OPTIONS: Record<ThemePreference, { libelle: string; Icone: LucideIcon }> =
  {
    light: { libelle: "Clair", Icone: SunIcon },
    system: { libelle: "Système", Icone: MonitorIcon },
    dark: { libelle: "Sombre", Icone: MoonIcon },
  }

/** Durée d'affichage de « Thème non enregistré ». */
const DUREE_ECHEC = 5000

/** « Thème : » avec une espace insécable avant les deux-points. */
const PREFIXE = "Thème : "

export interface ThemeMenuProps {
  valeur: ThemePreference
  /** Enregistre le choix. Une promesse rejetée affiche « Thème non
   *  enregistré » sous le bouton, quelques secondes. */
  onValeurChange: (theme: ThemePreference) => void | Promise<unknown>
  /** Côté où s'ouvre le menu. */
  side?: "top" | "bottom"
  /** Classes du bouton (l'enveloppe qui positionne le message d'échec n'en
   *  reçoit pas). */
  className?: string
}

/** Libellé (« Thème : Sombre ») et icône du thème choisi. Usage interne
 *  (`ThemeMenu`, menu du compte d'`AppShell`). */
export function themeActuel(valeur: ThemePreference) {
  return {
    libelle: PREFIXE + OPTIONS[valeur].libelle,
    Icone: OPTIONS[valeur].Icone,
  }
}

/**
 * Choix du thème et son échec : `choisir` enregistre (rien si le thème est
 * déjà le bon) ; `echec` vaut vrai quelques secondes après un enregistrement
 * refusé, sauf s'il a déjà été remplacé par un autre choix. Usage interne.
 */
export function useChoixTheme({
  valeur,
  onValeurChange,
}: Pick<ThemeMenuProps, "valeur" | "onValeurChange">) {
  const [echec, setEchec] = useState(false)
  // Numéro du dernier choix : l'échec d'un choix déjà remplacé ne s'affiche pas.
  const dernierChoix = useRef(0)

  // Le message est posé par-dessus la page : il ne reste pas indéfiniment.
  useEffect(() => {
    if (!echec) return
    const minuterie = setTimeout(() => setEchec(false), DUREE_ECHEC)
    return () => clearTimeout(minuterie)
  }, [echec])

  const choisir = (theme: ThemePreference) => {
    setEchec(false)
    if (theme === valeur) return
    const numero = ++dernierChoix.current
    Promise.resolve()
      .then(() => onValeurChange(theme))
      .catch(() => {
        if (numero === dernierChoix.current) setEchec(true)
      })
  }

  return { echec, effacerEchec: () => setEchec(false), choisir }
}

/** Clair / Système / Sombre, le choix actuel coché. Usage interne. */
export function ThemeRadioGroup({
  valeur,
  onChoisir,
}: {
  valeur: ThemePreference
  onChoisir: (theme: ThemePreference) => void
}) {
  return (
    <DropdownMenuRadioGroup
      value={valeur}
      onValueChange={(theme) => onChoisir(theme as ThemePreference)}
    >
      {THEMES.map((option) => {
        const { libelle, Icone } = OPTIONS[option]
        return (
          <DropdownMenuRadioItem key={option} value={option} closeOnClick>
            <Icone />
            {libelle}
          </DropdownMenuRadioItem>
        )
      })}
    </DropdownMenuRadioGroup>
  )
}

/** « Thème non enregistré », posé au-dessus (`top`) ou au-dessous de son
 *  enveloppe `relative`. Usage interne. */
export function EchecTheme({
  side,
  className,
}: {
  side: "top" | "bottom"
  className?: string
}) {
  return (
    <p
      role="alert"
      className={cn(
        "absolute z-10 w-max max-w-56 rounded-md bg-popover px-2 py-1 text-xs text-destructive shadow-md ring-1 ring-foreground/10",
        side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        className
      )}
    >
      Thème non enregistré, réessayez.
    </p>
  )
}

/**
 * Choix du thème : un bouton dont l'icône montre le thème choisi, et qui ouvre
 * Clair / Système / Sombre, sur le modèle du « mode toggle » de shadcn. Un menu
 * plutôt qu'un bouton qui fait défiler les thèmes : passer à « Système » ne
 * change souvent rien à l'écran, et un clic sans effet visible passerait pour
 * un clic raté.
 */
export function ThemeMenu({
  valeur,
  onValeurChange,
  side = "bottom",
  className,
}: ThemeMenuProps) {
  const { echec, effacerEchec, choisir } = useChoixTheme({
    valeur,
    onValeurChange,
  })
  const { libelle, Icone: IconeActuelle } = themeActuel(valeur)

  return (
    <div className="relative">
      <DropdownMenu onOpenChange={(ouvert) => ouvert && effacerEchec()}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className={className}
                    aria-label={libelle}
                  />
                }
              />
            }
          >
            <IconeActuelle />
          </TooltipTrigger>
          <TooltipContent>{libelle}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side={side} align="end" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Thème de l'interface</DropdownMenuLabel>
            <ThemeRadioGroup valeur={valeur} onChoisir={choisir} />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {echec ? <EchecTheme side={side} className="right-0" /> : null}
    </div>
  )
}
