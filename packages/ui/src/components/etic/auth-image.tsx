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

/**
 * URL locale (`blob:`) d'une image qu'un simple `<img src>` ne peut pas
 * obtenir, faute de pouvoir s'authentifier. Les octets sont récupérés par
 * `charger`, puis l'URL est révoquée au démontage ou quand `src` change.
 * `null` pendant le chargement, en cas d'échec, ou sans `src`.
 *
 * `cle` force un nouveau chargement quand les octets changent derrière une
 * même `src` (photo remplacée). `charger` peut changer à chaque rendu : seul
 * le dernier sert, sans relancer de chargement.
 */
export function useAuthObjectUrl(
  src: string | null | undefined,
  charger: AuthImageCharger,
  cle?: unknown
): string | null {
  const [url, setUrl] = useState<{
    src: string
    cle: unknown
    url: string
  } | null>(null)
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
        setUrl({ src, cle, url: creee })
      })
      .catch(() => {
        if (actif) setUrl(null)
      })
    return () => {
      actif = false
      controleur.abort()
      if (creee) URL.revokeObjectURL(creee)
    }
  }, [src, cle])

  // L'URL d'une ancienne `src` (ou d'une ancienne `cle`, déjà révoquée)
  // n'est jamais rendue.
  return src && url?.src === src && Object.is(url.cle, cle) ? url.url : null
}

export interface AuthImageProps extends Omit<ComponentProps<"img">, "src"> {
  /** Adresse de l'image, transmise à `charger`. */
  src: string | null | undefined
  charger: AuthImageCharger
  /** Changer cette valeur recharge l'image (voir `useAuthObjectUrl`). */
  cle?: unknown
  /** Affiché pendant le chargement, en cas d'échec ou sans `src`. */
  secours?: ReactNode
}

/** Image servie par une adresse authentifiée : l'application fournit la
 *  fonction qui en récupère les octets. */
export function AuthImage({
  src,
  charger,
  cle,
  secours = null,
  alt = "",
  ...props
}: AuthImageProps) {
  const url = useAuthObjectUrl(src, charger, cle)
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
