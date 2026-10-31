/// <reference types="node" />
// Écarts assumés avec shadcn dans ui/ et hooks/ (voir le README) : un
// `npx shadcn add --overwrite` les effacerait sans bruit.
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { MOBILE_MEDIA_QUERY } from "@etic-ui/hooks/use-mobile"

const lire = (chemin: string) =>
  readFileSync(resolve(import.meta.dirname, chemin), "utf8")

describe("écarts avec shadcn", () => {
  it("seuil mobile à 1 024 px compris, en JS comme en CSS", () => {
    expect(MOBILE_MEDIA_QUERY).toBe("(width < 1025px)")
    const sidebar = lire("components/ui/sidebar.tsx")
    expect(sidebar).not.toMatch(/\bmd:/)
    expect(sidebar).toContain("min-[1025px]:block")
  })

  it("textes des lecteurs d'écran en français", () => {
    expect(lire("components/ui/sidebar.tsx")).not.toContain("Toggle Sidebar")
    expect(lire("components/ui/sheet.tsx")).toContain(">Fermer<")
  })
})
