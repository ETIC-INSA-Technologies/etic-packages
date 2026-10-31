import { act, renderHook } from "@testing-library/react"
import { useLayoutEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDraftAutosave } from "@etic-ui/index"

/**
 * Ce que ces tests protègent : le brouillon rangé ne revient jamais en
 * arrière. Le stockage simulé écrit dans l'ordre d'arrivée des écritures, et
 * chaque test décide quand une écriture « arrive » (`arriver()`).
 */

interface Contenu {
  texte: string
}

interface Appel {
  contenu: Contenu
  version: number
  arriver: () => void
  echouer: (raison: unknown) => void
}

function creerStockage() {
  const stockage = { contenu: null as Contenu | null, version: 0 }
  const appels: Appel[] = []
  const enregistrer = vi.fn(
    (contenu: Contenu, version: number) =>
      new Promise<number>((resolve, reject) => {
        appels.push({
          contenu,
          version,
          arriver: () => {
            stockage.contenu = contenu
            stockage.version = version + 1
            resolve(stockage.version)
          },
          echouer: reject,
        })
      })
  )
  return { stockage, appels, enregistrer }
}

async function microtaches() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function attendre(ms = 1200) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await Promise.resolve()
    await Promise.resolve()
  })
}

function rendre(enregistrer: (c: Contenu, v: number) => Promise<number>) {
  return renderHook(
    ({ contenu }: { contenu: Contenu | null }) =>
      useDraftAutosave<Contenu>({ contenu, enregistrer }),
    { initialProps: { contenu: null as Contenu | null } }
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useDraftAutosave", () => {
  it("n'écrit rien sans contenu, puis écrit après l'anti-rebond", async () => {
    const { enregistrer, appels, stockage } = creerStockage()
    const { rerender } = rendre(enregistrer)

    await attendre()
    expect(enregistrer).not.toHaveBeenCalled()

    rerender({ contenu: { texte: "A" } })
    await attendre(1199)
    expect(enregistrer).not.toHaveBeenCalled()
    await attendre(1)
    expect(enregistrer).toHaveBeenCalledTimes(1)
    appels[0].arriver()
    await microtaches()
    expect(stockage.contenu).toEqual({ texte: "A" })
  })

  it("ne réécrit pas un contenu identique", async () => {
    const { enregistrer, appels } = creerStockage()
    const { rerender } = rendre(enregistrer)

    rerender({ contenu: { texte: "A" } })
    await attendre()
    appels[0].arriver()
    await microtaches()

    rerender({ contenu: { texte: "A" } })
    await attendre()
    expect(enregistrer).toHaveBeenCalledTimes(1)
  })

  it("une écriture à la fois, la caduque sautée, la version suivie", async () => {
    const { enregistrer, appels, stockage } = creerStockage()
    const { result, rerender } = rendre(enregistrer)

    rerender({ contenu: { texte: "P1" } })
    await attendre()
    rerender({ contenu: { texte: "P2" } })
    await attendre()
    rerender({ contenu: { texte: "P3" } })
    await attendre()
    expect(enregistrer).toHaveBeenCalledTimes(1)

    appels[0].arriver()
    await microtaches()
    expect(enregistrer).toHaveBeenCalledTimes(2)
    expect(appels[1].contenu).toEqual({ texte: "P3" })
    expect(appels[1].version).toBe(1)
    appels[1].arriver()
    await microtaches()
    expect(stockage).toEqual({ contenu: { texte: "P3" }, version: 2 })

    await act(async () => {
      await result.current.enregistrerMaintenant()
    })
    expect(enregistrer).toHaveBeenCalledTimes(2)
  })

  it("enregistrerMaintenant() écrit tout de suite et attend l'écriture", async () => {
    const { enregistrer, appels, stockage } = creerStockage()
    const { result, rerender } = rendre(enregistrer)

    rerender({ contenu: { texte: "dernière correction" } })
    let fini = false
    let promesse: Promise<void>
    await act(async () => {
      promesse = result.current.enregistrerMaintenant().then(() => {
        fini = true
      })
      await Promise.resolve()
    })
    expect(enregistrer).toHaveBeenCalledTimes(1)
    expect(fini).toBe(false)

    appels[0].arriver()
    await act(async () => {
      await promesse
    })
    expect(fini).toBe(true)
    expect(stockage.contenu).toEqual({ texte: "dernière correction" })

    await attendre()
    expect(enregistrer).toHaveBeenCalledTimes(1)
  })

  it("annuler() abandonne l'écriture en attente", async () => {
    const { enregistrer } = creerStockage()
    const { result, rerender } = rendre(enregistrer)

    rerender({ contenu: { texte: "A" } })
    act(() => result.current.annuler())
    await attendre()
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it("annuler() rend caduque l'écriture en file derrière celle en cours", async () => {
    const { enregistrer, appels, stockage } = creerStockage()
    const { result, rerender } = rendre(enregistrer)

    rerender({ contenu: { texte: "A" } })
    await attendre()
    rerender({ contenu: { texte: "B" } })
    await attendre() // B attend que A arrive
    expect(enregistrer).toHaveBeenCalledTimes(1)

    act(() => result.current.annuler())
    appels[0].arriver()
    await microtaches()
    // Le brouillon supprimé après annuler() n'est pas recréé par B.
    expect(enregistrer).toHaveBeenCalledTimes(1)
    expect(stockage.contenu).toEqual({ texte: "A" })
  })

  it("range l'écriture en attente au démontage, sauf après annuler()", async () => {
    const { enregistrer } = creerStockage()
    const { rerender, unmount } = rendre(enregistrer)

    rerender({ contenu: { texte: "dernières frappes" } })
    unmount()
    await microtaches()
    expect(enregistrer).toHaveBeenCalledTimes(1)
    expect(enregistrer.mock.calls[0][0]).toEqual({ texte: "dernières frappes" })

    const autre = creerStockage()
    const second = rendre(autre.enregistrer)
    second.rerender({ contenu: { texte: "à jeter" } })
    act(() => second.result.current.annuler())
    second.unmount()
    await attendre()
    expect(autre.enregistrer).not.toHaveBeenCalled()
  })

  it("part de la version donnée", async () => {
    const { enregistrer, appels } = creerStockage()
    const { result, rerender } = rendre(enregistrer)

    act(() => result.current.definirVersion(7))
    rerender({ contenu: { texte: "A" } })
    await attendre()
    expect(appels[0].version).toBe(7)
  })

  it("expose un échec, sait le rejouer, et la file continue", async () => {
    const { enregistrer, appels, stockage } = creerStockage()
    const { result, rerender } = rendre(enregistrer)

    rerender({ contenu: { texte: "A" } })
    await attendre()
    appels[0].echouer(new Error("401"))
    await microtaches()
    expect(result.current.erreur).toBeInstanceOf(Error)
    expect(result.current.nonEnregistre()).toBe(true)

    await act(async () => {
      const rejoue = result.current.reessayer()
      await Promise.resolve()
      appels[1].arriver()
      await rejoue
    })
    expect(stockage.contenu).toEqual({ texte: "A" })
    expect(result.current.erreur).toBeNull()
    expect(result.current.nonEnregistre()).toBe(false)

    rerender({ contenu: { texte: "B" } })
    await attendre()
    appels[2].arriver()
    await microtaches()
    expect(stockage.contenu).toEqual({ texte: "B" })
  })

  it("signale la fermeture de l'onglet tant que tout n'est pas rangé", async () => {
    const { enregistrer, appels } = creerStockage()
    const { rerender } = rendre(enregistrer)

    rerender({ contenu: { texte: "A" } })
    const avant = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(avant)
    expect(avant.defaultPrevented).toBe(true)

    await attendre()
    appels[0].arriver()
    await microtaches()
    const apres = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(apres)
    expect(apres.defaultPrevented).toBe(false)
  })

  it("ne réécrit pas au montage un brouillon chargé", async () => {
    const { enregistrer } = creerStockage()
    const { result } = renderHook(() =>
      useDraftAutosave<Contenu>({
        contenu: { texte: "chargé" },
        enregistrer,
        versionInitiale: 3,
      })
    )
    await attendre()
    expect(enregistrer).not.toHaveBeenCalled()
    expect(result.current.nonEnregistre()).toBe(false)
  })

  it("en StrictMode, le montage n'écrit rien avant l'anti-rebond", async () => {
    const { enregistrer } = creerStockage()
    renderHook(
      () => useDraftAutosave<Contenu>({ contenu: { texte: "A" }, enregistrer }),
      { reactStrictMode: true }
    )
    await microtaches()
    expect(enregistrer).not.toHaveBeenCalled()
    await attendre()
    expect(enregistrer).toHaveBeenCalledTimes(1)
  })

  it("renvoie un objet stable d'un rendu à l'autre", () => {
    const { enregistrer } = creerStockage()
    const { result, rerender } = rendre(enregistrer)
    const premier = result.current
    rerender({ contenu: { texte: "A" } })
    rerender({ contenu: { texte: "B" } })
    expect(result.current).toBe(premier)
  })

  it("marquerEnregistre(contenu) marque le nouveau contenu, même avant son rendu", async () => {
    const { enregistrer, appels } = creerStockage()
    const { result, rerender } = rendre(enregistrer)
    rerender({ contenu: { texte: "A" } })
    await attendre()
    appels[0].arriver()
    await microtaches()

    // Dans le gestionnaire de l'enregistrement final : le contenu change et
    // il est aussitôt déclaré rangé, avant le rendu suivant.
    act(() => result.current.marquerEnregistre({ texte: "final" }))
    rerender({ contenu: { texte: "final" } })
    await attendre()
    expect(enregistrer).toHaveBeenCalledTimes(1)
    expect(result.current.nonEnregistre()).toBe(false)
  })

  it("enregistrer reçoit le contenu donné, sans aller-retour par JSON", async () => {
    const enregistrer = vi.fn(async () => 1)
    const date = new Date(2026, 2, 5)
    renderHook(() =>
      useDraftAutosave({ contenu: { quand: date }, enregistrer })
    )
    await attendre()
    // Une Date, pas sa chaîne JSON.
    expect(enregistrer).toHaveBeenCalledWith({ quand: date }, 0)
  })

  it("une fonction appelée depuis un effet de mise en page lit le contenu de ce rendu", async () => {
    const enregistrer = vi.fn(async () => 1)
    const { rerender } = renderHook(
      ({ contenu, quitter }: { contenu: Contenu; quitter: boolean }) => {
        const brouillon = useDraftAutosave<Contenu>({ contenu, enregistrer })
        // L'application range tout dans le même rendu que la dernière frappe.
        useLayoutEffect(() => {
          if (quitter) void brouillon.enregistrerMaintenant()
        }, [brouillon, quitter])
      },
      { initialProps: { contenu: { texte: "A" }, quitter: false } }
    )
    rerender({ contenu: { texte: "AB" }, quitter: true })
    await microtaches()
    expect(enregistrer).toHaveBeenCalledTimes(1)
    expect(enregistrer).toHaveBeenLastCalledWith({ texte: "AB" }, 0)
  })
})
