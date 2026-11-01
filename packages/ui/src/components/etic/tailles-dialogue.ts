/** Largeur d'un dialogue, selon la densité de son contenu. */
export type TailleDialogue = "sm" | "md" | "lg" | "xl"

// Sous `sm`, toute la largeur moins les marges, pour l'`AlertDialog` aussi
// (shadcn le plafonne à `max-w-xs` sur téléphone, trop étroit pour un
// récapitulatif). Les classes `data-[size=default]:` sont celles
// d'`AlertDialogContent`, qu'elles remplacent ; un `Dialog` les ignore.
const ALERTE_PLEINE_LARGEUR = "data-[size=default]:max-w-[calc(100%-2rem)]"

/**
 * Classes de largeur d'un `DialogContent` ou d'un `AlertDialogContent`
 * (`FormDialog`, `ConfirmDialog`, `DraftResumeDialog`) ; « sm » garde la
 * largeur de shadcn.
 */
export const LARGEURS_DIALOGUE: Record<TailleDialogue, string | undefined> = {
  sm: undefined,
  md: `sm:max-w-lg data-[size=default]:sm:max-w-lg ${ALERTE_PLEINE_LARGEUR}`,
  lg: `sm:max-w-2xl data-[size=default]:sm:max-w-2xl ${ALERTE_PLEINE_LARGEUR}`,
  xl: `sm:max-w-4xl data-[size=default]:sm:max-w-4xl ${ALERTE_PLEINE_LARGEUR}`,
}
