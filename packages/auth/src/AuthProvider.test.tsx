import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import { useEffect, type ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AuthProvider } from "./AuthProvider"
import { SessionRequise, SiPermission } from "./composants"
import { CLE_ME, useAuth, type AuthValeur } from "./context"
import { signalerNonAuthentifie } from "./evenements"
import { simulerFetch } from "./test/fetch"
import type { Me } from "./types"

const ME: Me = {
  membre_id: "m1",
  email: "ada@etic.fr",
  nom_affichage: "Ada",
  permissions: ["app.read"],
  is_superadmin: false,
  preferences: { theme: "light" },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const sonde: { auth: AuthValeur | null } = { auth: null }
function auth(): AuthValeur {
  if (!sonde.auth) throw new Error("Sonde non rendue")
  return sonde.auth
}
function Sonde() {
  const valeur = useAuth()
  useEffect(() => {
    sonde.auth = valeur
  })
  return <p>{valeur.me ? `connecté ${valeur.theme}` : "anonyme"}</p>
}

let client: QueryClient
function rendre(enfant: ReactNode, surNonAuthentifie?: () => void) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider surNonAuthentifie={surNonAuthentifie}>
        {enfant}
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("AuthProvider", () => {
  it("un 401 sur /me vaut « pas de session », pas une panne", async () => {
    simulerFetch(() => ({
      status: 401,
      corps: { error: { code: "unauthenticated" } },
    }))
    rendre(<Sonde />)
    expect(await screen.findByText("anonyme")).toBeInTheDocument()
    expect(auth().erreur).toBeNull()
  })

  it("l'événement global purge la session et prévient l'application", async () => {
    simulerFetch(() => ({ corps: ME }))
    const surNonAuthentifie = vi.fn()
    rendre(<Sonde />, surNonAuthentifie)
    await screen.findByText("connecté light")
    act(() => signalerNonAuthentifie())
    expect(await screen.findByText("anonyme")).toBeInTheDocument()
    expect(surNonAuthentifie).toHaveBeenCalledOnce()
  })

  it("changerTheme applique tout de suite, puis revient en arrière si le serveur refuse", async () => {
    let refuser = false
    simulerFetch((url) => {
      if (url.endsWith("/preferences")) {
        return refuser
          ? {
              status: 502,
              corps: { error: { code: "external_service_unavailable" } },
            }
          : { corps: { theme: "dark" } }
      }
      return { corps: ME }
    })
    rendre(<Sonde />)
    await screen.findByText("connecté light")

    await act(() => auth().changerTheme("dark"))
    expect(await screen.findByText("connecté dark")).toBeInTheDocument()

    refuser = true
    await act(() =>
      expect(auth().changerTheme("system")).rejects.toMatchObject({
        status: 502,
      })
    )
    expect(client.getQueryData<Me>(CLE_ME)?.preferences?.theme).toBe("dark")
  })

  it("deconnecter purge la session même si le serveur échoue", async () => {
    simulerFetch((url) =>
      url.endsWith("/logout") ? { status: 500 } : { corps: ME }
    )
    rendre(<Sonde />)
    await screen.findByText("connecté light")
    await act(() => auth().deconnecter())
    expect(await screen.findByText("anonyme")).toBeInTheDocument()
  })
})

describe("SessionRequise et SiPermission", () => {
  const barriere = (
    <SessionRequise
      chargement={<p>chargement</p>}
      sansSession={<p>connexion</p>}
      erreur={(e, reessayer) => (
        <button onClick={reessayer}>panne {e.code}</button>
      )}
    >
      <SiPermission code="app.read">lecture</SiPermission>
      <SiPermission code="app.manage" sinon={<span>pas admin</span>}>
        admin
      </SiPermission>
    </SessionRequise>
  )

  it("rend le contenu avec une session", async () => {
    simulerFetch(() => ({ corps: ME }))
    rendre(barriere)
    expect(screen.getByText("chargement")).toBeInTheDocument()
    expect(await screen.findByText("lecture")).toBeInTheDocument()
    expect(screen.getByText("pas admin")).toBeInTheDocument()
  })

  it("rend sansSession sans session", async () => {
    simulerFetch(() => ({ status: 401 }))
    rendre(barriere)
    expect(await screen.findByText("connexion")).toBeInTheDocument()
  })

  it("rend la panne, jamais la connexion, quand le serveur ne répond pas", async () => {
    const espion = simulerFetch(() => ({ status: 503 }))
    rendre(barriere)
    const bouton = await screen.findByText("panne external_service_unavailable")
    expect(screen.queryByText("connexion")).toBeNull()
    act(() => bouton.click())
    await waitFor(() => expect(espion).toHaveBeenCalledTimes(2))
  })

  it("garde l'application affichée si une relecture échoue", async () => {
    let panne = false
    simulerFetch(() => (panne ? { status: 503 } : { corps: ME }))
    rendre(barriere)
    expect(await screen.findByText("lecture")).toBeInTheDocument()
    panne = true
    await act(() => client.invalidateQueries({ queryKey: CLE_ME }))
    expect(screen.getByText("lecture")).toBeInTheDocument()
  })
})

describe("seConnecter", () => {
  it("revient sur la page courante, sans le ?erreur= d'un échec", async () => {
    simulerFetch(() => ({ status: 401 }))
    const assign = vi.fn()
    vi.stubGlobal("location", {
      pathname: "/login",
      search: "?erreur=unauthenticated&x=1",
      assign,
    })
    rendre(<Sonde />)
    await screen.findByText("anonyme")
    act(() => auth().seConnecter())
    expect(assign).toHaveBeenCalledWith(
      "/api/v1/auth/login?suivant=" + encodeURIComponent("/login?x=1")
    )
  })
})
