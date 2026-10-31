// Démonstrations des compositions de formulaire (components/etic).
import { useState, type ReactNode } from "react"
import { BanIcon } from "lucide-react"

import {
  Button,
  CheckboxList,
  DatePicker,
  FileDropZone,
  FileUploadButton,
  FormField,
  FormSection,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  PhoneInput,
  SearchSelect,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useDraftAutosave,
} from "@etic-ui/index"

interface Personne {
  id: string
  nom: string
  courriel: string
}

const PERSONNES: Personne[] = [
  { id: "1", nom: "Ada Lovelace", courriel: "ada@example.org" },
  { id: "2", nom: "Alan Turing", courriel: "alan@example.org" },
  { id: "3", nom: "Grace Hopper", courriel: "grace@example.org" },
  { id: "4", nom: "Katherine Johnson", courriel: "katherine@example.org" },
  { id: "5", nom: "Margaret Hamilton", courriel: "margaret@example.org" },
]

const POLES = [
  { value: "bureau", label: "Bureau" },
  { value: "dsi", label: "DSI" },
  { value: "commercial", label: "Commercial" },
  { value: "qualite", label: "Qualité" },
]

/** Recherche simulée : 400 ms de réseau, sans accent ni casse. */
function rechercherPersonnes(texte: string, signal: AbortSignal) {
  const plier = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
  return new Promise<Personne[]>((resolve, reject) => {
    const minuterie = setTimeout(
      () =>
        resolve(
          PERSONNES.filter((p) =>
            plier(`${p.nom} ${p.courriel}`).includes(plier(texte))
          ).slice(0, 4)
        ),
      400
    )
    signal.addEventListener("abort", () => {
      clearTimeout(minuterie)
      reject(signal.reason)
    })
  })
}

