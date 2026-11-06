import type { ReactNode } from "react"
import { cn } from "cn"
import {
  CheckIcon,
  InfoIcon,
  MinusIcon,
  TriangleAlertIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import { Card } from "@etic-ui/components/ui/card"
import { TONS, type StatusTon } from "@etic-ui/lib/ton"

/** Le signe de chaque ton : la couleur porte l'état, le signe le redit pour
 *  qui ne la voit pas. */
const SIGNES: Record<StatusTon, LucideIcon> = {
  neutral: MinusIcon,
  info: InfoIcon,
  success: CheckIcon,
  warning: TriangleAlertIcon,
  destructive: XIcon,
}

export interface VerdictPanelProps {
  /** L'état d'ensemble : « success » tout va bien, « warning » à
   *  surveiller, « destructive » en panne. */
  ton: StatusTon
  /** La phrase qui dit l'état : « Tout fonctionne », « 2 points
   *  d'attention ». */
  titre: ReactNode
  /** Son détail, sous la phrase, en petit. */
  detail?: ReactNode
  /** L'action qui y répond (un bouton), à droite ; passe sous le texte
   *  quand la place manque. */
  action?: ReactNode
  /** Autre signe que celui du ton (icône lucide). */
  icone?: LucideIcon
  className?: string
}

/**
 * Le verdict d'une page de supervision, lu d'un coup d'œil avant le
 * détail : un signe coloré en pastille, une phrase, son détail et au besoin
 * l'action qui y répond, dans une carte au liseré du ton.
 */
export function VerdictPanel({
  ton,
  titre,
  detail,
  action,
  icone,
  className,
}: VerdictPanelProps) {
  const Signe = icone ?? SIGNES[ton]
  return (
    <Card
      data-slot="verdict-panel"
      data-ton={ton}
      className={cn(
        "flex-row flex-wrap items-center gap-3.5 px-4 py-3.5",
        TONS[ton].cadre,
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          TONS[ton].medaillon
        )}
      >
        <Signe className="size-4.5" />
      </span>
      <div className="min-w-48 flex-1">
        <p className="text-base font-semibold">{titre}</p>
        {detail ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>
        ) : null}
      </div>
      {action}
    </Card>
  )
}
