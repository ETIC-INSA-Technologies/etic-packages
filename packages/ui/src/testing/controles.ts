// Contrôles d'@etic-insa/ui lus et manipulés comme un utilisateur le fait.
// @testing-library/react est une dépendance pair facultative de la
// bibliothèque : seule cette entrée, `@etic-insa/ui/test/controles`,
// l'importe ; ni `@etic-insa/ui/test` ni le bundle d'une application.
import { fireEvent, screen, waitFor } from "@testing-library/react"

/**
 * Vrai si le bouton est inactif, quelle que soit la forme : `disabled`, ou
 * `aria-disabled` d'un bouton retenu par son `verrou`, qui reste
 * focalisable (`TooltipButton`, `DeleteButton`…).
 */
export function inactif(bouton: HTMLElement): boolean {
  return (
    (bouton as HTMLButtonElement).disabled ||
    bouton.getAttribute("aria-disabled") === "true"
  )
}

/**
 * Vrai si la case, le bouton radio ou l'interrupteur est coché : `checked`
 * d'un contrôle natif, `aria-checked` d'un contrôle de la bibliothèque.
 */
export function coche(controle: HTMLElement): boolean {
  return (
    (controle as HTMLInputElement).checked === true ||
    controle.getAttribute("aria-checked") === "true"
  )
}

/**
 * Un appui complet, comme une souris : appui, relâché, clic. Les options de
 * Base UI (`Select`, `Combobox`…) réagissent au relâché, qu'un
 * `fireEvent.click` seul n'envoie pas.
 */
export function appuyer(element: HTMLElement): void {
  fireEvent.pointerDown(element)
  fireEvent.mouseDown(element)
  fireEvent.pointerUp(element)
  fireEvent.mouseUp(element)
  fireEvent.click(element)
}

/** Attend que la liste d'options se soit refermée. */
function listeFermee() {
  return waitFor(() => {
    if (screen.queryByRole("listbox"))
      throw new Error("La liste d'options est encore ouverte.")
  })
}

/**
 * Choisit une option d'une liste (`Select`, `SelectField`) : l'ouvre,
 * appuie sur l'option, attend qu'elle se referme.
 */
export async function choisir(
  liste: HTMLElement,
  option: string | RegExp
): Promise<void> {
  fireEvent.click(liste)
  appuyer(await screen.findByRole("option", { name: option }))
  await listeFermee()
}

/** Ce qu'affiche une liste (`Select`) : le libellé de la valeur choisie, ou
 *  son texte d'invite. */
export function valeurAffichee(liste: HTMLElement): string {
  const valeur = liste.querySelector('[data-slot="select-value"]') ?? liste
  return (valeur.textContent ?? "").trim()
}

/** Les libellés des options d'une liste (`Select`), ouverte le temps de les
 *  lire puis refermée par Échap. */
export async function optionsDe(liste: HTMLElement): Promise<string[]> {
  fireEvent.click(liste)
  const libelles = (await screen.findAllByRole("option")).map((option) =>
    (option.textContent ?? "").trim()
  )
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" })
  await listeFermee()
  return libelles
}

/**
 * Tape `texte` dans un champ de recherche (`SearchSelect`) et choisit une
 * suggestion. La liste attend la recherche différée, puis la réponse : si
 * elle tarde, relever le délai des attentes de testing-library
 * (`configure({ asyncUtilTimeout })`) plutôt que d'ajouter des `timeout`.
 */
export async function chercher(
  champ: HTMLElement,
  texte: string,
  option: string | RegExp
): Promise<void> {
  champ.focus()
  fireEvent.keyDown(champ, { key: "ArrowDown" })
  fireEvent.input(champ, { target: { value: texte } })
  appuyer(await screen.findByRole("option", { name: option }))
}
