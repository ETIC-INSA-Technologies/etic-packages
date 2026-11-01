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
import type { ThemePreference } from "@etic-ui/theme"

// Défini avec l'application du thème (theme.ts) ; exporté ici aussi, comme
// avant.
export type { ThemePreference }

// Dans l'ordre du menu (celui de THEMES, theme.ts).
const OPTIONS: Record<ThemePreference, { libelle: string; Icone: LucideIcon }> =
  {
    light: { libelle: "Clair", Icone: SunIcon },
    system: { libelle: "Système", Icone: MonitorIcon },
    dark: { libelle: "Sombre", Icone: MoonIcon },
  }

/** Durée d'affichage de « Thème non enregistré ». */
const DUREE_ECHEC = 5000

/** « Thème : » avec une espace insécable avant les deux-points. */
const PREFIXE = "Thème : "

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
  const [echec, setEchec] = useState(false)
  // Numéro du dernier choix : l'échec d'un choix déjà remplacé ne s'affiche pas.
  const dernierChoix = useRef(0)
  const { Icone: IconeActuelle } = OPTIONS[valeur]
  const libelle = PREFIXE + OPTIONS[valeur].libelle

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

  return (
    <div className="relative">
      <DropdownMenu onOpenChange={(ouvert) => ouvert && setEchec(false)}>
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
            <DropdownMenuRadioGroup
              value={valeur}
              onValueChange={(theme) => choisir(theme as ThemePreference)}
            >
              {Object.entries(OPTIONS).map(([option, { libelle, Icone }]) => (
                <DropdownMenuRadioItem key={option} value={option} closeOnClick>
                  <Icone />
                  {libelle}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {echec ? (
        <p
          role="alert"
          className={cn(
            "absolute right-0 z-10 w-max max-w-56 rounded-md bg-popover px-2 py-1 text-xs text-destructive shadow-md ring-1 ring-foreground/10",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          Thème non enregistré, réessayez.
        </p>
      ) : null}
    </div>
  )
}
