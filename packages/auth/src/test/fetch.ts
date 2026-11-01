import { vi } from "vitest"

type Reponse = {
  status?: number
  corps?: unknown
  texte?: string
  enTetes?: HeadersInit
}

/** Remplace `fetch` : chaque appel reçoit la réponse rendue par `repondre`. */
export function simulerFetch(
  repondre: (url: string, init: RequestInit) => Reponse | Promise<Reponse>
) {
  const espion = vi.fn(async (url: string, init: RequestInit = {}) => {
    const { status = 200, corps, texte, enTetes } = await repondre(url, init)
    const contenu = texte ?? (corps === undefined ? "" : JSON.stringify(corps))
    return new Response(contenu || null, { status, headers: enTetes })
  })
  vi.stubGlobal("fetch", espion)
  return espion
}
