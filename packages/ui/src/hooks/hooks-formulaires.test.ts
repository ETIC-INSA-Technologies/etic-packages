import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useFreshDialog, useLoadOnOpen, useSaveByKey } from "@etic-ui/index"

describe("useFreshDialog", () => {
  it("rien de monté avant la première demande ; une clé neuve à chacune", () => {
    const { result } = renderHook(() => useFreshDialog())
    expect(result.current).toMatchObject({ monte: false, ouvert: false })

    act(() => result.current.ouvrir())
    expect(result.current).toMatchObject({ monte: true, ouvert: true })
    const premiere = result.current.cle

    act(() => result.current.onOuvertChange(false))
    // Fermé mais monté : son animation de sortie se joue.
    expect(result.current).toMatchObject({ monte: true, ouvert: false })

    act(() => result.current.ouvrir())
    expect(result.current.ouvert).toBe(true)
    expect(result.current.cle).not.toBe(premiere)
  })

  it("une demande venue d'ailleurs ouvre aussi", () => {
    const { result, rerender } = renderHook(
      ({ externes }) => useFreshDialog(externes),
      { initialProps: { externes: 0 } }
    )
    rerender({ externes: 1 })
    expect(result.current.ouvert).toBe(true)
  })
})

describe("useLoadOnOpen", () => {
  it("lit à chaque ouverture, oublie à la fermeture", () => {
    const lecture = { mutate: vi.fn(), reset: vi.fn() }
    const { result, rerender } = renderHook(
      ({ ouvert }) => useLoadOnOpen(lecture, ouvert),
      { initialProps: { ouvert: false } }
    )
    expect(lecture.mutate).not.toHaveBeenCalled()
    rerender({ ouvert: true })
    expect(lecture.mutate).toHaveBeenCalledOnce()
    rerender({ ouvert: false })
    expect(lecture.reset).toHaveBeenCalledOnce()
    act(() => result.current())
    expect(lecture.mutate).toHaveBeenCalledTimes(2)
  })

  it("une lecture écrite en ligne ne relit pas à chaque rendu", () => {
    const mutate = vi.fn()
    const reset = vi.fn()
    const { result, rerender } = renderHook(
      ({ ouvert }) =>
        useLoadOnOpen({ mutate: () => mutate(), reset: () => reset() }, ouvert),
      { initialProps: { ouvert: true } }
    )
    const relire = result.current
    rerender({ ouvert: true })
    rerender({ ouvert: true })
    expect(mutate).toHaveBeenCalledOnce()
    expect(reset).not.toHaveBeenCalled()
    expect(result.current).toBe(relire)
    rerender({ ouvert: false })
    expect(reset).toHaveBeenCalledOnce()
  })
})

describe("useSaveByKey", () => {
  const refusDe = (erreur: unknown) =>
    erreur instanceof RangeError ? erreur.message : null

  it("un refus reste sous son champ, les suivantes partent", async () => {
    const envoyer = vi.fn(async ({ cle }: { cle: string }) => {
      if (cle === "b") throw new RangeError("Trop grand")
    })
    const { result } = renderHook(() => useSaveByKey<string>())
    await act(() =>
      result.current.enregistrer(
        [{ cle: "a" }, { cle: "b" }, { cle: "c" }],
        envoyer,
        refusDe
      )
    )
    expect(envoyer).toHaveBeenCalledTimes(3)
    expect(result.current.refus).toEqual({ b: "Trop grand" })
    expect(result.current.enregistre).toBe(false)
    expect(result.current.panne).toBeNull()

    act(() => result.current.saisieChangee("b"))
    expect(result.current.refus).toEqual({})
  })

  it("une panne arrête l'enregistrement", async () => {
    const panne = new Error("Réseau")
    const envoyer = vi.fn(async ({ cle }: { cle: string }) => {
      if (cle === "a") throw panne
    })
    const { result } = renderHook(() => useSaveByKey<string>())
    await act(() =>
      result.current.enregistrer([{ cle: "a" }, { cle: "b" }], envoyer, refusDe)
    )
    expect(envoyer).toHaveBeenCalledOnce()
    expect(result.current.panne).toBe(panne)
    expect(result.current.enCours).toBe(false)

    act(() => result.current.oublierTout())
    expect(result.current.panne).toBeNull()
  })

  it("tout est parti : enregistré", async () => {
    const { result } = renderHook(() => useSaveByKey<string>())
    await act(() =>
      result.current.enregistrer([{ cle: "a" }], async () => {}, refusDe)
    )
    expect(result.current.enregistre).toBe(true)
  })
})
