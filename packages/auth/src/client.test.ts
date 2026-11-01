import { afterEach, describe, expect, it, vi } from "vitest"
import {
  chaineRequete,
  CODE_DELAI_DEPASSE,
  CODE_REDIRECTION_REFUSEE,
  CODE_REPONSE_NON_JSON,
  CODE_RESEAU,
  creerClientAuth,
  creerClientHttp,
  ErreurApi,
} from "./client"
import { simulerFetch } from "./test/fetch"

afterEach(() => {
  vi.unstubAllGlobals()
})

/** `promesse.then(rate, echec)` : l'erreur levée, typée ; un succès fait
 *  échouer le test. */
const rate = (): never => {
  throw new Error("La requête devait échouer.")
}
const echec = (e: unknown) => e as ErreurApi

/** `RequestInit` du `i`-ième appel à `fetch`. */
function initDe(espion: { mock: { calls: unknown[][] } }, i: number) {
  return (espion.mock.calls[i]?.[1] ?? {}) as RequestInit
}

describe("client d'authentification", () => {
  it("envoie le cookie et lit /me", async () => {
    const espion = simulerFetch(() => ({ corps: { membre_id: "m1" } }))
    const me = await creerClientAuth().lireMe()
    expect(me.membre_id).toBe("m1")
    const [url, init] = espion.mock.calls[0]
    expect(url).toBe("/api/v1/auth/me")
    expect(init?.credentials).toBe("include")
  })

  it("lit l'enveloppe d'erreur", async () => {
    simulerFetch(() => ({
      status: 401,
      corps: {
        error: {
          code: "unauthenticated",
          message: "Votre session a expiré.",
          details: { action: "relancer_authorize" },
        },
      },
    }))
    const erreur = await creerClientAuth().lireMe().then(rate, echec)
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur.status).toBe(401)
    expect(erreur.details).toEqual({ action: "relancer_authorize" })
    expect(erreur.reconnexionRequise).toBe(true)
  })

  it("donne un message lisible sans enveloppe", async () => {
    simulerFetch(() => ({ status: 502, texte: "<html>Bad gateway</html>" }))
    const erreur = await creerClientAuth().lireMe().then(rate, echec)
    expect(erreur.code).toBe("external_service_unavailable")
    expect(erreur.serviceIndisponible).toBe(true)
  })

  it("refuse un 200 qui n'est pas du JSON", async () => {
    simulerFetch(() => ({ texte: "<!doctype html>" }))
    const erreur = await creerClientAuth().lireMe().then(rate, echec)
    expect(erreur.code).toBe(CODE_REPONSE_NON_JSON)
  })

  it("distingue l'erreur réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")))
    const erreur = await creerClientAuth().lireMe().then(rate, echec)
    expect(erreur.code).toBe(CODE_RESEAU)
    expect(erreur.status).toBe(0)
  })

  it("construit l'URL de connexion avec le préfixe", () => {
    expect(creerClientAuth("/api/auth/").urlConnexion("/a?b=1")).toBe(
      "/api/auth/login?suivant=%2Fa%3Fb%3D1"
    )
  })
})

const JETON = "jeton-secret-de-test"

/** `fetch` qui ne répond jamais, sauf par un rejet quand son signal s'abaisse. */
function fetchMuet() {
  const espion = vi.fn(
    (_url: string, init: RequestInit = {}) =>
      new Promise<Response>((_resoudre, rejeter) => {
        init.signal?.addEventListener("abort", () =>
          rejeter(new DOMException("annulé", "AbortError"))
        )
      })
  )
  vi.stubGlobal("fetch", espion)
  return espion
}

/** Le jeton n'apparaît nulle part dans l'erreur : message, détails, pile. */
function sansJeton(erreur: unknown) {
  const e = erreur as ErreurApi
  expect(
    JSON.stringify({ m: e.message, d: e.details, c: e.code, p: e.stack })
  ).not.toContain(JETON)
}

