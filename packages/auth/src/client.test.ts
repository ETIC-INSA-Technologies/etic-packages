import { afterEach, describe, expect, it, vi } from "vitest"
import {
  chaineRequete,
  CODE_DELAI_DEPASSE,
  CODE_NON_MODIFIE,
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
        const annuler = () => rejeter(new DOMException("annulé", "AbortError"))
        if (init.signal?.aborted) annuler()
        init.signal?.addEventListener("abort", annuler)
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
    expect(erreur.message).toBe("Ressource introuvable. (HTTP 404)")
    expect(erreur.details).toBeNull()
  })

  it("repli : le statut HTTP à la fin du message, quel qu'il soit", async () => {
    // Message de plusieurs phrases ou avec « : » : rien n'est inséré au
    // milieu, le statut s'ajoute à la fin.
    const attendus: [number, string][] = [
      [413, "La requête n'a pas abouti. (HTTP 413)"],
      [500, "Erreur interne du serveur. (HTTP 500)"],
      [401, "Session expirée ou absente. Reconnectez-vous. (HTTP 401)"],
      [
        503,
        "Un service est momentanément indisponible. Réessayez dans quelques instants. (HTTP 503)",
      ],
    ]
    for (const [status, message] of attendus) {
      // Corps vide, page HTML d'un proxy : même repli.
      for (const texte of [undefined, "<html>Erreur</html>"]) {
        simulerFetch(() => ({ status, texte }))
        const erreur = await creerClientHttp().get("/x").then(rate, echec)
        expect(erreur.status).toBe(status)
        expect(erreur.message).toBe(message)
      }
    }
    // Enveloppe sans message : le repli, statut compris.
    simulerFetch(() => ({
      status: 409,
      corps: { error: { code: "conflict", message: " " } },
    }))
    const erreur = await creerClientHttp().get("/x").then(rate, echec)
    expect(erreur.message).toBe(
      "Conflit : la ressource a changé entre-temps. (HTTP 409)"
    )
  })

  it("304 Not Modified : `not_modified`, pas une redirection refusée", async () => {
    for (const redirections of ["refusees", "suivies"] as const) {
      simulerFetch(() => ({ status: 304 }))
      const client = creerClientHttp({ jeton: () => JETON, redirections })
      for (const lire of [
        () => client.get("/x", { enTetes: { "If-None-Match": '"v1"' } }),
        () => client.lireBlob("/photo"),
      ]) {
        const erreur = await lire().then(rate, echec)
        expect(erreur).toBeInstanceOf(ErreurApi)
        expect(erreur.status).toBe(304)
        expect(erreur.code).toBe(CODE_NON_MODIFIE)
        expect(erreur.message).toContain("(HTTP 304)")
        expect(erreur.reconnexionRequise).toBe(false)
        sansJeton(erreur)
      }
    }
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

  it("refuse une redirection reçue en 3xx (Node, undici)", async () => {
    for (const status of [301, 302, 307, 308]) {
      simulerFetch(() => ({ status }))
      const erreur = await creerClientHttp({ jeton: () => JETON })
        .get("/x")
        .then(rate, echec)
      expect(erreur.code).toBe(CODE_REDIRECTION_REFUSEE)
    }
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
    const chemins = [
      "/\t/evil.example/x",
      "/\r/evil.example/x",
      "/\n/evil.example/x",
      "/\\evil.example",
      "//evil.example/x",
      "https://evil.example/x",
      "x",
      "/a b",
      "/a\u0000",
    ]
    for (const base of ["", "/api", "https://api.exemple.org/v1"]) {
      const client = creerClientHttp({ base, jeton: () => JETON })
      for (const chemin of chemins) {
        await expect(client.get(chemin), `${base} ${chemin}`).rejects.toThrow(
          TypeError
        )
        expect(() => client.url(chemin)).toThrow(TypeError)
      }
    }
    expect(espion).not.toHaveBeenCalled()
  })

  it("résout base et chemins sur une même adresse de référence", async () => {
    // Client créé hors navigateur (pas de `location`), `location` présent
    // ensuite : la base et le chemin restent résolus sur la même référence,
    // aucun chemin n'est refusé.
    vi.stubGlobal("location", undefined)
    const client = creerClientHttp({ base: "/api" })
    vi.unstubAllGlobals()
    expect(globalThis.location?.href).toBeTruthy()
    const espion = simulerFetch(() => ({ corps: {} }))
    await expect(client.get("/x")).resolves.toEqual({})
    expect(espion.mock.calls[0]?.[0]).toBe("/api/x")
    expect(client.url("/x")).toBe("/api/x")
  })

  it("base malformée : la création réussit, chaque requête est rejetée", async () => {
    const espion = simulerFetch(() => ({ corps: {} }))
    // Variable d'environnement mal saisie : l'import du module qui crée le
    // client ne doit pas échouer.
    const client = creerClientHttp({ base: "https://[api.exemple.org" })
    for (let i = 0; i < 2; i++) {
      await expect(client.get("/x")).rejects.toThrow(
        /Base d'API invalide : « https:\/\/\[api\.exemple\.org »/
      )
    }
    expect(() => client.url("/x")).toThrow(TypeError)
    expect(espion).not.toHaveBeenCalled()
  })

  it("garde %2F%2F comme un chemin", async () => {
    const espion = simulerFetch(() => ({ corps: {} }))
    await creerClientHttp({ base: "/api", jeton: () => JETON }).get(
      "/%2F%2Fevil.example/x"
    )
    expect(espion.mock.calls[0]?.[0]).toBe("/api/%2F%2Fevil.example/x")
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

  it("valide delaiMax : RangeError pour ≤ 0 ou non fini, plafond 2^31-1", () => {
    for (const delaiMax of [0, -1, NaN, -Infinity]) {
      expect(() => creerClientHttp({ delaiMax })).toThrow(RangeError)
    }
    expect(() => creerClientHttp({ delaiMax: Infinity })).not.toThrow()
    expect(() => creerClientHttp({ delaiMax: null })).not.toThrow()
  })

  it("plafonne le délai à 2^31-1 et ne pose aucune minuterie sans délai", async () => {
    const minuterie = vi.spyOn(globalThis, "setTimeout")
    try {
      simulerFetch(() => ({ corps: {} }))
      await creerClientHttp({ delaiMax: 2 ** 40 }).get("/x")
      expect(minuterie).toHaveBeenCalledTimes(1)
      expect(minuterie.mock.calls[0]?.[1]).toBe(2 ** 31 - 1)
      minuterie.mockClear()
      await creerClientHttp({ delaiMax: Infinity }).get("/x")
      await creerClientHttp({ delaiMax: null }).get("/x")
      await creerClientHttp().get("/x", { delaiMax: null })
      expect(minuterie).not.toHaveBeenCalled()
    } finally {
      minuterie.mockRestore()
    }
  })

  it("accepte un délai propre à une requête", async () => {
    fetchMuet()
    const client = creerClientHttp({ delaiMax: 60_000 })
    const erreur = await client.get("/lent", { delaiMax: 20 }).then(rate, echec)
    expect(erreur.code).toBe(CODE_DELAI_DEPASSE)
    await expect(client.get("/x", { delaiMax: 0 })).rejects.toThrow(RangeError)
  })

  it("ne laisse aucune minuterie après un échec", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    try {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")))
      const erreur = await creerClientHttp().get("/x").then(rate, echec)
      expect(erreur.code).toBe(CODE_RESEAU)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it("combine les signaux sans AbortSignal.any (Safari < 17.4)", async () => {
    const any = AbortSignal.any
    Object.defineProperty(AbortSignal, "any", {
      value: undefined,
      configurable: true,
    })
    try {
      // Délai dépassé, avec un signal de l'appelant.
      fetchMuet()
      const controleur = new AbortController()
      const retrait = vi.spyOn(controleur.signal, "removeEventListener")
      const erreur = await creerClientHttp({ delaiMax: 20 })
        .get("/x", { signal: controleur.signal })
        .then(rate, echec)
      expect(erreur.code).toBe(CODE_DELAI_DEPASSE)
      expect(retrait).toHaveBeenCalledWith("abort", expect.any(Function))

      // Annulation par l'appelant.
      const annulation = new AbortController()
      const promesse = creerClientHttp()
        .get("/x", { signal: annulation.signal })
        .then(rate, echec)
      annulation.abort()
      expect((await promesse).name).toBe("AbortError")

      // Signal déjà abaissé.
      const deja = new AbortController()
      deja.abort()
      const erreur3 = await creerClientHttp()
        .get("/x", { signal: deja.signal })
        .then(rate, echec)
      expect(erreur3).not.toBeInstanceOf(ErreurApi)
    } finally {
      Object.defineProperty(AbortSignal, "any", {
        value: any,
        configurable: true,
      })
    }
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

  it("abandonne sans rejet non traité le corps d'une page HTML", async () => {
    // Annulation d'un flux déjà en erreur : sa promesse rejetée doit être
    // rattrapée.
    const annulation = Promise.reject(new Error("flux en erreur"))
    const rattrape = vi.spyOn(annulation, "catch")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        type: "basic",
        headers: new Headers({ "content-type": "text/html" }),
        body: { cancel: () => annulation },
      })
    )
    const erreur = await creerClientHttp().lireBlob("/f").then(rate, echec)
    expect(erreur.code).toBe(CODE_REPONSE_NON_JSON)
    expect(rattrape).toHaveBeenCalled()
  })

  it("lit un fichier", async () => {
    simulerFetch(() => ({
      texte: "abc",
      enTetes: { "content-type": "image/png" },
    }))
    const blob = await creerClientHttp().lireBlob("/photo")
    expect(blob.size).toBe(3)
  })

  it("lit un fichier avec les options d'une requête", async () => {
    const espion = simulerFetch(() => ({
      texte: "abc",
      enTetes: { "content-type": "application/pdf" },
    }))
    await creerClientHttp().lireBlob("/f", {
      query: { v: 2 },
      credentials: "include",
      enTetes: { "X-Essai": "1" },
      delaiMax: 120_000,
    })
    expect(espion.mock.calls[0]?.[0]).toBe("/f?v=2")
    const init = initDe(espion, 0)
    expect(init.credentials).toBe("include")
    expect(new Headers(init.headers).get("X-Essai")).toBe("1")
  })

  it("rend null pour une réponse vide (204 ou 200 vide)", async () => {
    simulerFetch(() => ({ status: 204 }))
    await expect(creerClientHttp().delete("/x")).resolves.toBeNull()
    simulerFetch(() => ({ status: 200 }))
    await expect(creerClientHttp().post("/x")).resolves.toBeNull()
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
    // Sans jeton : le rappel est appelé, avec l'erreur seule.
    expect(surNonAuthentifie).toHaveBeenCalledTimes(1)
    expect(surNonAuthentifie.mock.calls[0]).toEqual([erreur])
    expect(erreur.code).toBe("unauthenticated")
  })

  /** Un `fetch` dont la réponse 401 part quand le test appelle `repondre`. */
  function fetch401Differe() {
    const attente: { repondre?: () => void } = {}
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resoudre) => {
            attente.repondre = () =>
              resoudre(new Response(null, { status: 401 }))
          })
      )
    )
    return attente
  }

  it("401 avec le jeton courant : surNonAuthentifie appelé, sans le jeton", async () => {
    let jeton = JETON
    const surNonAuthentifie = vi.fn(() => {
      jeton = ""
    })
    const attente = fetch401Differe()
    const client = creerClientHttp({ jeton: () => jeton, surNonAuthentifie })
    const enCours = client.get("/x").then(rate, echec)
    attente.repondre?.()
    const erreur = await enCours
    expect(erreur.status).toBe(401)
    // Le jeton ne quitte pas l'en-tête : le rappel ne reçoit que l'erreur.
    expect(surNonAuthentifie.mock.calls[0]).toEqual([erreur])
    expect(jeton).toBe("")
    sansJeton(erreur)
  })

  it("401 tardif après changement de jeton : rappel non appelé, erreur levée", async () => {
    let jeton = "ancien-jeton"
    const surNonAuthentifie = vi.fn(() => {
      jeton = ""
    })
    const attente = fetch401Differe()
    const client = creerClientHttp({ jeton: () => jeton, surNonAuthentifie })
    const enCours = client.get("/x").then(rate, echec)
    // Reconnexion pendant la requête : un nouveau jeton, à ne pas purger.
    jeton = "nouveau-jeton"
    attente.repondre?.()
    const erreur = await enCours
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur.status).toBe(401)
    expect(surNonAuthentifie).not.toHaveBeenCalled()
    expect(jeton).toBe("nouveau-jeton")
  })

  it("rend l'erreur 401 même si la relecture du jeton lève, et signale l'exception", async () => {
    const signaler = vi.fn()
    vi.stubGlobal("reportError", signaler)
    const panne = new Error("stockage illisible")
    let lectures = 0
    const surNonAuthentifie = vi.fn()
    simulerFetch(() => ({ status: 401 }))
    const erreur = await creerClientHttp({
      jeton: () => {
        lectures += 1
        if (lectures > 1) throw panne
        return JETON
      },
      surNonAuthentifie,
    })
      .get("/x")
      .then(rate, echec)
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur.status).toBe(401)
    expect(surNonAuthentifie).not.toHaveBeenCalled()
    expect(signaler).toHaveBeenCalledWith(panne)
  })

  it("rend l'erreur 401 même si surNonAuthentifie lève, et signale l'exception", async () => {
    const signaler = vi.fn()
    vi.stubGlobal("reportError", signaler)
    const panne = new Error("rappel en panne")
    simulerFetch(() => ({ status: 401 }))
    const erreur = await creerClientHttp({
      surNonAuthentifie: () => {
        throw panne
      },
    })
      .get("/x")
      .then(rate, echec)
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur.status).toBe(401)
    expect(signaler).toHaveBeenCalledWith(panne)
  })

  it("construit la chaîne de requête sans valeurs vides, tableaux répétés", async () => {
    expect(
      chaineRequete({ q: "a b", vide: "", n: null, u: undefined, f: false })
    ).toBe("?q=a+b&f=false")
    expect(chaineRequete({ type: ["CE", "BC"] })).toBe("?type=CE&type=BC")
    expect(chaineRequete({ type: ["CE", "", null, undefined] })).toBe(
      "?type=CE"
    )
    expect(chaineRequete({})).toBe("")
    const espion = simulerFetch(() => ({ corps: [] }))
    await creerClientHttp({ base: "/api" }).get("/m", { query: { page: 2 } })
    expect(espion.mock.calls[0]?.[0]).toBe("/api/m?page=2")
  })
})
