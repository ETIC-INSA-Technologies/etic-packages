import {
  useEffect,
  useEffectEvent,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { cn } from "cn"
import { SearchIcon, XIcon } from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@etic-ui/components/ui/combobox"
import {
  InputGroupAddon,
  InputGroupButton,
} from "@etic-ui/components/ui/input-group"
import { Spinner } from "@etic-ui/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"
import {
  attributsDuChamp,
  useFormField,
} from "@etic-ui/components/etic/form-field-context"

export interface SearchSelectProps<T> extends Omit<
  ComponentProps<"input">,
  | "value"
  | "defaultValue"
  | "onChange"
  | "children"
  | "type"
  | "disabled"
  | "required"
  | "name"
> {
  /** Élément choisi, ou `null`. Gardé par l'application : c'est lui qui
   *  fournit le libellé affiché, même s'il n'est pas dans les résultats. */
  valeur: T | null
  onValeurChange: (valeur: T | null) => void
  /** Cherche les éléments correspondant au texte saisi (texte vide : premières
   *  suggestions, à l'ouverture). `signal` est annulé quand une recherche plus
   *  récente part ; une réponse périmée est de toute façon ignorée. */
  rechercher: (texte: string, signal: AbortSignal) => Promise<T[]>
  /** Texte d'un élément, dans le champ une fois choisi. */
  libelleElement: (element: T) => string
  /** Identifiant stable d'un élément (valeur soumise avec `name`). */
  idElement: (element: T) => string
  /** Rendu d'une suggestion ; le libellé par défaut. */
  rendreOption?: (element: T) => ReactNode
  /** Échec d'une recherche (affiché « La recherche a échoué. ») ; par
   *  défaut, `console.error`. */
  onErreur?: (erreur: unknown) => void
  /** Attente après la dernière frappe avant de chercher, en millisecondes. */
  delai?: number
  /** Liste sans résultat. */
  vide?: ReactNode
  disabled?: boolean
  /** Bouton d'effacement quand un élément est choisi. */
  effacable?: boolean
  required?: boolean
  /** Nom du champ caché qui soumet `idElement(valeur)`. */
  name?: string
}

/** Dernière réponse reçue, et la recherche à laquelle elle répond. */
interface Reponse<T> {
  requete: string
  resultats: T[]
  erreur?: boolean
}

/**
 * Choix d'un élément dans une longue liste cherchée par l'application (sur le
 * serveur le plus souvent) : le Combobox de shadcn, en recherche asynchrone
 * avec anti-rebond, états de chargement, d'erreur et liste vide.
 *
 * Tant que la réponse ne correspond pas au texte saisi, la liste est vide et
 * dit « Recherche… » : un ancien résultat ne peut pas être choisi par erreur.
 * `className` va à l'enveloppe (`InputGroup`) ; les autres attributs
 * (`ref`, `onBlur`, `autoComplete`, `data-*`…) vont au champ de saisie.
 */
export function SearchSelect<T>({
  valeur,
  onValeurChange,
  rechercher,
  libelleElement,
  idElement,
  rendreOption,
  onErreur,
  delai = 300,
  placeholder = "Rechercher…",
  vide = "Aucun résultat.",
  disabled = false,
  effacable = true,
  required,
  name,
  form,
  id,
  className,
  onKeyDown,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ...props
}: SearchSelectProps<T>) {
  const champ = attributsDuChamp(useFormField(), {
    id,
    required,
    "aria-describedby": ariaDescribedby,
    "aria-invalid": ariaInvalid,
  })
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState("")
  // Le champ montre-t-il un texte tapé (et non le libellé de l'élément) ?
  const [tapee, setTapee] = useState(false)
  const [reponse, setReponse] = useState<Reponse<T> | null>(null)
  // Incrémenté par « Réessayer » : relance la même recherche.
  const [essai, setEssai] = useState(0)

  // Les dernières fonctions reçues, sans relancer la recherche quand
  // l'application les recrée à chaque rendu.
  const chercher = useEffectEvent(
    (texte: string, signal: AbortSignal) =>
      // Une exception levée avant la promesse devient un échec comme un autre.
      new Promise<T[]>((resolve) => resolve(rechercher(texte, signal)))
  )
  const signalerErreur = useEffectEvent((erreur: unknown) => {
    if (onErreur) onErreur(erreur)
    else console.error("SearchSelect : la recherche a échoué.", erreur)
  })

  const requete = texte.trim()
  useEffect(() => {
    if (!ouvert) return
    const controleur = new AbortController()
    const minuterie = window.setTimeout(
      () => {
        chercher(requete, controleur.signal).then(
          (resultats) => {
            if (!controleur.signal.aborted) setReponse({ requete, resultats })
          },
          (erreur: unknown) => {
            if (controleur.signal.aborted) return
            signalerErreur(erreur)
            setReponse({ requete, resultats: [], erreur: true })
          }
        )
      },
      // À l'ouverture, les premières suggestions partent sans attendre.
      requete ? delai : 0
    )
    return () => {
      window.clearTimeout(minuterie)
      controleur.abort()
    }
  }, [ouvert, requete, delai, essai])

  // Une réponse à une autre recherche (anti-rebond en cours, ou réponse pas
  // encore arrivée) n'est pas affichée.
  const charge = reponse?.requete !== requete
  const echec = !charge && Boolean(reponse?.erreur)
  const resultats = charge ? [] : (reponse?.resultats ?? [])

  // Relance la dernière recherche, même à texte identique (`essai` est une
  // dépendance de l'effet).
  const reessayer = () => {
    setReponse(null)
    setEssai((n) => n + 1)
  }

  return (
    <Combobox<T>
      items={resultats}
      // Les éléments sont déjà filtrés par `rechercher`.
      filter={null}
      value={valeur}
      onValueChange={(suivant) => onValeurChange(suivant)}
      itemToStringLabel={libelleElement}
      itemToStringValue={idElement}
      isItemEqualToValue={(a, b) => idElement(a) === idElement(b)}
      onOpenChange={(suivant) => {
        setOuvert(suivant)
        if (!suivant) {
          // Avec un élément choisi, le champ reprend son libellé : la
          // recherche repart de zéro. Sans choix, le texte saisi reste (voir
          // plus bas) et la recherche reprendra à la réouverture.
          if (valeur !== null) setTexte("")
          // Rouverte, la liste ne montre pas les résultats d'avant.
          setReponse(null)
        }
      }}
      onInputValueChange={(saisie, details) => {
        if (details.reason === "input-change") {
          setTexte(saisie)
          setTapee(saisie !== "")
          return
        }
        // Sans élément choisi, Base UI vide le champ quand la liste se ferme
        // (Entrée, Tab, clic ailleurs, même pendant la recherche) ou que les
        // suggestions changent : le texte tapé reste, l'utilisateur n'a pas
        // à le retaper.
        if (tapee && valeur === null && saisie === "") {
          details.cancel()
          return
        }
        setTapee(false)
        // Seule la frappe (ou l'effacement) lance une recherche : choisir un
        // élément remplit aussi le champ, avec son libellé.
        if (details.reason === "input-clear") setTexte(saisie)
      }}
      disabled={disabled}
      required={champ.required}
      name={name}
      // Relayé à l'entrée cachée qui porte la valeur, comme `name`.
      form={form}
    >
      <ComboboxInput
        {...props}
        id={champ.id}
        form={form}
        onKeyDown={(event) => {
          // Après un échec, Entrée relance la recherche (annoncé dans le
          // statut) : le bouton « Réessayer » de la liste n'est pas
          // atteignable au clavier, le focus restant dans le champ.
          if (event.key === "Enter" && echec) {
            event.preventDefault()
            event.preventBaseUIHandler()
            reessayer()
          }
          onKeyDown?.(event)
        }}
        placeholder={placeholder}
        disabled={disabled}
        showTrigger={false}
        className={className}
        aria-describedby={champ["aria-describedby"]}
        aria-invalid={champ["aria-invalid"]}
        // `required` va au Combobox (validation du formulaire) ; le champ
        // visible l'annonce.
        aria-required={champ.required}
      >
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        {effacable && valeur && !disabled ? (
          <InputGroupAddon align="inline-end">
            <Tooltip>
              <TooltipTrigger
                render={
                  <ComboboxPrimitive.Clear
                    aria-label="Effacer"
                    render={<InputGroupButton size="icon-xs" />}
                  />
                }
              >
                <XIcon />
              </TooltipTrigger>
              <TooltipContent>Effacer</TooltipContent>
            </Tooltip>
          </InputGroupAddon>
        ) : null}
      </ComboboxInput>
      <ComboboxContent>
        {/* Zone annoncée, montée avec la liste : chargement et échec. */}
        <ComboboxPrimitive.Status
          className={cn(
            "flex items-center justify-center gap-2 text-sm not-empty:py-2",
            echec ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {echec ? (
            <>
              La recherche a échoué.
              <span className="sr-only"> Entrée pour réessayer.</span>
            </>
          ) : charge ? (
            <>
              <Spinner role={undefined} aria-hidden="true" /> Recherche…
            </>
          ) : null}
        </ComboboxPrimitive.Status>
        {echec ? (
          <div className="flex justify-center pb-2">
            <Button
              variant="outline"
              size="xs"
              // Le focus reste dans le champ : la liste reste ouverte.
              onMouseDown={(event) => event.preventDefault()}
              onClick={reessayer}
            >
              Réessayer
            </Button>
          </div>
        ) : null}
        {charge || echec ? null : <ComboboxEmpty>{vide}</ComboboxEmpty>}
        <ComboboxList aria-busy={charge || undefined}>
          {(element: T) => (
            <ComboboxItem key={idElement(element)} value={element}>
              {rendreOption ? rendreOption(element) : libelleElement(element)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
