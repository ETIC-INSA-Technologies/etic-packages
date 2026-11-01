import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { Badge, ExplainedBadge, Toggletip } from "@etic-ui/index"

const bulle = () => document.querySelector('[data-slot="toggletip-content"]')

const trouverBulle = () =>
  waitFor(() => {
    expect(bulle()).not.toBeNull()
    return bulle() as HTMLElement
  })

const fermee = () => waitFor(() => expect(bulle()).toBeNull())

/** Laisse passer les minuteries et rendus de Base UI. */
const attendre = () => act(() => new Promise((r) => setTimeout(r, 50)))

function rendre() {
  render(
    <>
      <button type="button">Ailleurs</button>
      <Toggletip explication="Heure du serveur, en UTC">12:00</Toggletip>
    </>
  )
  return screen.getByText("12:00").closest("[data-slot=toggletip]")!
}

describe("Toggletip : props et contexte", () => {
  it("fusionne les props de render (ref, gestionnaires, classes) avec les siennes", async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLTimeElement>()
    const onClick = vi.fn()
    const onFocus = vi.fn()
    render(
      <Toggletip
        explication="Heure du serveur, en UTC"
        render={
          <time
            ref={ref}
            dateTime="2026-11-01"
            className="font-mono"
            onClick={onClick}
            onFocus={onFocus}
          />
        }
      >
        12:00
      </Toggletip>
    )
    const date = screen.getByText("12:00").closest("time")!
    expect(ref.current).toBe(date)
    expect(date).toHaveClass("font-mono", "outline-none")
    expect(date).toHaveAttribute("data-slot", "toggletip")
    await user.click(date)
    expect(onClick).toHaveBeenCalledOnce()
    expect(onFocus).toHaveBeenCalledOnce()
    await trouverBulle()
  })

  it("le clic ne remonte pas à une ligne ou une carte cliquable", async () => {
    const user = userEvent.setup()
    const onLigne = vi.fn()
    render(
      <div onClick={onLigne}>
        <Toggletip explication="Imposé par le poste">Bureau</Toggletip>
      </div>
    )
    await user.click(screen.getByText("Bureau"))
    await trouverBulle()
    expect(onLigne).not.toHaveBeenCalled()
  })

  it("ouverte au survol puis focalisée, reste ouverte quand la souris part", async () => {
    const user = userEvent.setup()
    const porteur = rendre()
    await user.hover(porteur)
    await trouverBulle()
    act(() => (porteur as HTMLElement).focus())
    await user.unhover(porteur)
    await attendre()
    expect(bulle()).not.toBeNull()
    // Le focus part : elle se ferme.
    act(() => (porteur as HTMLElement).blur())
    await fermee()
  })
})

describe("Toggletip", () => {
  it("s'ouvre au toucher, se ferme au toucher ailleurs", async () => {
    const user = userEvent.setup()
    const porteur = rendre()
    await user.pointer({ keys: "[TouchA]", target: porteur })
    expect(await trouverBulle()).toHaveTextContent("Heure du serveur, en UTC")
    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Ailleurs" }),
    })
    await fermee()
  })

  it("se ferme à Échap, et se rouvre au toucher suivant", async () => {
    const user = userEvent.setup()
    const porteur = rendre()
    await user.pointer({ keys: "[TouchA]", target: porteur })
    await trouverBulle()
    await user.keyboard("{Escape}")
    await fermee()
    await user.pointer({ keys: "[TouchA]", target: porteur })
    await trouverBulle()
  })

  it("s'ouvre au survol de la souris, et au focus d'une tabulation", async () => {
    const user = userEvent.setup()
    const porteur = rendre()
    await user.hover(porteur)
    await trouverBulle()
    await user.unhover(porteur)
    await fermee()

    await user.tab()
    await user.tab()
    expect(porteur).toHaveFocus()
    await trouverBulle()
    // Le focus s'en va : la bulle se ferme.
    await user.tab({ shift: true })
    await fermee()
  })

  it("un clic l'ouvre sans la refermer aussitôt (survol puis clic)", async () => {
    const user = userEvent.setup()
    const porteur = rendre()
    await user.click(porteur)
    await trouverBulle()
    await attendre()
    expect(bulle()).not.toBeNull()
  })

  it("lu comme un texte : explication à la suite, bulle masquée, pas de bouton", async () => {
    const user = userEvent.setup()
    const porteur = rendre()
    expect(porteur).toHaveTextContent("12:00 : Heure du serveur, en UTC")
    expect(porteur).toHaveAttribute("tabindex", "0")
    expect(porteur).not.toHaveAttribute("role")
    expect(porteur).not.toHaveAttribute("aria-expanded")
    expect(porteur).not.toHaveAttribute("aria-haspopup")
    await user.hover(porteur)
    expect(await trouverBulle()).toHaveAttribute("aria-hidden", "true")
    // Le focus reste sur l'élément.
    await user.click(porteur)
    expect(porteur).toHaveFocus()
  })
})

describe("ExplainedBadge au toucher", () => {
  it("ouvre son explication au toucher, sans changer d'allure", async () => {
    const user = userEvent.setup()
    render(
      <ExplainedBadge explication="Imposé par le poste « Trésorier »">
        <Badge variant="outline">Bureau</Badge>
      </ExplainedBadge>
    )
    const porteur = screen.getByText("Bureau").parentElement!
    expect(porteur).toHaveAttribute("data-slot", "explained-badge")
    expect(porteur).toHaveClass("inline-flex", "rounded-4xl")
    await user.pointer({ keys: "[TouchA]", target: porteur })
    expect(await trouverBulle()).toHaveTextContent(
      "Imposé par le poste « Trésorier »"
    )
  })
})