describe("client HTTP commun", () => {
  it("ErreurApi : statut, code et détails de l'enveloppe", async () => {
    simulerFetch(() => ({
      status: 409,
      corps: {
        error: {
          code: "confirm_required",
          message: "Confirmer la suppression.",
          details: { membres: 3 },
        },
      },
    }))
    const erreur = await creerClientHttp({ base: "/api/v1" })
      .delete("/poles/p1")
      .then(rate, echec)
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur.status).toBe(409)
    expect(erreur.code).toBe("confirm_required")
    expect(erreur.message).toBe("Confirmer la suppression.")
    expect(erreur.details).toEqual({ membres: 3 })
  })

  it("repli par statut quand le corps n'est pas une enveloppe", async () => {
    simulerFetch(() => ({ status: 404, texte: "Not Found" }))
    const erreur = await creerClientHttp().get("/x").then(rate, echec)
    expect(erreur.code).toBe("not_found")
    expect(erreur.message).toBe("Ressource introuvable.")
    expect(erreur.details).toBeNull()
  })

  it("repli par statut : table, puis 5xx et autres 4xx", async () => {
    const attendus: [number, string][] = [
      [401, "unauthenticated"],
      [403, "forbidden"],
      [409, "conflict"],
      [422, "validation_error"],
      [501, "not_implemented"],
      [502, "external_service_unavailable"],
      [503, "external_service_unavailable"],
      [500, "internal_error"],
      [504, "internal_error"],
      [400, "http_400"],
      [418, "http_418"],
    ]
    for (const [status, code] of attendus) {
      simulerFetch(() => ({ status }))
      const erreur = await creerClientHttp().get("/x").then(rate, echec)
      expect(erreur.code).toBe(code)
      expect(erreur.message).not.toBe("")
    }
  })

  it("envoie le jeton fourni par l'application, lu à chaque requête", async () => {
    let jeton: string | null = JETON
    const espion = simulerFetch(() => ({ corps: { ok: true } }))
    const client = creerClientHttp({ base: "/api/v1/", jeton: () => jeton })
    await client.get("/me")
    expect(espion.mock.calls[0]?.[0]).toBe("/api/v1/me")
    const init = initDe(espion, 0)
    const enTetes = new Headers(init.headers)
    expect(enTetes.get("Authorization")).toBe(`Bearer ${JETON}`)
    expect(init.redirect).toBe("manual")
    expect(init.credentials).toBeUndefined()

    jeton = null
    await client.get("/me")
    const init2 = initDe(espion, 1)
    expect(new Headers(init2.headers).has("Authorization")).toBe(false)
  })

  it("refuse les redirections par défaut avec un jeton, les suit sinon", async () => {
    const espion = simulerFetch(() => ({ corps: {} }))
    await creerClientHttp({ jeton: () => JETON }).get("/a")
    await creerClientHttp().get("/b")
    await creerClientHttp({
      jeton: () => JETON,
      redirections: "suivies",
    }).get("/c")
    await creerClientHttp({ redirections: "refusees" }).get("/d")
    expect(initDe(espion, 0).redirect).toBe("manual")
    expect(initDe(espion, 1).redirect).toBe("follow")
    expect(initDe(espion, 2).redirect).toBe("follow")
    expect(initDe(espion, 3).redirect).toBe("manual")
  })

  it("construit une URL complète pour une navigation", () => {
    const client = creerClientHttp({ base: "https://api.exemple.org/v1/" })
    expect(client.url("/login", { suivant: "/a?b=1", vide: "" })).toBe(
      "https://api.exemple.org/v1/login?suivant=%2Fa%3Fb%3D1"
    )
    expect(() => client.url("//evil.example")).toThrow(TypeError)
  })

  it("ne laisse pas un en-tête de l'appelant poser un jeton", async () => {
    const espion = simulerFetch(() => ({ corps: {} }))
    await creerClientHttp().get("/x", {
      enTetes: { Authorization: "Bearer autre" },
    })
    const init = initDe(espion, 0)
    expect(new Headers(init.headers).has("Authorization")).toBe(false)
  })

  it("ne suit pas une redirection quand le jeton est envoyé", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        type: "opaqueredirect",
        ok: false,
        status: 0,
        headers: new Headers(),
      })
    )
    const erreur = await creerClientHttp({ jeton: () => JETON })
      .get("/x")
      .then(rate, echec)
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur.code).toBe(CODE_REDIRECTION_REFUSEE)
    sansJeton(erreur)
  })

  it("refuse un chemin qui mènerait à une autre origine", async () => {
    const espion = simulerFetch(() => ({ corps: {} }))
    const client = creerClientHttp({ jeton: () => JETON })
    const chemins = ["//evil.example/x", "/\\evil.example", "https://e.x", "x"]
    for (const chemin of chemins) {
      await expect(client.get(chemin)).rejects.toThrow(TypeError)
    }
    expect(espion).not.toHaveBeenCalled()
  })

  it("le jeton n'entre dans aucune erreur, quel que soit l'échec", async () => {
    const client = creerClientHttp({ jeton: () => JETON, delaiMax: 20 })
    const erreurs: unknown[] = []
    simulerFetch(() => ({ status: 500, texte: "boom" }))
    erreurs.push(await client.get("/x").then(rate, echec))
    simulerFetch(() => ({ texte: "<!doctype html>" }))
    erreurs.push(await client.get("/x").then(rate, echec))
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")))
    erreurs.push(await client.get("/x").then(rate, echec))
    fetchMuet()
    erreurs.push(await client.get("/x").then(rate, echec))
    for (const erreur of erreurs) {
      expect(erreur).toBeInstanceOf(ErreurApi)
      sansJeton(erreur)
    }
  })

  it("abandonne après le délai maximal, avec une erreur distincte", async () => {
    fetchMuet()
    const erreur = await creerClientHttp({ delaiMax: 20 })
      .get("/lent")
      .then(rate, echec)
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur.code).toBe(CODE_DELAI_DEPASSE)
    expect(erreur.status).toBe(0)
  })

  it("laisse passer l'annulation voulue par l'appelant", async () => {
    fetchMuet()
    const controleur = new AbortController()
    const promesse = creerClientHttp()
      .get("/x", { signal: controleur.signal })
      .then(rate, echec)
    controleur.abort()
    const erreur = await promesse
    expect(erreur).not.toBeInstanceOf(ErreurApi)
    expect(erreur.name).toBe("AbortError")
  })

  it("signale une page HTML reçue à la place de JSON", async () => {
    simulerFetch(() => ({
      texte: "<!doctype html><html></html>",
      enTetes: { "content-type": "text/html; charset=utf-8" },
    }))
    const erreur = await creerClientHttp().get("/membres").then(rate, echec)
    expect(erreur.code).toBe(CODE_REPONSE_NON_JSON)
    expect(erreur.message).toMatch(/page HTML/)
    expect(erreur.details).toEqual({
      content_type: "text/html; charset=utf-8",
    })
  })

  it("signale un corps non JSON qui n'est pas du HTML", async () => {
    simulerFetch(() => ({
      texte: "ok",
      enTetes: { "content-type": "text/plain" },
    }))
    const erreur = await creerClientHttp().get("/x").then(rate, echec)
    expect(erreur.code).toBe(CODE_REPONSE_NON_JSON)
    expect(erreur.message).not.toMatch(/HTML/)
  })

  it("signale une page HTML reçue à la place d'un fichier", async () => {
    simulerFetch(() => ({
      texte: "<!doctype html>",
      enTetes: { "content-type": "text/html" },
    }))
    const erreur = await creerClientHttp()
      .lireBlob("/membres/m1/photo")
      .then(rate, echec)
    expect(erreur.code).toBe(CODE_REPONSE_NON_JSON)
    expect(erreur.message).toMatch(/page HTML/)
  })

  it("lit un fichier", async () => {
    simulerFetch(() => ({
      texte: "abc",
      enTetes: { "content-type": "image/png" },
    }))
    const blob = await creerClientHttp().lireBlob("/photo")
    expect(blob.size).toBe(3)
  })

  it("rend undefined pour une réponse vide (204)", async () => {
    simulerFetch(() => ({ status: 204 }))
    await expect(creerClientHttp().delete("/x")).resolves.toBeUndefined()
  })

  it("sérialise le corps en JSON, sauf FormData, Blob, URLSearchParams…", async () => {
    const espion = simulerFetch(() => ({ corps: {} }))
    const client = creerClientHttp()
    await client.post("/a", { nom: "Ada" })
    const init = initDe(espion, 0)
    expect(init.method).toBe("POST")
    expect(init.body).toBe('{"nom":"Ada"}')
    expect(new Headers(init.headers).get("Content-Type")).toBe(
      "application/json"
    )

    const bruts = [
      new FormData(),
      new Blob(["x"]),
      new URLSearchParams("a=1"),
      new ArrayBuffer(2),
    ]
    for (const [i, corps] of bruts.entries()) {
      await client.post("/b", corps)
      const init2 = initDe(espion, i + 1)
      expect(init2.body).toBe(corps)
      expect(new Headers(init2.headers).has("Content-Type")).toBe(false)
    }
  })

  it("passe la politique de cookie du client ou de la requête", async () => {
    const espion = simulerFetch(() => ({ corps: {} }))
    await creerClientHttp().post("/sso/session", undefined, {
      credentials: "include",
    })
    await creerClientHttp({ credentials: "include" }).get("/x")
    expect(initDe(espion, 0).credentials).toBe("include")
    expect(initDe(espion, 1).credentials).toBe("include")
  })

  it("appelle surNonAuthentifie sur un 401 seulement", async () => {
    const surNonAuthentifie = vi.fn()
    const client = creerClientHttp({ surNonAuthentifie })
    simulerFetch(() => ({ status: 403 }))
    await client.get("/x").catch(() => {})
    expect(surNonAuthentifie).not.toHaveBeenCalled()
    simulerFetch(() => ({ status: 401 }))
    const erreur = await client.get("/x").then(rate, echec)
    expect(surNonAuthentifie).toHaveBeenCalledWith(erreur)
    expect(erreur.code).toBe("unauthenticated")
  })

  it("construit la chaîne de requête sans valeurs vides, tableaux répétés", async () => {
    expect(
      chaineRequete({ q: "a b", vide: "", n: null, u: undefined, f: false })
    ).toBe("?q=a+b&f=false")
    expect(chaineRequete({ type: ["CE", "BC"] })).toBe("?type=CE&type=BC")
    expect(chaineRequete({})).toBe("")
    const espion = simulerFetch(() => ({ corps: [] }))
    await creerClientHttp({ base: "/api" }).get("/m", { query: { page: 2 } })
    expect(espion.mock.calls[0]?.[0]).toBe("/api/m?page=2")
  })
})
