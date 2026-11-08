import { useRef } from "react"
import { cn } from "cn"
import { CheckIcon } from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"
import { ResetButton } from "@etic-ui/components/etic/reset-button"

export interface SaveBarProps {
  /** Enregistrement en cours : « Enregistrer » devient « Enregistrement… »,
   *  occupé (`aria-busy`), ignore les clics, mais garde le focus ;
   *  « Annuler » attend la fin. */
  enCours?: boolean
  /** Rien à enregistrer, ou une saisie à corriger d'abord. */
  desactive?: boolean
  /** Affiche « Enregistré » : la dernière mutation a réussi
   *  (`mutation.isSuccess`). `modifie` l'emporte. */
  enregistre?: boolean
  /** Des modifications attendent : le statut dit « Modifications non
   *  enregistrées », la raison pour laquelle « Enregistrer » est actif,
   *  même après un enregistrement réussi. */
  modifie?: boolean
  /** Pied d'un formulaire plus haut que l'écran, sur une carte opaque,
   *  boutons à droite, statut à gauche. Tant que `modifie` est vrai (ou
   *  pendant l'envoi), la barre se colle en bas de l'écran ; sinon, elle
   *  reste à sa place : elle ne flotte pas sur le contenu sans raison. Les
   *  bords de la carte s'alignent sur ceux des cartes de la page. */
  collante?: boolean
  /** Avec `collante` : la barre n'apparaît que lorsqu'elle a quelque chose
   *  à dire (modifications, envoi en cours, « Enregistré »). Au repos, il ne
   *  reste que sa zone de statut, invisible et sans place, pour que le
   *  premier message soit annoncé. */
  masqueeAuRepos?: boolean
  /** Sans gestionnaire, « Enregistrer » soumet le formulaire qui l'entoure. */
  onEnregistrer?: () => void
  /** Revenir à ce qui est enregistré : affiche « Annuler ». À ne passer que
   *  s'il y a des modifications (`onAnnuler={modifie ? annuler : undefined}`).
   *  Au clic, le focus passe à « Enregistrer » : « Annuler » disparaît.
   *  Avec `masqueeAuRepos`, toute la barre disparaît : c'est à l'application
   *  de rendre le focus (au formulaire). */
  onAnnuler?: () => void
  /**
   * Formulaire dont les champs ont une valeur par défaut : le bouton
   * général ↶ (`ResetButton`), devant « Annuler », qui remet tous les
   * champs à leur défaut sans rien enregistrer. `masque` quand il n'y a rien
   * à rétablir : il n'est alors pas rendu. Offert, il garde la barre visible
   * même au repos (`masqueeAuRepos`). Au clic, le focus passe à
   * « Enregistrer », l'étape suivante.
   */
  retablirDefauts?: {
    onRetablir: () => void
    masque?: boolean
  }
  className?: string
}

/**
 * Pied d'un formulaire de page (profil, paramètres) : « Enregistrer »,
 * « Annuler » au besoin, le retour général aux valeurs par défaut au
 * besoin, et le statut, annoncé (« Enregistré », « Modifications non
 * enregistrées »).
 */
