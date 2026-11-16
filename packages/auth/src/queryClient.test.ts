import { describe, expect, it } from "vitest"

import { ErreurApi } from "./client"
import { creerQueryClient, lectureARetenter } from "./queryClient"

describe("lectureARetenter", () => {
  it("ne retente jamais un refus 4xx", () => {
    for (const status of [400, 401, 403, 404, 409, 422, 499])
      expect(lectureARetenter(0, new ErreurApi(status, "x", "refus"))).toBe(
        false
      )
  })

  it("retente une seule fois une panne : réseau, délai, 5xx, autre erreur", () => {
    const pannes = [
      new ErreurApi(0, "network_error", "réseau"),
      new ErreurApi(0, "delai_depasse", "délai"),
      new ErreurApi(503, "external_service_unavailable", "indisponible"),
      new TypeError("Failed to fetch"),
    ]
    for (const panne of pannes) {
      expect(lectureARetenter(0, panne)).toBe(true)
      expect(lectureARetenter(1, panne)).toBe(false)
    }
  })
})

describe("creerQueryClient", () => {
  it("pose la politique commune", () => {
    const options = creerQueryClient().getDefaultOptions()
    expect(options.queries?.retry).toBe(lectureARetenter)
    expect(options.queries?.refetchOnWindowFocus).toBe(false)
    expect(options.queries?.staleTime).toBe(30_000)
    expect(options.mutations?.retry).toBe(false)
  })

  it("prend un autre staleTime", () => {
    const options = creerQueryClient({ staleTime: 0 }).getDefaultOptions()
    expect(options.queries?.staleTime).toBe(0)
  })

  it("une lecture refusée en 4xx échoue sans nouvel appel", async () => {
    const client = creerQueryClient()
    let appels = 0
    await expect(
      client.fetchQuery({
        queryKey: ["refus"],
        queryFn: () => {
          appels += 1
          throw new ErreurApi(404, "not_found", "Introuvable")
        },
        // fetchQuery ne retente pas par défaut : on reprend la règle du client.
        retry: client.getDefaultOptions().queries?.retry,
        retryDelay: 0,
      })
    ).rejects.toBeInstanceOf(ErreurApi)
    expect(appels).toBe(1)
  })

  it("une lecture en panne est retentée une fois", async () => {
    const client = creerQueryClient()
    let appels = 0
    await expect(
      client.fetchQuery({
        queryKey: ["panne"],
        queryFn: () => {
          appels += 1
          throw new ErreurApi(503, "external_service_unavailable", "Panne")
        },
        retry: client.getDefaultOptions().queries?.retry,
        retryDelay: 0,
      })
    ).rejects.toBeInstanceOf(ErreurApi)
    expect(appels).toBe(2)
  })
})
