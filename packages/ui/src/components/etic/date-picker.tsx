import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from "react"
import { format, isValid, parse, startOfDay } from "date-fns"
import { CalendarIcon, XIcon } from "lucide-react"

import { Calendar } from "@etic-ui/components/ui/calendar"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@etic-ui/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@etic-ui/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"
import {
  attributsDuChamp,
  useFormField,
} from "@etic-ui/components/etic/form-field-context"

const FORMAT = "dd/MM/yyyy"
// Formats acceptés à la saisie, du plus au moins précis : « 05/03/2026 »,
// « 5/3/2026 », « 05-03-2026 », « 05.03.2026 », « 5/3/26 ». Les chiffres
// seuls (« 05032026 », « 050326 ») servent le pavé numérique de l'iPhone,
// qui n'a pas de séparateur.
const FORMATS_SAISIE = ["dd/MM/yyyy", "d/M/yyyy", "d/M/yy"]

function lireDate(texte: string): Date | undefined {
  const brut = texte.trim()
  const motifs = /^\d{8}$/.test(brut)
    ? ["ddMMyyyy"]
    : /^\d{6}$/.test(brut)
      ? ["ddMMyy"]
      : FORMATS_SAISIE
  const normalise = brut.replace(/[-.\s]+/g, "/")
  for (const motif of motifs) {
    // Motifs numériques : aucune locale nécessaire.
    const date = parse(normalise, motif, new Date())
    if (isValid(date) && date.getFullYear() >= 1000) return date
  }
  return undefined
}

const afficher = (date: Date | undefined) => (date ? format(date, FORMAT) : "")

function messageBornes(dateMin: Date | undefined, dateMax: Date | undefined) {
  if (dateMin && dateMax)
    return `Date hors limites\u00a0: entre le ${afficher(dateMin)} et le ${afficher(dateMax)}.`
  if (dateMin)
    return `Date hors limites\u00a0: à partir du ${afficher(dateMin)}.`
  return `Date hors limites\u00a0: jusqu'au ${afficher(dateMax)}.`
}

/** Une seule ref pour celle de l'application et celle du composant. */
function fusionner<T>(...refs: (Ref<T> | undefined)[]) {
  return (element: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(element)
      else if (ref) ref.current = element
    }
  }
}

export interface DatePickerDetails {
  /** La saisie ne se lit pas comme une date permise (illisible, ou hors des
   *  bornes) : la date reçue vaut alors `undefined`, et le champ dit
   *  pourquoi. À bloquer avant l'envoi du formulaire. */
  invalide: boolean
}

export interface DatePickerProps extends Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "min" | "max"
> {
  /** Date choisie (l'heure est ignorée). */
  valeur: Date | undefined
  onValeurChange: (date: Date | undefined, details: DatePickerDetails) => void
  /** Premier et dernier jour permis. */
  dateMin?: Date
  dateMax?: Date
  /** Listes déroulantes du mois et de l'année dans le calendrier, pour les
   *  dates lointaines (naissance…). */
  listesMoisAnnee?: boolean
  /** Bouton d'effacement quand une date est choisie. */
  effacable?: boolean
}

/**
 * Le « Date Picker » de shadcn, version avec saisie : la date se tape au
 * clavier (jj/mm/aaaa, ou les chiffres seuls) ou se choisit dans le
 * calendrier (Popover + Calendar, en français, semaine au lundi). La saisie
 * est lue en quittant le champ ou sur Entrée. Une saisie illisible ou hors
 * des bornes rend le champ invalide, dit pourquoi sous le champ, et
 * `onValeurChange` reçoit `undefined` avec `{ invalide: true }`.
 *
 * `className` va à l'enveloppe (`InputGroup`), le reste au champ de saisie ;
 * avec `name`, un champ caché soumet la date au format ISO (`2026-03-05`).
 */
