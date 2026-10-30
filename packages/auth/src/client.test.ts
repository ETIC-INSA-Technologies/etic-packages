import { afterEach, describe, expect, it, vi } from "vitest"
import {
  CODE_REPONSE_NON_JSON,
  CODE_RESEAU,
  creerClientAuth,
  ErreurApi,
} from "./client"
import { simulerFetch } from "./test/fetch"

afterEach(() => {
  vi.unstubAllGlobals()
})

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
    const erreur = await creerClientAuth()
      .lireMe()
      .catch((e) => e)
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur.status).toBe(401)
    expect(erreur.details).toEqual({ action: "relancer_authorize" })
    expect(erreur.reconnexionRequise).toBe(true)
  })

  it("donne un message lisible sans enveloppe", async () => {
    simulerFetch(() => ({ status: 502, texte: "<html>Bad gateway</html>" }))
    const erreur = await creerClientAuth()
      .lireMe()
      .catch((e) => e)
    expect(erreur.code).toBe("external_service_unavailable")
    expect(erreur.serviceIndisponible).toBe(true)
  })

  it("refuse un 200 qui n'est pas du JSON", async () => {
    simulerFetch(() => ({ texte: "<!doctype html>" }))
    const erreur = await creerClientAuth()
      .lireMe()
      .catch((e) => e)
    expect(erreur.code).toBe(CODE_REPONSE_NON_JSON)
  })

  it("distingue l'erreur réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")))
    const erreur = await creerClientAuth()
      .lireMe()
      .catch((e) => e)
    expect(erreur.code).toBe(CODE_RESEAU)
    expect(erreur.status).toBe(0)
  })

  it("construit l'URL de connexion avec le préfixe", () => {
    expect(creerClientAuth("/api/auth/").urlConnexion("/a?b=1")).toBe(
      "/api/auth/login?suivant=%2Fa%3Fb%3D1"
    )
  })
})
