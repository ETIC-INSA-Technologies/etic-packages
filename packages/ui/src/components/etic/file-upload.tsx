import { useState, type ComponentProps, type ReactNode } from "react"
import { cn } from "cn"
import { UploadIcon } from "lucide-react"
import {
  ErrorCode,
  useDropzone,
  type Accept,
  type FileRejection,
} from "react-dropzone"

import { Button } from "@etic-ui/components/ui/button"

/** Types acceptés, au format de react-dropzone. */
export type FileUploadAccept = Accept

export interface FileUploadOptions {
  /** Types acceptés, au format de react-dropzone : un type MIME et ses
   *  extensions, `{ "text/csv": [".csv"] }`. Tous par défaut. */
  accepter?: FileUploadAccept
  /** Taille maximale d'un fichier, en octets. */
  tailleMax?: number
  /** Plusieurs fichiers à la fois. */
  multiple?: boolean
  /** Reçoit les fichiers acceptés (jamais vide). */
  onChoisir: (fichiers: File[]) => void
  /** Reçoit les refus, en français (« rapport.exe : type de fichier non
   *  accepté (attendu : .pdf). »). */
  onRefuser?: (messages: string[]) => void
  disabled?: boolean
}

const nombre = new Intl.NumberFormat("fr", { maximumFractionDigits: 1 })

/** « 512 o », « 300 Ko », « 2,5 Mo ». */
function formaterTaille(octets: number) {
  if (octets < 1024) return `${octets}\u00a0o`
  if (octets < 1024 ** 2) return `${nombre.format(octets / 1024)}\u00a0Ko`
  if (octets < 1024 ** 3) return `${nombre.format(octets / 1024 ** 2)}\u00a0Mo`
  return `${nombre.format(octets / 1024 ** 3)}\u00a0Go`
}

/** « .csv, .pdf » : les extensions, ou à défaut les types MIME. */
function typesAcceptes(accepter: FileUploadAccept) {
  return Object.entries(accepter)
    .flatMap(([type, extensions]) =>
      extensions.length ? [...extensions] : [type]
    )
    .join(", ")
}

function messages(
  refus: FileRejection[],
  { accepter, tailleMax }: FileUploadOptions
): string[] {
  return refus.map(({ file, errors }) => {
    const raisons = errors.map((erreur) => {
      switch (erreur.code) {
        // Sans `multiple`, react-dropzone garde le premier fichier valable.
        case ErrorCode.TooManyFiles:
          return "ignoré, un seul fichier à la fois"
        case ErrorCode.FileInvalidType:
          return accepter
            ? `type de fichier non accepté (attendu\u00a0: ${typesAcceptes(accepter)})`
            : "type de fichier non accepté"
        case ErrorCode.FileTooLarge:
          return tailleMax
            ? `fichier trop volumineux (${formaterTaille(tailleMax)} au plus)`
            : "fichier trop volumineux"
        default:
          return erreur.message
      }
    })
    return `${file.name}\u00a0: ${raisons.join(", ")}.`
  })
}

/** L'`input type=file` de react-dropzone n'est qu'un moyen d'ouvrir le
 *  sélecteur : hors tabulation et hors de l'arbre d'accessibilité, où il
 *  apparaîtrait comme un second bouton « file upload », sans nom français. */
const INPUT_CACHE = { tabIndex: -1, "aria-hidden": true } as const

function useFichiers(options: FileUploadOptions, glisser: boolean) {
  const [erreurs, setErreurs] = useState<string[]>([])
  const zone = useDropzone({
    accept: options.accepter,
    maxSize: options.tailleMax,
    multiple: options.multiple ?? false,
    disabled: options.disabled,
    noClick: true,
    noKeyboard: true,
    noDrag: !glisser,
    onDrop: (acceptes, refus) => {
      const textes = refus.length ? messages(refus, options) : []
      setErreurs(textes)
      if (textes.length) options.onRefuser?.(textes)
      if (acceptes.length) options.onChoisir(acceptes)
    },
  })
  return { ...zone, erreurs }
}

/** Refus affichés, dans une zone d'alerte montée en permanence (une zone
 *  insérée avec son texte n'est pas toujours lue). Sans refus, elle est hors
 *  du flux (`sr-only`) : ni place, ni écart, ni élément de flex en trop. */