export function DatePicker({
  valeur,
  onValeurChange,
  dateMin,
  dateMax,
  listesMoisAnnee = false,
  effacable = true,
  placeholder = "jj/mm/aaaa",
  disabled,
  className,
  onBlur,
  onKeyDown,
  id,
  name,
  form,
  required,
  ref,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ...props
}: DatePickerProps) {
  const champ = attributsDuChamp(useFormField(), {
    id,
    required,
    "aria-describedby": ariaDescribedby,
    "aria-invalid": ariaInvalid,
  })
  const idInterne = useId()
  const idFormat = `${idInterne}-format`
  const idMessage = `${idInterne}-message`
  const champRef = useRef<HTMLInputElement>(null)
  const refChamp = useMemo(() => fusionner(ref, champRef), [ref])
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState(() => afficher(valeur))
  // Pourquoi la saisie est refusée, ou `null`.
  const [refus, setRefus] = useState<string | null>(null)
  const [mois, setMois] = useState<Date | undefined>(valeur)
  // Dernière valeur vue (reçue ou émise) : une autre valeur, venue de
  // l'application (réinitialisation du formulaire…), remplace la saisie.
  // Après un refus, l'application peut enregistrer le `undefined` émis ou
  // garder sa valeur : dans les deux cas, la saisie refusée et son message
  // restent jusqu'à la prochaine frappe.
  const [valeurVue, setValeurVue] = useState(valeur)
  if (valeur?.getTime() !== valeurVue?.getTime()) {
    setValeurVue(valeur)
    if (!(refus && valeur === undefined)) {
      setTexte(afficher(valeur))
      setRefus(null)
      if (valeur) setMois(valeur)
    }
  }

  // Un formulaire natif refuse aussi l'envoi, avec le même message.
  useEffect(() => {
    champRef.current?.setCustomValidity(refus ?? "")
  }, [refus])

  const horsBornes = (date: Date) =>
    (dateMin !== undefined && date < startOfDay(dateMin)) ||
    (dateMax !== undefined && date > startOfDay(dateMax))

  function choisir(date: Date | undefined) {
    setTexte(afficher(date))
    setRefus(null)
    setValeurVue(date)
    if (date) setMois(date)
    if (date?.getTime() !== valeur?.getTime() || refus)
      onValeurChange(date, { invalide: false })
  }

  function refuser(raison: string) {
    setRefus(raison)
    if (valeur !== undefined || !refus)
      onValeurChange(undefined, { invalide: true })
  }

  function validerSaisie() {
    if (!texte.trim()) return choisir(undefined)
    const date = lireDate(texte)
    if (!date) return refuser("Date illisible\u00a0: saisissez jj/mm/aaaa.")
    if (horsBornes(date)) return refuser(messageBornes(dateMin, dateMax))
    choisir(date)
  }

  const decrit = [champ["aria-describedby"], refus ? idMessage : null, idFormat]
    .filter(Boolean)
    .join(" ")

  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <InputGroup className={className}>
        <InputGroupInput
          {...props}
          {...champ}
          ref={refChamp}
          form={form}
          // Le `aria-required` posé par FormField cède au vrai `required`.
          aria-required={undefined}
          aria-describedby={decrit}
          aria-keyshortcuts="Alt+ArrowDown"
          value={texte}
          placeholder={placeholder}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={Boolean(refus) || champ["aria-invalid"] || undefined}
          onChange={(event) => {
            setTexte(event.target.value)
            setRefus(null)
          }}
          onBlur={(event) => {
            validerSaisie()
            onBlur?.(event)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              // Entrée lit la date sans soumettre le formulaire.
              event.preventDefault()
              validerSaisie()
            } else if (event.key === "ArrowDown" && event.altKey) {
              event.preventDefault()
              setOuvert(true)
            }
            onKeyDown?.(event)
          }}
        />
        <InputGroupAddon align="inline-end">
          {effacable && valeur && !disabled ? (
            <BoutonIcone
              libelle="Effacer la date"
              onClick={() => {
                choisir(undefined)
                // Le bouton disparaît : le focus revient au champ.
                champRef.current?.focus()
              }}
            >
              <XIcon />
            </BoutonIcone>
          ) : null}
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <InputGroupButton
                      size="icon-xs"
                      aria-label="Choisir dans le calendrier"
                      disabled={disabled}
                    />
                  }
                />
              }
            >
              <CalendarIcon />
            </TooltipTrigger>
            <TooltipContent>Choisir dans le calendrier</TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>
      <span id={idFormat} hidden>
        {"Format\u00a0: jj/mm/aaaa."}
      </span>
      {refus ? (
        <p
          id={idMessage}
          data-slot="date-picker-message"
          className="text-sm text-destructive"
        >
          {refus}
        </p>
      ) : null}
      {name ? (
        <input
          type="hidden"
          name={name}
          form={form}
          disabled={disabled}
          value={valeur ? format(valeur, "yyyy-MM-dd") : ""}
        />
      ) : null}
      <PopoverContent
        className="w-auto overflow-hidden p-0"
        align="end"
        alignOffset={-8}
        sideOffset={10}
      >
        <Calendar
          mode="single"
          // Recliquer le jour choisi le garde : on efface par le bouton.
          required
          selected={valeur}
          month={mois}
          onMonthChange={setMois}
          captionLayout={listesMoisAnnee ? "dropdown" : "label"}
          startMonth={dateMin}
          endMonth={dateMax}
          disabled={[
            ...(dateMin ? [{ before: dateMin }] : []),
            ...(dateMax ? [{ after: dateMax }] : []),
          ]}
          onSelect={(date) => {
            choisir(date)
            setOuvert(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

function BoutonIcone({
  libelle,
  children,
  onClick,
}: {
  libelle: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <InputGroupButton
            size="icon-xs"
            aria-label={libelle}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{libelle}</TooltipContent>
    </Tooltip>
  )
}
