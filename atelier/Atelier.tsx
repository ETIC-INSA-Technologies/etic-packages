// Page d'atelier : chaque composant de la bibliothèque, dans ses variantes,
// importé comme le ferait une application.
import { Button } from "@etic-ui/index"

const VARIANTES = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const
const TAILLES = ["xs", "sm", "default", "lg"] as const

export function Atelier() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Atelier @etic/ui</h1>
        <p className="text-sm text-muted-foreground">
          Touche <kbd className="font-mono">d</kbd> : thème clair ou sombre.
        </p>
      </header>

      <section className="flex flex-col gap-4">
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
    </main>
  )
}
