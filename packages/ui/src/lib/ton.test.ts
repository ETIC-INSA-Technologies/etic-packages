import type { VariantProps } from "class-variance-authority"
import { describe, expect, expectTypeOf, it } from "vitest"

import { badgeVariants } from "@etic-ui/components/ui/badge"
import { TONS, type ClassesTon } from "@etic-ui/lib/ton"

describe("TONS", () => {
  it("la variante de badge de chaque ton est une variante de Badge", () => {
    expectTypeOf<ClassesTon["badge"]>().toEqualTypeOf<
      NonNullable<VariantProps<typeof badgeVariants>["variant"]>
    >()
    for (const { badge } of Object.values(TONS))
      expect(() => badgeVariants({ variant: badge })).not.toThrow()
  })

  it("segment choisi : fond plus soutenu en sombre, comme la bascule", () => {
    for (const [ton, classes] of Object.entries(TONS)) {
      if (ton === "neutral") continue
      expect(classes.segmentChoisi).toContain(`dark:aria-pressed:bg-${ton}/25`)
      expect(classes.basculeActive).toContain(`dark:aria-pressed:bg-${ton}/20`)
    }
  })
})
