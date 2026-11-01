// Ordre des colonnes d'un tableau : les deux règles communes au sélecteur de
// colonnes (`DataTableViewOptions`) et aux préférences (`useColumnPrefs`).

/**
 * Un ordre complet de `toutes` : les identifiants de `cites` d'abord, dans
 * leur ordre (inconnus et doublons ignorés), puis ceux qu'il ne cite pas,
 * dans l'ordre de `toutes`. `cites` peut venir d'un stockage : tout ce qui
 * n'est pas une chaîne connue est ignoré.
 */
export function ordonner(
  cites: readonly unknown[] | undefined,
  toutes: readonly string[]
): string[] {
  const connues = new Set(toutes)
  const ordre = new Set<string>()
  for (const id of cites ?? [])
    if (typeof id === "string" && connues.has(id)) ordre.add(id)
  for (const id of toutes) ordre.add(id)
  return [...ordre]
}

/**
 * Un ordre où seules les colonnes déplaçables changent de place : chaque
 * place d'une colonne déplaçable reçoit la suivante de `nouvelOrdre` (réduit
 * aux déplaçables de `ordre`, selon la règle d'`ordonner`) ; les autres
 * (sélection, colonnes fixes, indisponibles) restent où elles sont. Les
 * déplaçables que `nouvelOrdre` oublie suivent, dans leur ordre d'avant.
 */
export function replacer(
  ordre: readonly string[],
  deplacable: (id: string) => boolean,
  nouvelOrdre: readonly string[]
): string[] {
  const suivantes = ordonner(nouvelOrdre, ordre.filter(deplacable))[
    Symbol.iterator
  ]()
  return ordre.map((id) =>
    deplacable(id) ? (suivantes.next().value as string) : id
  )
}
