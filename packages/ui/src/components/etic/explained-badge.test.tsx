import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Badge, ExplainedBadge, TooltipProvider } from "@etic-ui/index"

describe("ExplainedBadge", () => {
  it("atteignable au clavier, ouvre l'explication au focus et la fait lire", async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider delay={0}>
        <ExplainedBadge explication="Imposé par le poste « Trésorier »">
          <Badge variant="outline">Bureau</Badge>
        </ExplainedBadge>
      </TooltipProvider>
    )
    const porteur = screen.getByText("Bureau").parentElement!
    expect(porteur).toHaveAttribute("data-slot", "explained-badge")
    expect(porteur).toHaveTextContent(
      "Bureau : Imposé par le poste « Trésorier »"
    )
    await user.tab()
    expect(porteur).toHaveFocus()
    await user.hover(porteur)
    expect(
      await screen.findByText("Imposé par le poste « Trésorier »")
    ).toHaveAttribute("data-slot", "tooltip-content")
  })

  it("render et texteLu : une date, focalisable sans tabIndex donné", async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <ExplainedBadge
          explication="Date du serveur, en UTC"
          texteLu=" (heure UTC)"
          render={<time dateTime="2026-11-01" />}
        >
          1er novembre
        </ExplainedBadge>
      </TooltipProvider>
    )
    const date = screen.getByText("1er novembre").closest("time")!
    expect(date).toHaveAttribute("dateTime", "2026-11-01")
    expect(date).toHaveTextContent("1er novembre (heure UTC)")
    expect(date).toHaveAttribute("tabindex", "0")
    await user.tab()
    expect(date).toHaveFocus()
  })

  it("garde le tabIndex donné par l'application", () => {
    render(
      <TooltipProvider>
        <ExplainedBadge
          explication="Hors de l'ordre de tabulation"
          render={<span tabIndex={-1} />}
        >
          Badge
        </ExplainedBadge>
      </TooltipProvider>
    )
    expect(screen.getByText("Badge")).toHaveAttribute("tabindex", "-1")
  })
})