function Refus({
  erreurs,
  className,
}: {
  erreurs: string[]
  className?: string
}) {
  return (
    <div
      role="alert"
      data-slot="file-upload-refus"
      className={
        erreurs.length ? cn("text-sm text-destructive", className) : "sr-only"
      }
    >
      {erreurs.length ? (
        <ul>
          {erreurs.map((erreur, index) => (
            // Deux fichiers de même nom peuvent avoir le même refus.
            <li key={index}>{erreur}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export interface FileUploadButtonProps
  extends
    FileUploadOptions,
    Omit<
      ComponentProps<typeof Button>,
      "onClick" | "children" | "disabled" | "focusableWhenDisabled"
    > {
  /** Envoi en cours : bouton indisponible (il garde le focus), avec une
   *  roue et `libelleEnCours` ; le début et la fin sont annoncés. */
  enCours?: boolean
  libelleEnCours?: string
  children: ReactNode
}

/**
 * Bouton qui ouvre le sélecteur de fichiers du système, à la place du contrôle
 * natif « Choisir un fichier ». Types et taille vérifiés (react-dropzone) ;
 * les refus vont à `onRefuser`, ou s'affichent sans lui après le bouton, en
 * couleur destructive (sur une ligne entière, en fin de rangée `flex-wrap`) ;
 * sans refus, rien d'autre que le bouton n'occupe de place dans le flux. Le
 * même fichier peut être choisi deux fois de suite. Les autres attributs
 * (`id`, `aria-*`… posés par `FormField`) vont au bouton.
 */
export function FileUploadButton({
  accepter,
  tailleMax,
  multiple,
  onChoisir,
  onRefuser,
  disabled = false,
  enCours = false,
  libelleEnCours = "Envoi en cours…",
  children,
  ...props
}: FileUploadButtonProps) {
  const { getInputProps, open, erreurs } = useFichiers(
    { accepter, tailleMax, multiple, onChoisir, onRefuser, disabled },
    false
  )
  // Annonce du début et de la fin de l'envoi : le bouton garde le focus,
  // mais le changement de son texte n'est pas lu de façon fiable.
  const [annonce, setAnnonce] = useState("")
  const [enCoursVu, setEnCoursVu] = useState(enCours)
  if (enCours !== enCoursVu) {
    setEnCoursVu(enCours)
    setAnnonce(enCours ? libelleEnCours : "Envoi terminé.")
  }

  return (
    <>
      <Button
        {...props}
        disabled={disabled}
        enCours={enCours}
        libelleEnCours={libelleEnCours}
        onClick={open}
      >
        <UploadIcon data-icon="inline-start" />
        {children}
      </Button>
      {/* Hors du flux : dans une rangée flex, l'input compterait un écart. */}
      <span className="sr-only">
        <input {...getInputProps(INPUT_CACHE)} />
        <span role="status">{annonce}</span>
      </span>
      {/* Dans une rangée flex qui passe à la ligne (`flex-wrap`), les refus
          prennent une ligne entière, sous toute la rangée. */}
      {onRefuser ? null : (
        <Refus erreurs={erreurs} className="order-last basis-full" />
      )}
    </>
  )
}

export interface FileDropZoneProps
  extends FileUploadOptions, Omit<ComponentProps<"div">, "children"> {
  /** Invitation principale. */
  titre?: ReactNode
  /** Ligne secondaire ; par défaut, les types et la taille acceptés. */
  description?: ReactNode
  /** Libellé du bouton qui ouvre le sélecteur. */
  libelleBouton?: string
}

/**
 * Zone où déposer des fichiers par glisser-déposer, avec un bouton pour les
 * choisir au clavier ou à la souris. Types et taille vérifiés
 * (react-dropzone) ; les refus s'affichent dans la zone, en français, et vont
 * aussi à `onRefuser`.
 */
export function FileDropZone({
  accepter,
  tailleMax,
  multiple = false,
  onChoisir,
  onRefuser,
  disabled = false,
  titre,
  description,
  libelleBouton,
  className,
  ...props
}: FileDropZoneProps) {
  const {
    getRootProps,
    getInputProps,
    open,
    isDragActive,
    isDragReject,
    dragFileRejections,
    erreurs,
  } = useFichiers(
    { accepter, tailleMax, multiple, onChoisir, onRefuser, disabled },
    true
  )
  // Un fichier en trop seulement (deux glissés, un seul permis) : le premier
  // sera accepté, la zone ne se teinte pas en refus.
  const refus =
    isDragReject &&
    dragFileRejections.some(({ errors }) =>
      errors.some((erreur) => erreur.code !== ErrorCode.TooManyFiles)
    )
  const limites = [
    accepter ? typesAcceptes(accepter) : null,
    tailleMax ? `${formaterTaille(tailleMax)} au plus` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div
      {...getRootProps({
        ...props,
        className: cn(
          "flex flex-col items-center gap-3 rounded-lg border border-dashed border-input p-6 text-center transition-colors data-[disabled=true]:opacity-50 data-[glisse=true]:border-primary data-[glisse=true]:bg-primary/5 data-[refus=true]:border-destructive data-[refus=true]:bg-destructive/5",
          className
        ),
      })}
      data-slot="file-drop-zone"
      data-glisse={isDragActive}
      data-refus={refus}
      data-disabled={disabled}
    >
      <input {...getInputProps(INPUT_CACHE)} />
      <UploadIcon aria-hidden="true" className="size-6 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          {titre ??
            (multiple ? "Déposez des fichiers ici" : "Déposez un fichier ici")}
        </p>
        {description || limites ? (
          <p className="text-sm text-muted-foreground">
            {description ?? limites}
          </p>
        ) : null}
      </div>
      <Button variant="outline" size="sm" disabled={disabled} onClick={open}>
        {libelleBouton ??
          (multiple ? "Choisir des fichiers" : "Choisir un fichier")}
      </Button>
      <Refus erreurs={erreurs} />
    </div>
  )
}
