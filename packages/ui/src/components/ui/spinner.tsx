import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Chargement"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

/**
 * Roue muette, à côté d'un texte qui dit déjà qu'on attend (bouton occupé,
 * statut « Chargement… ») : sans rôle ni nom, cachée aux lecteurs d'écran.
 * Ajout ETIC à shadcn.
 */
function SpinnerDecoratif(props: React.ComponentProps<typeof Spinner>) {
  return (
    <Spinner {...props} role={undefined} aria-label={undefined} aria-hidden />
  )
}

export { Spinner, SpinnerDecoratif }
