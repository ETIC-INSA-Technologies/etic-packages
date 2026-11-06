/// <reference types="node" />
import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { render } from "@testing-library/react"
import { Bar, BarChart } from "recharts"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { ChartContainer, type ChartConfig } from "@etic-ui/charts"

const SRC = resolve(import.meta.dirname, "..")

// `from "x"`, `import "x"`, `import("x")` ; les imports de types aussi
// (ils passent dans les .d.ts publiés).
const IMPORT = /\b(?:from|import)\s*\(?\s*["']([^"']+)["']/g

/** Le fichier source d'un import local (`@etic-ui/…` ou relatif), `null`
 *  pour un paquet. */
function resoudre(depuis: string, specificateur: string): string | null {
  let base: string
  if (specificateur.startsWith("@etic-ui/"))
    base = join(SRC, specificateur.slice("@etic-ui/".length))
  else if (specificateur.startsWith("."))
    base = resolve(dirname(depuis), specificateur)
  else return null
  for (const chemin of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
  ])
    if (existsSync(chemin) && statSync(chemin).isFile()) return chemin
  throw new Error(`Import introuvable : « ${specificateur} » dans ${depuis}`)
}

/** Les paquets qu'atteint une entrée, imports indirects compris. */
function paquetsAtteints(entree: string): Set<string> {
  const paquets = new Set<string>()
  const vus = new Set<string>()
  const aVoir = [join(SRC, entree)]
  for (let fichier = aVoir.pop(); fichier; fichier = aVoir.pop()) {
    if (vus.has(fichier)) continue
    vus.add(fichier)
    for (const [, specificateur] of readFileSync(fichier, "utf8").matchAll(
      IMPORT
    )) {
      const local = resoudre(fichier, specificateur)
      if (local) aVoir.push(local)
      else paquets.add(specificateur)
    }
  }
  return paquets
}

const estRecharts = (paquet: string) =>
  paquet === "recharts" || paquet.startsWith("recharts/")

describe("@etic-insa/ui/charts", () => {
  beforeAll(() => {
    // jsdom n'a pas ResizeObserver, qu'emploie le ResponsiveContainer.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
  })

  it("seule l'entrée charts atteint recharts, même par un import indirect", () => {
    // recharts est une dépendance pair facultative : une application sans
    // graphique ne l'a pas, et l'index ne doit jamais le charger.
    expect([...paquetsAtteints("index.ts")].filter(estRecharts)).toEqual([])
    expect(
      [...paquetsAtteints("testing/index.ts")].filter(estRecharts)
    ).toEqual([])
    // Le parcours voit bien recharts là où il est.
    expect([...paquetsAtteints("charts/index.ts")].filter(estRecharts)).toEqual(
      ["recharts"]
    )
  })

  it("ChartContainer : couleurs de la config en variables CSS, en clair et en sombre", () => {
    const config = {
      cpu: { label: "Processeur", color: "var(--color-success)" },
      memoire: {
        label: "Mémoire",
        theme: { light: "#2f5fdb", dark: "#6d92f2" },
      },
    } satisfies ChartConfig
    const { container } = render(
      <ChartContainer config={config} className="h-48 w-full">
        <BarChart data={[{ cpu: 40, memoire: 60 }]}>
          <Bar dataKey="cpu" fill="var(--color-cpu)" />
        </BarChart>
      </ChartContainer>
    )
    const graphique = container.querySelector('[data-slot="chart"]')!
    expect(graphique).toHaveClass("h-48", "w-full")
    const id = graphique.getAttribute("data-chart")
    const style = container.querySelector("style")!.textContent!
    expect(style).toContain(`[data-chart=${id}]`)
    expect(style).toContain("--color-cpu: var(--color-success);")
    expect(style).toContain("--color-memoire: #2f5fdb;")
    expect(style).toContain(`.dark [data-chart=${id}]`)
    expect(style).toContain("--color-memoire: #6d92f2;")
  })
})
