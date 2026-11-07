import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  DetailSheet,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  useDetailSheet,
} from "@etic-ui/index"

interface Doc {
  id: number
  nom: string
}

const INTROUVABLE = {
  titre: "Document introuvable",
  message: "Ce document n'est pas dans la liste affichée",
  description: "Retrouvez-le par les filtres.",
}

describe("SheetContent taille, SheetBody", () => {
  it("taille : tout l'écran sous 640 px, puis la largeur demandée", () => {
    render(
      <Sheet open>
        <SheetContent taille="xl">
          <SheetTitle>T</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    const tiroir = screen.getByRole("dialog")
    expect(tiroir).toHaveClass(
      "data-[side=right]:w-full",
      "data-[side=right]:sm:max-w-xl"
    )
    expect(tiroir).not.toHaveClass(
      "data-[side=right]:w-3/4",
      "data-[side=right]:sm:max-w-sm"
    )
  })

  it("sans taille : la largeur de shadcn", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>T</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByRole("dialog")).toHaveClass(
      "data-[side=right]:w-3/4",
      "data-[side=right]:sm:max-w-sm"
    )
  })

  it("SheetBody : seul le corps défile", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
          <SheetBody>Corps</SheetBody>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByText("Corps")).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto"
    )
  })
})

describe("DetailSheet", () => {
  const rendre = (element: Doc | null | undefined, ouvert = true) => (
    <DetailSheet
      element={element}
      ouvert={ouvert}
      onOuvertChange={() => {}}
      introuvable={INTROUVABLE}
    >
      {(doc) => (
        <SheetHeader>
          <SheetTitle>{doc.nom}</SheetTitle>
        </SheetHeader>
      )}
    </DetailSheet>
  )

  it("rend l'élément, le chargement, ou introuvable", () => {
    const { rerender } = render(rendre(undefined))
    expect(
      screen.getByRole("dialog", { name: "Chargement…" })
    ).toBeInTheDocument()

    rerender(rendre({ id: 1, nom: "Devis" }))
    expect(screen.getByRole("dialog", { name: "Devis" })).toBeInTheDocument()

    rerender(rendre(null))
    expect(
      screen.getByRole("dialog", { name: "Document introuvable" })
    ).toBeInTheDocument()
    expect(screen.getByText(INTROUVABLE.message)).toBeInTheDocument()
    expect(screen.getByText(INTROUVABLE.description)).toBeInTheDocument()
  })

  it("fermé, garde ce qu'il affichait pendant son animation", () => {
    const { rerender } = render(rendre({ id: 1, nom: "Devis" }))
    rerender(rendre(undefined, false))
    // Le tiroir se ferme (animation) : il montre encore le dernier élément.
    expect(screen.queryByText("Chargement…")).toBeNull()
  })
})

describe("useDetailSheet", () => {
  const docs: Doc[] = [
    { id: 1, nom: "Devis" },
    { id: 2, nom: "Facture" },
  ]

  function utiliser(initial: string | null, enChargement = false) {
    const onIdChange = vi.fn()
    const hook = renderHook(
      ({ id, elements, charge }) =>
        useDetailSheet({
          id,
          elements,
          idElement: (d: Doc) => String(d.id),
          enChargement: charge,
          onIdChange,
        }),
      {
        initialProps: {
          id: initial,
          elements: enChargement ? undefined : (docs as Doc[] | undefined),
          charge: enChargement,
        },
      }
    )
    return { ...hook, onIdChange }
  }

  it("fermé sans identifiant", () => {
    const { result } = utiliser(null)
    expect(result.current.ouvert).toBe(false)
    expect(result.current.element).toBeUndefined()
  })

  it("l'élément de la liste ; en attente pendant le chargement ; introuvable ensuite", () => {
    const { result, rerender } = utiliser("9", true)
    expect(result.current.ouvert).toBe(true)
    expect(result.current.element).toBeUndefined()
    rerender({ id: "9", elements: docs, charge: false })
    expect(result.current.element).toBeNull()
    rerender({ id: "2", elements: docs, charge: false })
    expect(result.current.element).toEqual(docs[1])
  })

  it("garde le dernier élément ouvert sorti de la liste", () => {
    const { result, rerender } = utiliser("1")
    expect(result.current.element).toEqual(docs[0])
    rerender({ id: "1", elements: [docs[1]], charge: false })
    expect(result.current.element).toEqual(docs[0])
  })

  it("éléments recréés à chaque rendu : pas de boucle, la version courante", () => {
    let rendus = 0
    const { result, rerender } = renderHook(
      ({ id, garder }) => {
        rendus += 1
        return useDetailSheet({
          id,
          // Des objets neufs à chaque rendu, comme un `map` écrit en ligne.
          elements: docs.filter(garder).map((d) => ({ ...d })),
          idElement: (d: Doc) => String(d.id),
          enChargement: false,
          onIdChange: () => {},
        })
      },
      {
        initialProps: {
          id: "1" as string | null,
          garder: (d: Doc) => d.id > 0,
        },
      }
    )
    expect(result.current.element).toEqual(docs[0])
    rerender({ id: "1", garder: () => true })
    rerender({ id: "1", garder: () => true })
    // Un rendu de plus au plus par identifiant, celui qui retient l'élément.
    expect(rendus).toBeLessThanOrEqual(4)
    // Sorti de la liste : le dernier vu reste affiché.
    rerender({ id: "1", garder: (d) => d.id !== 1 })
    expect(result.current.element).toEqual(docs[0])
    rerender({ id: "2", garder: () => true })
    expect(result.current.element).toEqual(docs[1])
  })

  it("ouvrir et fermer posent et retirent l'identifiant ; fonctions stables", () => {
    const { result, rerender, onIdChange } = utiliser(null)
    const { ouvrir, fermer, onOuvertChange } = result.current
    act(() => ouvrir(docs[1]))
    expect(onIdChange).toHaveBeenLastCalledWith("2")
    rerender({ id: "2", elements: docs, charge: false })
    expect(result.current.ouvrir).toBe(ouvrir)
    expect(result.current.fermer).toBe(fermer)
    act(() => onOuvertChange(true))
    expect(onIdChange).toHaveBeenCalledTimes(1)
    act(() => onOuvertChange(false))
    expect(onIdChange).toHaveBeenLastCalledWith(null)
  })

  it("avec DetailSheet : la croix ferme", async () => {
    function Page() {
      const [id, setId] = useState<string | null>("1")
      const tiroir = useDetailSheet({
        id,
        elements: docs,
        idElement: (d) => String(d.id),
        enChargement: false,
        onIdChange: setId,
      })
      return (
        <>
          <output>{id ?? "fermé"}</output>
          <DetailSheet
            element={tiroir.element}
            ouvert={tiroir.ouvert}
            onOuvertChange={tiroir.onOuvertChange}
            introuvable={INTROUVABLE}
          >
            {(doc) => (
              <SheetHeader>
                <SheetTitle>{doc.nom}</SheetTitle>
              </SheetHeader>
            )}
          </DetailSheet>
        </>
      )
    }
    render(<Page />)
    await userEvent.click(screen.getByRole("button", { name: "Fermer" }))
    expect(screen.getByRole("status")).toHaveTextContent("fermé")
  })
})
