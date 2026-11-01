/**
 * Recherche dans une liste locale (filtre côté navigateur, `rechercher` d'un
 * `SearchSelect` sur une liste en mémoire), insensible aux accents et à la
 * casse : « etude » trouve « Étude ».
 */

/** Texte comparable par sous-chaîne : sans accents ni casse. Les espaces sont
 *  gardés (voir `correspondance` pour une recherche saisie). */
export function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

/**
 * Le filtre d'une recherche : vrai si l'un des textes la contient. La
 * recherche est normalisée et rognée une fois, pas à chaque élément ; vide,
 * tout correspond.
 *
 * ```ts
 * const correspond = correspondance(recherche)
 * postes.filter((p) => correspond(p.nom, p.pole?.nom))
 * ```
 */
export function correspondance(
  recherche: string
): (...textes: (string | null | undefined)[]) => boolean {
  const cherche = normaliserRecherche(recherche)
  if (cherche === "") return () => true
  return (...textes) =>
    textes.some((texte) => texte != null && normaliser(texte).includes(cherche))
}

/** Une recherche saisie, prête à comparer : normalisée et rognée. Vide
 *  (`""`), elle ne filtre rien. */
export function normaliserRecherche(recherche: string): string {
  return normaliser(recherche).trim()
}

const collationFr = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
})

/**
 * Comparateur alphabétique français, pour `Array.prototype.sort` : accents
 * et casse ignorés, nombres dans le texte à leur valeur (« Poste 2 » avant
 * « Poste 10 »). C'est le tri `texteFr` des tableaux.
 */
export function comparerFr(a: string, b: string): number {
  return collationFr.compare(a, b)
}
