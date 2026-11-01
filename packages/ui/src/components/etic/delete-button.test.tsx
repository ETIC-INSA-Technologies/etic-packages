import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useMemo, useState } from "react"
import { describe, expect, it } from "vitest"

import {
  DataTable,
  DeleteButton,
  createDataTableColumnHelper,
  dataTableActionsColumn,
  dataTableSelectionColumn,
  useDataTable,
} from "@etic-ui/index"

interface Groupe {
  id: string
  nom: string
}

const GROUPES: Groupe[] = [
  { id: "1", nom: "Bureau" },
  { id: "2", nom: "DSI" },
  { id: "3", nom: "Études" },
]

const aide = createDataTableColumnHelper<Groupe>()

function Liste({
  avecSelection = false,
  supprimerApres = "fermeture",
}: {
  avecSelection?: boolean
  /** La ligne disparaît avec la confirmation encore ouverte (liste
   *  rechargée avant la fin de l'action), ou après sa fermeture. */
  supprimerApres?: "ouverture" | "fermeture"
}) {
  const [groupes, setGroupes] = useState(GROUPES)
  const retirer = (id: string) =>
    setGroupes((avant) => avant.filter((g) => g.id !== id))
  const colonnes = useMemo(
    () =>
      aide.columns([
        ...(avecSelection ? [dataTableSelectionColumn<Groupe>()] : []),
        aide.accessor("nom", { header: "Nom" }),
        dataTableActionsColumn<Groupe>({
          actions: (g) => (
            <DeleteButton
              libelle={`le groupe ${g.nom}`}
              confirmation={{ description: `${g.nom} sera supprimé.` }}
              onSupprimer={async () => {
                if (supprimerApres === "ouverture") retirer(g.id)
                else setTimeout(() => retirer(g.id), 20)
              }}
            />
          ),
        }),
      ]),
    [avecSelection, supprimerApres]
  )
  const table = useDataTable({
    donnees: groupes,
    colonnes,
    idLigne: (g) => g.id,
  })
  return <DataTable table={table} libelle="Groupes" />
}

async function supprimer(
  user: ReturnType<typeof userEvent.setup>,
  nom: string
) {
  await user.click(
    screen.getByRole("button", { name: `Supprimer le groupe ${nom}` })
  )
  await user.click(await screen.findByRole("button", { name: "Supprimer" }))
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: `Supprimer le groupe ${nom}` })
    ).toBeNull()
  )
}

describe("DeleteButton dans une ligne de tableau", () => {
  it("rend le focus à la même commande de la ligne suivante quand la ligne disparaît", async () => {
    const user = userEvent.setup()
    render(<Liste />)
    await supprimer(user, "DSI")
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Supprimer le groupe Études" })
      )
    )
  })

  it("prend la ligne précédente pour la dernière ligne", async () => {
    const user = userEvent.setup()
    render(<Liste />)
    await supprimer(user, "Études")
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Supprimer le groupe DSI" })
      )
    )
  })

  it("rend aussi le focus quand la ligne disparaît confirmation ouverte", async () => {
    const user = userEvent.setup()
    render(<Liste supprimerApres="ouverture" />)
    await supprimer(user, "Bureau")
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Supprimer le groupe DSI" })
      )
    )
  })

  it("rend le focus au tableau quand la dernière ligne disparaît", async () => {
    const user = userEvent.setup()
    render(<Liste avecSelection />)
    for (const nom of ["Bureau", "DSI", "Études"]) await supprimer(user, nom)
    // Plus de ligne : la case d'en-tête est désactivée, le cadre prend le
    // focus.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector('[data-slot="data-table"]')
      )
    )
  })
})

describe("DeleteButton", () => {
  it("prend la taille donnée (en-tête de fiche en grand)", () => {
    render(
      <>
        <DeleteButton
          libelle="ce groupe"
          size="icon-lg"
          confirmation={{ description: "…" }}
          onSupprimer={() => {}}
        />
        <DeleteButton
          libelle="cette fiche"
          avecTexte
          size="lg"
          confirmation={{ description: "…" }}
          onSupprimer={() => {}}
        />
      </>
    )
    expect(
      screen.getByRole("button", { name: "Supprimer ce groupe" })
    ).toHaveClass("size-9")
    expect(
      screen.getByRole("button", { name: "Supprimer cette fiche" })
    ).toHaveClass("h-9")
  })

  it("garde la corbeille en icon-sm, grise et rouge au survol seulement", () => {
    render(
      <DeleteButton
        libelle="ce groupe"
        confirmation={{ description: "…" }}
        onSupprimer={() => {}}
      />
    )
    // L'allure `destructif` de `TooltipButton`, pas des classes recopiées.
    expect(
      screen.getByRole("button", { name: "Supprimer ce groupe" })
    ).toHaveClass("size-7", "text-muted-foreground", "hover:text-destructive")
  })
})
