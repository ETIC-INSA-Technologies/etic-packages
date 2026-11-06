import { render, screen } from "@testing-library/react"
import { ServerIcon } from "lucide-react"
import { describe, expect, it } from "vitest"

import { Button, VerdictPanel } from "@etic-ui/index"

const panneau = (container: HTMLElement) =>
  container.querySelector('[data-slot="verdict-panel"]') as HTMLElement

const signe = (container: HTMLElement) =>
  panneau(container).querySelector("svg") as SVGElement

describe("VerdictPanel", () => {
  it("dit l'état en une phrase, son détail et l'action qui y répond", () => {
    const { container } = render(
      <VerdictPanel
        ton="warning"
        titre="2 points d'attention"
        detail="Disque presque plein."
        action={<Button>Voir le stockage</Button>}
      />
    )
    expect(screen.getByText("2 points d'attention")).toBeInTheDocument()
    expect(screen.getByText("Disque presque plein.")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Voir le stockage" })
    ).toBeInTheDocument()
    expect(panneau(container)).toHaveAttribute("data-ton", "warning")
    expect(panneau(container)).toHaveClass("ring-warning/40")
  })

  it("un signe par ton, caché aux lecteurs d'écran : la phrase dit l'état", () => {
    const attendus = {
      success: "lucide-check",
      warning: "lucide-triangle-alert",
      destructive: "lucide-x",
      info: "lucide-info",
      neutral: "lucide-minus",
    } as const
    for (const [ton, classe] of Object.entries(attendus)) {
      const { container, unmount } = render(
        <VerdictPanel ton={ton as keyof typeof attendus} titre="État" />
      )
      expect(signe(container)).toHaveClass(classe)
      expect(signe(container).parentElement).toHaveAttribute(
        "aria-hidden",
        "true"
      )
      unmount()
    }
  })

  it("icone remplace le signe du ton ; className s'ajoute", () => {
    const { container } = render(
      <VerdictPanel
        ton="success"
        titre="Serveur joignable"
        icone={ServerIcon}
        className="mb-2"
      />
    )
    expect(signe(container)).toHaveClass("lucide-server")
    expect(panneau(container)).toHaveClass("mb-2", "ring-success/35")
    // Sans détail, rien sous la phrase.
    expect(panneau(container).querySelector(".text-xs")).toBeNull()
  })
})
