import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Button } from "@etic-ui/index"

describe("Button", () => {
  it("rend un bouton accessible par son rôle et réagit au clic", () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Exporter</Button>)

    const bouton = screen.getByRole("button", { name: "Exporter" })
    bouton.click()

    expect(onClick).toHaveBeenCalledOnce()
    expect(bouton).toHaveAttribute("data-slot", "button")
  })

  it("fusionne la className de l'application avec les variantes", () => {
    render(
      <Button variant="outline" className="w-full">
        Exporter
      </Button>
    )

    expect(screen.getByRole("button")).toHaveClass("w-full", "border-border")
  })

  it("ne déclenche pas le clic quand il est désactivé", () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Exporter
      </Button>
    )

    screen.getByRole("button").click()

    expect(onClick).not.toHaveBeenCalled()
  })
})
