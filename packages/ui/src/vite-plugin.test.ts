/// <reference types="node" />
// Code Node, testé sous l'environnement commun (jsdom) : il n'emploie que
// Node et Vite.
import { resolve } from "node:path"
import type { ConfigEnv, Plugin, UserConfig } from "vite"
import { afterEach, describe, expect, it, vi } from "vitest"

import { eticPackagesSources } from "../vite-plugin.js"

// Le checkout courant tient lieu de sources locales : il a ses node_modules.
const UI = resolve(import.meta.dirname)
const RACINE = resolve(UI, "../../..")
const SERVE: ConfigEnv = { command: "serve", mode: "development" }

type Fonction = (...args: never[]) => unknown
const appeler = <T>(hook: unknown, ...args: unknown[]): T =>
  (hook as Fonction).call({}, ...(args as never[])) as T

function configurer(plugin: Plugin) {
  return appeler<UserConfig | undefined>(plugin.config, {}, SERVE)
}

afterEach(() => vi.unstubAllEnvs())

describe("eticPackagesSources (@etic-insa/ui/vite)", () => {
  it("ne s'applique qu'à `vite` en développement, jamais sous vitest", () => {
    const plugin = eticPackagesSources()
    const apply = plugin.apply as (c: UserConfig, e: ConfigEnv) => boolean
    expect(apply({}, SERVE)).toBe(false)
    vi.stubEnv("VITEST", "")
    expect(apply({}, SERVE)).toBe(true)
    expect(apply({}, { ...SERVE, command: "build" })).toBe(false)
  })

  it("sert les sources : alias exacts, une copie de React, accès au checkout", () => {
    vi.stubEnv("ETIC_UI_SOURCES", UI)
    const config = configurer(
      eticPackagesSources({ auth: true, dedupe: ["@tanstack/react-query"] })
    )!
    const alias = config.resolve!.alias as {
      find: RegExp
      replacement: string
    }[]
    const cible = (module: string) =>
      alias.find(({ find }) => find.test(module))?.replacement
    expect(cible("@etic-insa/ui")).toBe(resolve(UI, "index.ts"))
    expect(cible("@etic-insa/ui/styles.css")).toBe(resolve(UI, "styles.css"))
    expect(cible("@etic-insa/ui/test")).toBe(resolve(UI, "testing/index.ts"))
    expect(cible("@etic-insa/ui/charts")).toBe(resolve(UI, "charts/index.ts"))
    expect(cible("@etic-insa/auth")).toBe(
      resolve(RACINE, "packages/auth/src/index.ts")
    )
    expect(
      "@etic-ui/components/etic/save-bar".replace(
        alias.find(({ find }) => find.test("@etic-ui/x"))!.find,
        cible("@etic-ui/x")!
      )
    ).toBe(`${UI}/components/etic/save-bar`)
    // Un autre paquet du même préfixe n'est pas détourné.
    expect(cible("@etic-insa/ui-autre")).toBeUndefined()
    expect(config.resolve!.dedupe).toEqual([
      "react",
      "react-dom",
      "recharts",
      "@tanstack/react-query",
    ])
    expect(config.server!.fs!.allow).toContain(RACINE)
  })

  it("ajoute le @source des sources à la feuille qui importe les styles", () => {
    vi.stubEnv("ETIC_UI_SOURCES", UI)
    const plugin = eticPackagesSources()
    configurer(plugin)
    const feuille =
      '@import "tailwindcss";\n@import "@etic-insa/ui/styles.css";'
    const transformer = (code: string, id: string) =>
      appeler<string | undefined>(plugin.transform, code, id)
    expect(transformer(feuille, "/app/src/index.css?direct")).toContain(
      `@source ${JSON.stringify(UI)};`
    )
    expect(transformer("a {}", "/app/src/autre.css")).toBeUndefined()
  })

  it("ETIC_UI_SOURCES=npm, ou un chemin sans sources : les paquets installés", () => {
    for (const valeur of ["npm", resolve(RACINE, "introuvable/src")]) {
      vi.stubEnv("ETIC_UI_SOURCES", valeur)
      const plugin = eticPackagesSources()
      expect(configurer(plugin)).toBeUndefined()
      expect(
        appeler(
          plugin.transform,
          '@import "@etic-insa/ui/styles.css";',
          "/a.css"
        )
      ).toBeUndefined()
    }
  })
})
