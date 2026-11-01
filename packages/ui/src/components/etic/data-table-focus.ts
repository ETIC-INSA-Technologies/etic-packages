// Focus d'un tableau quand ce qui l'avait disparaît (bandeau, barre de
// sélection, ligne supprimée). Sans dépendance à TanStack Table : utilisable
// pour un tableau rendu à la main avec les primitives `Table`.

/**
 * Rend le focus à un élément stable du tableau avant qu'un contrôle qui l'a
 * ne disparaisse (bandeau ou barre de sélection) : la case d'en-tête, sinon
 * le cadre lui-même.
 */
export function focaliserTableau(racine: HTMLElement | null) {
  if (!racine) return
  const caseEntete = racine.querySelector<HTMLElement>(
    'thead [role="checkbox"]:not([data-disabled])'
  )
  if (caseEntete) return caseEntete.focus()
  if (!racine.hasAttribute("tabindex")) racine.tabIndex = -1
  racine.focus()
}

/** Ce qui peut recevoir le focus dans une cellule. */
const FOCALISABLE =
  'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Ligne de données voisine, en sautant les détails dépliés (qui n'ont pas
 *  les mêmes cellules). */
function ligneVoisine(
  ligne: HTMLTableRowElement,
  cle: "nextElementSibling" | "previousElementSibling"
): HTMLTableRowElement | null {
  let voisine = ligne[cle]
  while (
    voisine instanceof HTMLTableRowElement &&
    voisine.dataset.slot === "data-table-detail"
  )
    voisine = voisine[cle]
  return voisine instanceof HTMLTableRowElement ? voisine : null
}

/**
 * À appeler juste avant qu'une ligne qui avait le focus (elle, ou un
 * dialogue ou un menu ouvert depuis elle) quitte le document : une fois la
 * ligne retirée, si personne n'a repris le focus, il va à la même cellule de
 * la ligne suivante (ou précédente), sinon au tableau. Sans cela, il tombe
 * sur la page.
 *
 * `rang` : l'index de la cellule qui avait le focus (`cellIndex`), -1 si
 * inconnu (la première commande de la ligne voisine).
 */
export function rendreFocusApresLigne(
  ligne: HTMLTableRowElement,
  rang: number
) {
  const voisines = [
    ligneVoisine(ligne, "nextElementSibling"),
    ligneVoisine(ligne, "previousElementSibling"),
  ]
  const racine =
    ligne.closest<HTMLElement>('[data-slot="data-table"]') ??
    ligne.closest<HTMLElement>('[data-slot="table-container"]')
  // Après le retrait de la ligne et le retour de focus d'un dialogue fermé.
  setTimeout(() => {
    const focus = document.activeElement
    if (focus && focus !== document.body) return
    for (const voisine of voisines) {
      if (!voisine?.isConnected) continue
      const cellule = voisine.cells[rang] ?? voisine
      const cible = cellule.querySelector<HTMLElement>(FOCALISABLE)
      if (cible) return cible.focus()
    }
    if (racine?.isConnected) focaliserTableau(racine)
  })
}
