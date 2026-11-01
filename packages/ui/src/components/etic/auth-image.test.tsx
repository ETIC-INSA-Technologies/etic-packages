import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  AuthAvatar,
  AuthImage,
  EmptyState,
  useAuthObjectUrlEtat,
} from "@etic-ui/index"

let compteur = 0
beforeEach(() => {
  compteur = 0
  // jsdom ne fournit pas les URL d'objets.
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => `blob:test/${++compteur}`),
      revokeObjectURL: vi.fn(),
    })
  )
})
afterEach(() => vi.unstubAllGlobals())

const blob = new Blob(["png"], { type: "image/png" })

describe("AuthImage", () => {
  it("affiche l'image récupérée par la fonction de l'application", async () => {
    const charger = vi.fn().mockResolvedValue(blob)
    render(
      <AuthImage src="/photos/1" charger={charger} alt="Photo" secours="…" />
    )
    expect(screen.getByText("…")).toBeInTheDocument()
    expect(await screen.findByRole("img", { name: "Photo" })).toHaveAttribute(
      "src",
      "blob:test/1"
    )
    expect(charger).toHaveBeenCalledWith("/photos/1", expect.any(AbortSignal))
  })

  it("garde le secours en cas d'échec ou sans adresse", async () => {
    const charger = vi.fn().mockRejectedValue(new Error("403"))
    const { rerender } = render(
      <AuthImage
        src="/photos/1"
        charger={charger}
        secours={<EmptyState titre="Pas de photo" />}
      />
    )
    await waitFor(() => expect(charger).toHaveBeenCalled())
    expect(screen.getByText("Pas de photo")).toBeInTheDocument()
    rerender(<AuthImage src={null} charger={charger} secours="Aucune" />)
    expect(screen.getByText("Aucune")).toBeInTheDocument()
  })

  it("révoque l'URL et interrompt le chargement au démontage", async () => {
    const charger = vi.fn().mockResolvedValue(blob)
    const { unmount } = render(
      <AuthImage src="/photos/1" charger={charger} alt="Photo" />
    )
    await screen.findByRole("img")
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/1")
    expect(charger.mock.calls[0][1].aborted).toBe(true)
  })

  it("recharge quand la clé change, pas quand la fonction change", async () => {
    const charger = vi.fn().mockResolvedValue(blob)
    const { rerender } = render(
      <AuthImage src="/p" charger={charger} cle={1} alt="Photo" />
    )
    await screen.findByRole("img")
    rerender(
      <AuthImage
        src="/p"
        charger={(s, sig) => charger(s, sig)}
        cle={1}
        alt="Photo"
      />
    )
    expect(charger).toHaveBeenCalledTimes(1)
    rerender(<AuthImage src="/p" charger={charger} cle={2} alt="Photo" />)
    await waitFor(() =>
      expect(screen.getByRole("img")).toHaveAttribute("src", "blob:test/2")
    )
    expect(charger).toHaveBeenCalledTimes(2)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/1")
  })
})

describe("AuthAvatar", () => {
  it("affiche les initiales tant que la photo manque ou échoue", async () => {
    const charger = vi.fn().mockRejectedValue(new Error("404"))
    render(<AuthAvatar initiales="AL" src="/photos/1" charger={charger} />)
    expect(screen.getByText("AL")).toBeInTheDocument()
    await waitFor(() => expect(charger).toHaveBeenCalled())
    expect(screen.getByText("AL")).toBeInTheDocument()
  })

  it("sans photo, n'appelle pas la fonction", () => {
    const charger = vi.fn()
    render(<AuthAvatar initiales="AL" src={null} charger={charger} />)
    expect(screen.getByText("AL")).toBeInTheDocument()
    expect(charger).not.toHaveBeenCalled()
  })

  it("prend un diamètre libre, initiales proportionnées", () => {
    render(
      <AuthAvatar
        initiales="AL"
        src={null}
        charger={vi.fn()}
        diametre={64}
        style={{ outline: "1px solid" }}
      />
    )
    const racine = screen.getByText("AL").closest('[data-slot="avatar"]')
    expect(racine).toHaveAttribute("data-diametre", "64")
    expect(racine).toHaveStyle({
      width: "64px",
      height: "64px",
      fontSize: "23px",
      outline: "1px solid",
    })
    expect(screen.getByText("AL")).toHaveClass(
      "group-data-diametre/avatar:text-[length:inherit]"
    )
  })

  it("sans diamètre, garde les tailles de shadcn", () => {
    render(<AuthAvatar initiales="AL" src={null} charger={vi.fn()} size="lg" />)
    const racine = screen.getByText("AL").closest('[data-slot="avatar"]')
    expect(racine).not.toHaveAttribute("data-diametre")
    expect(racine).toHaveAttribute("data-size", "lg")
    expect(racine?.getAttribute("style") ?? "").not.toContain("width")
  })
})

describe("useAuthObjectUrlEtat", () => {
  it("distingue le chargement, la réussite et l'échec", async () => {
    let rejeter: (raison: unknown) => void = () => {}
    const charger = vi.fn(
      (src: string) =>
        new Promise<Blob>((resoudre, rej) => {
          if (src === "/ok") resoudre(blob)
          else rejeter = rej
        })
    )
    const { result, rerender } = renderHook(
      ({ src }: { src: string | null }) => useAuthObjectUrlEtat(src, charger),
      { initialProps: { src: "/ok" as string | null } }
    )
    expect(result.current).toEqual({
      url: null,
      enCours: true,
      echec: false,
      erreur: undefined,
    })
    await waitFor(() => expect(result.current.url).toBe("blob:test/1"))
    expect(result.current.enCours).toBe(false)
    // Même état, même objet d'un rendu à l'autre (dépendance d'effet stable).
    const charge = result.current
    rerender({ src: "/ok" })
    expect(result.current).toBe(charge)

    rerender({ src: "/refuse" })
    expect(result.current).toMatchObject({ url: null, enCours: true })
    const raison = new Error("403")
    act(() => rejeter(raison))
    await waitFor(() => expect(result.current.echec).toBe(true))
    expect(result.current).toEqual({
      url: null,
      enCours: false,
      echec: true,
      erreur: raison,
    })

    rerender({ src: null })
    expect(result.current).toEqual({
      url: null,
      enCours: false,
      echec: false,
      erreur: undefined,
    })
  })

  it("AuthImage dit l'échec par `secoursEchec`, distinct du chargement", async () => {
    const charger = vi.fn().mockRejectedValue(new Error("403"))
    render(
      <AuthImage
        src="/fichier"
        charger={charger}
        secours="Chargement…"
        secoursEchec="Aperçu indisponible"
      />
    )
    expect(screen.getByText("Chargement…")).toBeInTheDocument()
    expect(await screen.findByText("Aperçu indisponible")).toBeInTheDocument()
    expect(screen.queryByText("Chargement…")).toBeNull()
  })
})
