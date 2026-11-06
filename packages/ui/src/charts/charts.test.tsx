/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { render } from "@testing-library/react"
import { Bar, BarChart } from "recharts"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { ChartContainer, type ChartConfig } from "@etic-ui/charts"
import * as index from "@etic-ui/index"

const SRC = resolve(import.meta.dirname, "..")

/** Fichiers source de la bibliothèque (tests exclus), relatifs à src/. */
function sources(dossier = SRC): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name)
    if (entree.isDirectory()) return sources(chemin)
    return /\.tsx?$/.test(entree.name) && !entree.name.includes(".test.")
      ? [relative(SRC, chemin)]
      : []
  })
}

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

  it("seul chart.tsx importe recharts, et l'index principal ne l'exporte pas", () => {
    // recharts est une dépendance pair facultative : une application sans
    // graphique ne l'a pas, et l'index ne doit jamais le charger.
    const importateurs = sources().filter((fichier) =>
      /from "recharts"/.test(readFileSync(join(SRC, fichier), "utf8"))
    )
    expect(importateurs).toEqual(["components/ui/chart.tsx"])
    expect(Object.keys(index)).not.toContain("ChartContainer")
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
