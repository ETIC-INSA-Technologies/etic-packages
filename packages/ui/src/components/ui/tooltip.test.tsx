import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CopyIcon } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import {
  Button,
  DetailHeader,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  ThemeMenu,
  Tooltip,
  TooltipButton,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@etic-ui/index"
import { trouverInfobulle } from "@etic-ui/test/infobulle"

const infobulle = () => document.querySelector('[data-slot="tooltip-content"]')

/** Laisse passer les minuteries et rendus de Base UI. */
const attendre = () => act(() => new Promise((r) => setTimeout(r, 50)))

describe("TooltipTrigger : ouverture au focus", () => {
  it("s'ouvre après Tab, pas sur le focus que rend un menu fermé par Échap", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <TooltipProvider>
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent showCloseButton={false}>
            <DialogTitle>Préférences</DialogTitle>
            <Button>Avant</Button>
            <ThemeMenu valeur="light" onValeurChange={() => {}} />
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    )
    const bouton = screen.getByRole("button", { name: /^Thème\s:\sClair$/ })
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Avant" })).toHaveFocus()
    )
    // Navigation au clavier : l'infobulle s'ouvre.
    await user.tab()
    expect(bouton).toHaveFocus()
    expect(await trouverInfobulle()).toHaveTextContent(/Thème\s:\sClair/)

    // Entrée ouvre le menu, Échap le ferme et rend le focus au bouton.
    await user.keyboard("{Enter}")
    await screen.findByRole("menu")
    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
    await waitFor(() => expect(bouton).toHaveFocus())
    await attendre()
    expect(infobulle()).toBeNull()

    // L'Échap suivant ferme le dialogue, sans être absorbé par l'infobulle.
    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
    )
  })

  it("s'ouvre sur le focus initial d'un dialogue ouvert par Entrée", async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <Dialog>
          <DialogTrigger render={<Button />}>Partager</DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogTitle>Partager</DialogTitle>
            <TooltipButton size="icon" infobulle="Copier l'adresse">
              <CopyIcon />
            </TooltipButton>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    )
    await user.tab()
    await user.keyboard("{Enter}")
    const copier = await screen.findByRole("button", {
      name: "Copier l'adresse",
    })
    await waitFor(() => expect(copier).toHaveFocus())
    expect(await trouverInfobulle()).toHaveTextContent("Copier l'adresse")
  })

  it("pas sur le focus rendu par un menu fermé par un choix ; l'Échap suivant ferme le dialogue", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <TooltipProvider>
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent showCloseButton={false}>
            <DialogTitle>Préférences</DialogTitle>
            <ThemeMenu valeur="light" onValeurChange={() => {}} />
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    )
    const bouton = screen.getByRole("button", { name: /^Thème\s:\sClair$/ })
    await waitFor(() => expect(bouton).toHaveFocus())
    await user.keyboard("{Enter}")
    await screen.findByRole("menu")
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}")
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
    await waitFor(() => expect(bouton).toHaveFocus())
    await attendre()
    expect(infobulle()).toBeNull()
    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
    )
  })

  it("garde le gestionnaire onFocus de l'application", async () => {
    const user = userEvent.setup()
    const onFocus = vi.fn()
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<Button />} onFocus={onFocus}>
            Copier
          </TooltipTrigger>
          <TooltipContent>Copier l'adresse</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    await user.click(screen.getByRole("button", { name: "Copier" }))
    expect(onFocus).toHaveBeenCalledOnce()
  })

  it("« Plus d'actions » de DetailHeader : pas d'infobulle au retour du menu", async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <DetailHeader
          titre="Ada Lovelace"
          actionsSecondaires={[{ libelle: "Archiver", onChoisir: () => {} }]}
        />
      </TooltipProvider>
    )
    await user.tab()
    const bouton = screen.getByRole("button", { name: "Plus d'actions" })
    expect(bouton).toHaveFocus()
    await trouverInfobulle()
    await user.keyboard("{Enter}")
    await screen.findByRole("menu")
    await user.keyboard("{Escape}")
    await waitFor(() => expect(bouton).toHaveFocus())
    await attendre()
    expect(infobulle()).toBeNull()
  })
})
