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
  const cherche = normaliser(recherche).trim()
  if (cherche === "") return () => true
  return (...textes) =>
    textes.some((texte) => texte != null && normaliser(texte).includes(cherche))
}
