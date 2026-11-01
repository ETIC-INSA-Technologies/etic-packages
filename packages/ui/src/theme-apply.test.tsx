/// <reference types="node" />
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  appliquerEtMemoriserTheme,
  appliquerTheme,
  CLE_THEME,
  estThemePreference,
  THEMES,
  useThemeApplique,
} from "@etic-ui/index"

const html = document.documentElement
const sombre = () => html.classList.contains("dark")

// Réglage du système simulé : `changer` le modifie et prévient les écouteurs
// de la requête média, comme le navigateur.
function simulerSysteme(sombreAuDepart: boolean) {
  const systeme = {
    sombre: sombreAuDepart,
    ecouteurs: new Set<() => void>(),
    changer(valeur: boolean) {
      systeme.sombre = valeur
      for (const ecouteur of systeme.ecouteurs) ecouteur()
    },
  }
  vi.stubGlobal("matchMedia", (requete: string) => ({
    get matches() {
      return systeme.sombre && requete === "(prefers-color-scheme: dark)"
    },
    addEventListener: (_: string, f: () => void) => systeme.ecouteurs.add(f),
    removeEventListener: (_: string, f: () => void) =>
      systeme.ecouteurs.delete(f),
  }))
  return systeme
}

afterEach(() => {
  // « light » désabonne l'écoute du système avant de retirer le simulacre.
  appliquerTheme("light")
  vi.unstubAllGlobals()
  localStorage.clear()
  html.classList.remove("dark")
})

describe("appliquerTheme", () => {
  it("pose ou retire la classe dark, quel que soit le système", () => {
    simulerSysteme(false)
    appliquerTheme("dark")
    expect(sombre()).toBe(true)

    simulerSysteme(true)
    appliquerTheme("light")
    expect(sombre()).toBe(false)
  })

  it("en « system », suit le système, y compris quand il change", () => {
    const systeme = simulerSysteme(true)
    appliquerTheme("system")
    expect(sombre()).toBe(true)

    systeme.changer(false)
    expect(sombre()).toBe(false)
    systeme.changer(true)
    expect(sombre()).toBe(true)
  })

  it("un choix explicite cesse de suivre le système", () => {
    const systeme = simulerSysteme(false)
    appliquerTheme("system")
    expect(systeme.ecouteurs.size).toBe(1)

    appliquerTheme("light")
    expect(systeme.ecouteurs.size).toBe(0)
    systeme.changer(true)
    expect(sombre()).toBe(false)
  })

  it("n'écoute le système qu'une fois, même appliqué plusieurs fois", () => {
    const systeme = simulerSysteme(false)
    appliquerTheme("system")
    appliquerTheme("system")
    expect(systeme.ecouteurs.size).toBe(1)
  })

  it("sans matchMedia, « system » reste clair", () => {
    vi.stubGlobal("matchMedia", undefined)
    appliquerTheme("system")
    expect(sombre()).toBe(false)
  })
})

describe("préférences", () => {
  it("trois valeurs, dans l'ordre du menu", () => {
    expect(THEMES).toEqual(["light", "system", "dark"])
    expect(THEMES.every(estThemePreference)).toBe(true)
    expect(estThemePreference("auto")).toBe(false)
    expect(estThemePreference(null)).toBe(false)
  })

  it("appliquerEtMemoriserTheme garde une copie locale", () => {
    simulerSysteme(false)
    appliquerEtMemoriserTheme("dark")
    expect(sombre()).toBe(true)
    expect(localStorage.getItem(CLE_THEME)).toBe("dark")
  })

  it("stockage indisponible : le thème s'applique quand même", () => {
    simulerSysteme(false)
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("refusé")
      })
    expect(() => appliquerEtMemoriserTheme("dark")).not.toThrow()
    expect(sombre()).toBe(true)
    setItem.mockRestore()
  })
})

describe("useThemeApplique", () => {
  beforeEach(() => {
    simulerSysteme(false)
  })

  it("rien tant que le thème du compte est inconnu, puis l'applique et le mémorise", () => {
    html.classList.add("dark") // peint par theme-boot.js
    const { rerender } = renderHook(({ theme }) => useThemeApplique(theme), {
      initialProps: { theme: undefined as "light" | "dark" | undefined },
    })
    expect(sombre()).toBe(true)
    expect(localStorage.getItem(CLE_THEME)).toBeNull()

    rerender({ theme: "light" })
    expect(sombre()).toBe(false)
    expect(localStorage.getItem(CLE_THEME)).toBe("light")
  })

  it("suit un changement fait dans un autre onglet", () => {
    const rappel = vi.fn()
    renderHook(() => useThemeApplique("light", rappel))

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: CLE_THEME, newValue: "dark" })
      )
    })
    expect(sombre()).toBe(true)
    expect(rappel).toHaveBeenCalledWith("dark")

    // Autre clé ou valeur inconnue : ignorées.
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "autre", newValue: "light" })
      )
      window.dispatchEvent(
        new StorageEvent("storage", { key: CLE_THEME, newValue: "bleu" })
      )
    })
    expect(sombre()).toBe(true)
    expect(rappel).toHaveBeenCalledTimes(1)
  })

  it("cesse d'écouter les autres onglets une fois démonté", () => {
    const rappel = vi.fn()
    const { unmount } = renderHook(() => useThemeApplique("light", rappel))
    unmount()
    window.dispatchEvent(
      new StorageEvent("storage", { key: CLE_THEME, newValue: "dark" })
    )
    expect(rappel).not.toHaveBeenCalled()
  })
})

describe("theme-boot.js", () => {
  const script = readFileSync(
    resolve(import.meta.dirname, "theme-boot.js"),
    "utf8"
  )
  // Exécuté comme le navigateur exécute un script classique.
  const demarrer = () => new Function(script)()

  it("relit la même clé que theme.ts", () => {
    expect(script).toContain(`localStorage.getItem("${CLE_THEME}")`)
  })

  it.each([
    { memorise: "dark", systeme: false, attendu: true },
    { memorise: "light", systeme: true, attendu: false },
    { memorise: "system", systeme: true, attendu: true },
    { memorise: "system", systeme: false, attendu: false },
    { memorise: null, systeme: true, attendu: true },
    { memorise: null, systeme: false, attendu: false },
  ])(
    "thème mémorisé $memorise, système sombre $systeme : sombre $attendu",
    ({ memorise, systeme, attendu }) => {
      simulerSysteme(systeme)
      if (memorise) localStorage.setItem(CLE_THEME, memorise)
      demarrer()
      expect(sombre()).toBe(attendu)
    }
  )

  it("stockage inaccessible : le thème du système, sans erreur", () => {
    simulerSysteme(true)
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("refusé")
      })
    expect(demarrer).not.toThrow()
    expect(sombre()).toBe(true)
    getItem.mockRestore()
  })
})
