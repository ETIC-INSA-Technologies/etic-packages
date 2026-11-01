import {
  useEffect,
  useEffectEvent,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@etic-ui/components/ui/avatar"

/**
 * Récupère les octets d'une image : l'application y met son appel
 * authentifié (en-tête `Authorization`, cookie…). `signal` est interrompu
 * quand l'image n'est plus voulue.
 */
export type AuthImageCharger = (
  src: string,
  signal: AbortSignal
) => Promise<Blob>

/** Où en est le chargement d'une image authentifiée. */
export interface AuthObjectUrlEtat {
  /** URL locale (`blob:`) de l'image, une fois chargée. */
  url: string | null
  /** Chargement en cours (jamais sans `src`). */
  enCours: boolean
  /** Le chargement a échoué : `charger` a rejeté sa promesse. */
  echec: boolean
  /** Raison du rejet, telle que reçue (`undefined` sans échec). */
  erreur: unknown
}

/** L'issue d'un chargement, et la `src` (et la `cle`) qu'il concernait. */
interface Resultat {
  src: string
  cle: unknown
  etat: AuthObjectUrlEtat
}

const SANS_SRC: AuthObjectUrlEtat = {
  url: null,
  enCours: false,
  echec: false,
  erreur: undefined,
}
const EN_COURS: AuthObjectUrlEtat = { ...SANS_SRC, enCours: true }

/**
 * État complet d'une image qu'un simple `<img src>` ne peut pas obtenir,
 * faute de pouvoir s'authentifier : URL locale (`blob:`), chargement en
 * cours, échec. Les octets sont récupérés par `charger`, puis l'URL est
 * révoquée au démontage ou quand `src` change. Sert à dire « indisponible »
 * plutôt que de laisser un chargement sans fin (aperçu d'un fichier…).
 *
 * `cle` force un nouveau chargement quand les octets changent derrière une
 * même `src` (photo remplacée). `charger` peut changer à chaque rendu : seul
 * le dernier sert, sans relancer de chargement.
 */
export function useAuthObjectUrlEtat(
  src: string | null | undefined,
  charger: AuthImageCharger,
  cle?: unknown
): AuthObjectUrlEtat {
  const [resultat, setResultat] = useState<Resultat | null>(null)
  // La dernière fonction reçue, lue au moment du chargement.
  const chargerActuel = useEffectEvent((adresse: string, signal: AbortSignal) =>
    charger(adresse, signal)
  )

  useEffect(() => {
    if (!src) return
    let actif = true
    let creee: string | null = null
    const controleur = new AbortController()
    chargerActuel(src, controleur.signal)
      .then((blob) => {
        if (!actif) return
        creee = URL.createObjectURL(blob)
        // L'état rendu est préparé ici, une fois : il garde son identité
        // d'un rendu à l'autre (dépendance d'effet ou de mémo sans relance).
        setResultat({ src, cle, etat: { ...SANS_SRC, url: creee } })
      })
      .catch((erreur: unknown) => {
        if (actif)
          setResultat({ src, cle, etat: { ...SANS_SRC, echec: true, erreur } })
      })
    return () => {
      actif = false
      controleur.abort()
      if (creee) URL.revokeObjectURL(creee)
    }
  }, [src, cle])

  if (!src) return SANS_SRC
  // Le résultat d'une ancienne `src` (ou d'une ancienne `cle`, URL déjà
  // révoquée) n'est jamais rendu : la nouvelle est en cours.
  if (resultat?.src !== src || !Object.is(resultat.cle, cle)) return EN_COURS
  return resultat.etat
}

/**
 * URL locale (`blob:`) d'une image authentifiée : `null` pendant le
 * chargement, en cas d'échec, ou sans `src`. `useAuthObjectUrlEtat`
 * distingue en plus le chargement de l'échec.
 */
export function useAuthObjectUrl(
  src: string | null | undefined,
  charger: AuthImageCharger,
  cle?: unknown
): string | null {
  return useAuthObjectUrlEtat(src, charger, cle).url
}

export interface AuthImageProps extends Omit<ComponentProps<"img">, "src"> {
  /** Adresse de l'image, transmise à `charger`. */
  src: string | null | undefined
  charger: AuthImageCharger
  /** Changer cette valeur recharge l'image (voir `useAuthObjectUrl`). */
  cle?: unknown
  /** Affiché pendant le chargement, sans `src`, et en cas d'échec si
   *  `secoursEchec` manque. */
  secours?: ReactNode
  /** Affiché en cas d'échec (« Aperçu indisponible »…) ; `secours` sinon. */
  secoursEchec?: ReactNode
}

/** Image servie par une adresse authentifiée : l'application fournit la
 *  fonction qui en récupère les octets. */
export function AuthImage({
  src,
  charger,
  cle,
  secours = null,
  secoursEchec,
  alt = "",
  ...props
}: AuthImageProps) {
  const { url, echec } = useAuthObjectUrlEtat(src, charger, cle)
  if (echec && secoursEchec !== undefined) return <>{secoursEchec}</>
  if (!url) return <>{secours}</>
  return <img src={url} alt={alt} {...props} />
}

export interface AuthAvatarProps extends Omit<
  ComponentProps<typeof Avatar>,
  "children"
> {
  /** Toujours affichées tant que la photo manque, charge ou échoue. */
  initiales: string
  /** Adresse de la photo, transmise à `charger` ; `null` sans photo. */
  src?: string | null
  charger: AuthImageCharger
  /** Changer cette valeur recharge la photo (photo remplacée). */
  cle?: unknown
  /** Texte alternatif de la photo ; vide par défaut, le nom figurant en
   *  général à côté. */
  alt?: string
}

/**
 * Photo de profil servie par une adresse authentifiée, sur l'`Avatar` de
 * shadcn : les initiales tant que la photo manque, charge ou échoue.
 * `diametre` (en px) en fait la grande photo d'une fiche, initiales
 * proportionnées ; leur graisse suit celle de la racine (`font-semibold`…).
 */
export function AuthAvatar({
  initiales,
  src,
  charger,
  cle,
  alt = "",
  className,
  ...props
}: AuthAvatarProps) {
  const url = useAuthObjectUrl(src, charger, cle)
  return (
    <Avatar className={className} {...props}>
      {url ? <AvatarImage src={url} alt={alt} /> : null}
      <AvatarFallback>{initiales}</AvatarFallback>
    </Avatar>
  )
}