function DemoChamps() {
  const [nom, setNom] = useState("")
  const [naissance, setNaissance] = useState<Date | undefined>()
  const [telephone, setTelephone] = useState("")
  const [telephoneValide, setTelephoneValide] = useState(true)
  const [parrain, setParrain] = useState<Personne | null>(null)
  const [pole, setPole] = useState<string | null>(null)
  return (
    <form
      className="flex max-w-md flex-col gap-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <FormSection
        titre="Identité"
        description="Telle qu'elle figure sur une pièce d'identité."
      >
        <FormField
          libelle="Nom"
          obligatoire
          erreur={nom.trim() ? undefined : "Le nom est obligatoire."}
        >
          <Input
            required
            value={nom}
            onChange={(event) => setNom(event.target.value)}
          />
        </FormField>
        <FormField libelle="Date de naissance">
          <DatePicker
            valeur={naissance}
            onValeurChange={(date) => setNaissance(date)}
            dateMax={new Date()}
            listesMoisAnnee
          />
        </FormField>
        {/* Le déclencheur du Select prend le libellé comme nom accessible. */}
        <FormField libelle="Pôle">
          <Select
            items={POLES}
            value={pole}
            onValueChange={(valeur) => setPole(valeur)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un pôle" />
            </SelectTrigger>
            <SelectContent>
              {POLES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>
      <FormSection titre="Contact">
        <FormField
          libelle="Téléphone"
          erreur={telephoneValide ? undefined : "Numéro incomplet ou invalide."}
          description={telephone ? `Valeur : ${telephone}` : undefined}
        >
          <PhoneInput
            valeur={telephone}
            onValeurChange={(valeur, { valide }) => {
              setTelephone(valeur)
              setTelephoneValide(!valeur || valide)
            }}
          />
        </FormField>
        <FormField libelle="Parrain ou marraine">
          <SearchSelect<Personne>
            valeur={parrain}
            onValeurChange={setParrain}
            rechercher={rechercherPersonnes}
            libelleElement={(p) => p.nom}
            idElement={(p) => p.id}
            rendreOption={(p) => (
              <span className="flex flex-col">
                {p.nom}
                <span className="text-xs text-muted-foreground">
                  {p.courriel}
                </span>
              </span>
            )}
            placeholder="Rechercher un membre…"
            vide="Aucun membre trouvé."
          />
        </FormField>
      </FormSection>
      <FormSection titre="Pièces jointes">
        {/* Autour d'un InputGroup, le libellé vise le champ, pas le groupe. */}
        <FormField libelle="Taille maximale" description="Par fichier.">
          <InputGroup>
            <InputGroupInput inputMode="numeric" defaultValue="5" />
            <InputGroupAddon align="inline-end">
              <InputGroupText>Mo</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </FormField>
      </FormSection>
    </form>
  )
}

function DemoChoix() {
  const [decision, setDecision] = useState<
    "garder" | "changer" | "depart" | null
  >(null)
  const [groupes, setGroupes] = useState(["membres"])
  const [statut, setStatut] = useState<"actif" | "ancien" | null>(null)
  const [poles, setPoles] = useState<string[]>([])
  return (
    <div className="flex flex-col gap-6">
      {/* Un groupe obligatoire se dit « obligatoire » dans son nom. */}
      <FormField
        libelle="Statut"
        obligatoire
        erreur={statut ? undefined : "Choisissez un statut."}
      >
        <SegmentedControl
          valeur={statut}
          onValeurChange={setStatut}
          options={[
            { valeur: "actif", libelle: "Actif" },
            { valeur: "ancien", libelle: "Ancien" },
          ]}
        />
      </FormField>
      <FormField
        libelle="Pôles suivis"
        obligatoire
        description="Au moins un."
        erreur={poles.length ? undefined : "Cochez au moins un pôle."}
      >
        <CheckboxList
          options={POLES.map((p) => ({ valeur: p.value, libelle: p.label }))}
          valeurs={poles}
          onValeursChange={setPoles}
        />
      </FormField>
      <SegmentedControl
        aria-label="Décision"
        valeur={decision}
        onValeurChange={setDecision}
        options={[
          { valeur: "garder", libelle: "Conserver" },
          { valeur: "changer", libelle: "Changer" },
          {
            valeur: "depart",
            libelle: <BanIcon />,
            infobulle: "Départ",
            className: "aria-pressed:bg-warning/15 aria-pressed:text-warning",
          },
        ]}
      />
      <FormSection titre="Groupes">
        <CheckboxList
          options={[
            { valeur: "bureau", libelle: "Bureau" },
            { valeur: "dsi", libelle: "DSI" },
            { valeur: "tresorerie", libelle: "Trésorerie" },
            {
              valeur: "membres",
              libelle: "Membres",
              description: "Groupe obligatoire du poste.",
              disabled: true,
            },
          ]}
          valeurs={groupes}
          onValeursChange={setGroupes}
        />
      </FormSection>
    </div>
  )
}

function DemoFichiers() {
  const [message, setMessage] = useState("")
  const [enCours, setEnCours] = useState(false)
  return (
    <div className="flex max-w-md flex-col gap-4">
      {/* Sans `onRefuser`, le bouton affiche lui-même ses refus, sur une
          ligne entière de la rangée. */}
      <div className="flex flex-wrap items-center gap-3">
        <FileUploadButton
          variant="outline"
          accepter={{ "application/pdf": [".pdf"] }}
          tailleMax={5 * 1024 * 1024}
          enCours={enCours}
          onChoisir={([fichier]) => {
            setMessage(`Envoi de ${fichier.name}…`)
            setEnCours(true)
            setTimeout(() => {
              setEnCours(false)
              setMessage(`${fichier.name} envoyé.`)
            }, 1500)
          }}
        >
          Joindre un PDF
        </FileUploadButton>
        <Button variant="ghost">Autre action</Button>
      </div>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {message}
      </span>
      <FileDropZone
        accepter={{ "text/csv": [".csv"] }}
        tailleMax={2 * 1024 * 1024}
        onChoisir={([fichier]) => setMessage(`${fichier.name} reçu.`)}
      />
    </div>
  )
}

function DemoBrouillon() {
  const [note, setNote] = useState("")
  const [range, setRange] = useState("")
  const brouillon = useDraftAutosave({
    contenu: note ? { note } : null,
    enregistrer: async (contenu, version) => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      setRange(`${contenu.note} (version ${version + 1})`)
      return version + 1
    },
  })
  return (
    <div className="flex max-w-md flex-col gap-3">
      <FormField
        libelle="Note"
        description="Rangée 1,2 s après la dernière frappe."
      >
        <Input value={note} onChange={(event) => setNote(event.target.value)} />
      </FormField>
      <p className="text-sm text-muted-foreground">
        Rangé : {range || "rien encore"}
      </p>
      <Button
        variant="outline"
        className="w-fit"
        onClick={() => void brouillon.enregistrerMaintenant()}
      >
        Enregistrer maintenant
      </Button>
    </div>
  )
}

export const FORMULAIRES: {
  id: string
  titre: string
  rendu: () => ReactNode
}[] = [
  {
    id: "formulaire",
    titre: "FormField, DatePicker, PhoneInput, SearchSelect",
    rendu: () => <DemoChamps />,
  },
  {
    id: "choix",
    titre: "SegmentedControl, CheckboxList",
    rendu: () => <DemoChoix />,
  },
  {
    id: "fichiers",
    titre: "FileUploadButton, FileDropZone",
    rendu: () => <DemoFichiers />,
  },
  {
    id: "brouillon",
    titre: "useDraftAutosave",
    rendu: () => <DemoBrouillon />,
  },
]
