import { render, screen, waitFor } from "@testing-library/react"
import { SearchIcon } from "lucide-react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  InputGroupAddon,
} from "@etic-ui/index"

// jsdom ne mesure rien : le cadre mesure 320 px, le champ, décalé par la
// loupe, 280 px. La largeur d'ancre calculée dit sur quoi la liste s'ancre.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const largeur =
        this.dataset.slot === "input-group"
          ? 320
          : this.dataset.slot === "input-group-control"
            ? 280
            : 0
      return DOMRect.fromRect({ x: 100, y: 40, width: largeur, height: 32 })
    }
  )
})
afterEach(() => {
  vi.restoreAllMocks()
})

function largeurAncre() {
  return document
    .querySelector<HTMLElement>('[data-slot="combobox-content"]')!
    .parentElement!.style.getPropertyValue("--anchor-width")
}

describe("Combobox", () => {
  it("ouvert d'emblée (defaultOpen), la liste s'ancre déjà sur le cadre", async () => {
    render(
      <Combobox items={["Lyon", "Paris"]} defaultOpen>
        <ComboboxInput aria-label="Ville" showTrigger={false}>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </ComboboxInput>
        <ComboboxContent>
          <ComboboxList>
            {(ville: string) => (
              <ComboboxItem key={ville} value={ville}>
                {ville}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    )
    await screen.findByRole("option", { name: "Lyon" })
    await waitFor(() => expect(largeurAncre()).toBe("320px"))
    // Exactement la largeur du cadre, sans les 28 px de shadcn.
    expect(
      document.querySelector('[data-slot="combobox-content"]')
    ).toHaveClass("min-w-(--anchor-width)")
  })
})