export function SaveBar({
  enCours = false,
  desactive = false,
  enregistre = false,
  modifie = false,
  collante = false,
  masqueeAuRepos = false,
  onEnregistrer,
  onAnnuler,
  retablirDefauts,
  className,
}: SaveBarProps) {
  const refEnregistrer = useRef<HTMLButtonElement>(null)
  // Le ↶ général offert est quelque chose à dire : la barre ne se cache pas.
  const retablirOffert = retablirDefauts?.masque ? undefined : retablirDefauts
  const auRepos =
    collante &&
    masqueeAuRepos &&
    !modifie &&
    !enCours &&
    !enregistre &&
    !retablirOffert
  const enregistrer = (
    <Button
      ref={refEnregistrer}
      type={onEnregistrer ? "button" : "submit"}
      onClick={onEnregistrer}
      enCours={enCours}
      libelleEnCours="Enregistrement…"
      // Désactivé mais focalisable : le bouton qu'on vient d'activer ne
      // rend pas le focus à <body> quand l'enregistrement finit et qu'il ne
      // reste rien à enregistrer.
      disabled={desactive}
      focusableWhenDisabled
    >
      Enregistrer
    </Button>
  )
  const annuler = onAnnuler ? (
    <Button
      variant="outline"
      onClick={() => {
        // « Annuler » disparaît avec les modifications : sans cela, le
        // focus tomberait sur la page.
        refEnregistrer.current?.focus()
        onAnnuler()
      }}
      disabled={enCours}
      focusableWhenDisabled
    >
      Annuler
    </Button>
  ) : null
  // Masqué, le ↶ général n'est pas rendu. Celui d'un champ garde sa place
  // pour ne pas s'effacer sous le curseur pendant la frappe ; celui-ci ne
  // change pas pendant qu'on le vise, et sa place vide repoussait le statut
  // sur trois lignes au téléphone. Il apparaît en fondu (`starting:`).
  const retablir = retablirOffert ? (
    <ResetButton
      disabled={enCours}
      className="starting:opacity-0"
      onRetablir={() => {
        // Il disparaît d'ordinaire avec l'écart : le focus va d'abord à
        // « Enregistrer », l'étape suivante, plutôt que sur la page.
        refEnregistrer.current?.focus()
        retablirOffert.onRetablir()
      }}
    />
  ) : null
  // Toujours présent : une zone `status` ajoutée en même temps que son texte
  // n'est pas annoncée.
  const statut = (
    <p
      role="status"
      className={cn(
        "text-sm text-muted-foreground",
        // Le statut se replie sur deux lignes plutôt que de séparer les
        // boutons de la barre.
        collante && "me-auto min-w-0 flex-1",
        auRepos && "sr-only"
      )}
    >
      {/* Une modification faite après l'enregistrement l'emporte :
          « Enregistré » ne vaut que pour ce qui est à l'écran. */}
      {modifie ? (
        "Modifications non enregistrées"
      ) : enregistre ? (
        <span className="inline-flex items-center gap-1.5 font-medium text-success">
          <CheckIcon className="size-4" aria-hidden />
          Enregistré
        </span>
      ) : null}
    </p>
  )

  // Les deux boutons ne se séparent jamais : au téléphone, c'est le statut
  // qui passe à la ligne (barre simple) ou se replie (barre collante).
  const boutons = auRepos ? null : (
    <div
      data-slot="save-bar-actions"
      className="flex shrink-0 items-center gap-3"
    >
      {/* Ordre du DOM = ordre visuel : « Enregistrer » d'abord, ou à droite
          quand la barre est collante ; le retour aux défauts, l'action la
          plus rare, à l'autre bout. */}
      {collante ? retablir : enregistrer}
      {annuler}
      {collante ? enregistrer : retablir}
    </div>
  )

  return (
    <div
      data-slot="save-bar"
      data-collante={collante || undefined}
      data-repos={auRepos || undefined}
      className={cn(
        "flex items-center gap-3",
        !collante && "flex-wrap",
        // Au repos, la barre ne prend aucune place : seule reste la zone de
        // statut (une zone `status` ajoutée en même temps que son texte
        // n'est pas annoncée).
        auRepos && "contents",
        // Toujours sur sa carte : sans elle, les marges intérieures
        // décalaient les boutons par rapport aux cartes de la page. Carte
        // pleinement opaque : un fond translucide laissait deviner, flou, le
        // texte qu'elle recouvre.
        collante &&
          !auRepos &&
          "justify-end rounded-xl border border-border bg-card px-4 py-3",
        collante && (modifie || enCours) && "sticky bottom-4 z-10 shadow-sm",
        className
      )}
    >
      {collante ? statut : boutons}
      {collante ? boutons : statut}
    </div>
  )
}
