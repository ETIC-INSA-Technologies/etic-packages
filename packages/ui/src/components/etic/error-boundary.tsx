import { Component, createRef, type ErrorInfo, type ReactNode } from "react"
import { CircleAlertIcon } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@etic-ui/components/ui/alert"
import { ButtonLink } from "@etic-ui/components/etic/button-link"
import {
  BoutonReessayer,
  DetailTechnique,
} from "@etic-ui/components/etic/error-banner"

export interface ErrorBoundaryProps {
  children: ReactNode
  /**
   * Changer cette valeur efface l'erreur et retente le rendu : le chemin de
   * la route, typiquement, pour qu'une page cassée ne le reste pas après
   * avoir navigué ailleurs.
   */
  cleReinitialisation?: unknown
  /** Ce qui a cassé, dans la phrase « …s'est produite dans {portee} ». */
  portee?: string
  /** Paragraphe propre à l'application sous le message (brouillon conservé…). */
  message?: ReactNode
  /** Lien de « Retour à l'accueil » ; « / » par défaut. */
  accueil?: string
  /** Remplace tout l'affichage de l'erreur. */
  secours?: (erreur: Error, reinitialiser: () => void) => ReactNode
  /** Appelé à chaque erreur attrapée ; par défaut, `console.error`. */
  onErreur?: (erreur: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  erreur: Error | null
  cle: unknown
}

/**
 * Filet sous le rendu : une exception levée pendant un rendu démonte tout
 * l'arbre et laisse une page blanche, qui passe pour une panne du serveur et
 * pousse à recharger (et à perdre le travail en cours). Ce composant la
 * remplace par un message, le détail technique replié, « Réessayer » et
 * « Retour à l'accueil ». Une erreur réseau, elle, s'affiche avec
 * `ErrorBanner` ou `QueryBoundary`.
 *
 * Si le focus était dans la partie qui a cassé, il passe sur le message
 * (sinon il tomberait sur la page). À poser à deux niveaux : autour de
 * chaque page, dans la coquille (la navigation survit), et à la racine.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    erreur: null,
    cle: this.props.cleReinitialisation,
  }

  private repli = createRef<HTMLDivElement>()

  static getDerivedStateFromError(
    erreur: unknown
  ): Partial<ErrorBoundaryState> {
    return {
      erreur: erreur instanceof Error ? erreur : new Error(String(erreur)),
    }
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    if (Object.is(props.cleReinitialisation, state.cle)) return null
    return { erreur: null, cle: props.cleReinitialisation }
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    if (this.props.onErreur) this.props.onErreur(erreur, info)
    else console.error("Erreur de rendu", erreur, info.componentStack)
  }

  // « Réessayer » vient d'être choisi : si le rendu casse de nouveau, React
  // remplace le repli par un nouveau sans état intermédiaire (l'état d'avant
  // a déjà une erreur, parfois la même).
  private apresReinitialisation = false

  /** L'élément qui avait le focus a été démonté avec l'arbre cassé (ou avec
   *  le repli précédent) : le focus est retombé sur <body>. Il passe au
   *  message. Ailleurs dans la page, il n'est pas déplacé. */
  private recupererFocus() {
    const actif = document.activeElement
    if (!actif || actif === document.body) this.repli.current?.focus()
  }

  componentDidMount() {
    // Montée déjà en erreur : l'enfant a cassé dès son premier rendu.
    if (this.state.erreur) this.recupererFocus()
  }

  componentDidUpdate(_props: ErrorBoundaryProps, avant: ErrorBoundaryState) {
    const relance = this.apresReinitialisation
    this.apresReinitialisation = false
    if (!this.state.erreur) return
    if (relance || avant.erreur !== this.state.erreur) this.recupererFocus()
  }

  reinitialiser = () => {
    this.apresReinitialisation = true
    this.setState({ erreur: null })
  }

  render() {
    const { erreur } = this.state
    if (!erreur) return this.props.children
    const { secours, portee = "la page", message, accueil = "/" } = this.props
    if (secours) return secours(erreur, this.reinitialiser)

    return (
      <Alert
        ref={this.repli}
        tabIndex={-1}
        variant="destructive"
        className="outline-none"
      >
        <CircleAlertIcon />
        <AlertTitle>
          Une erreur inattendue s'est produite dans {portee}.
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <div>
            Ce n'est pas une panne du serveur&nbsp;: les données déjà
            enregistrées sont intactes.
          </div>
          {message ? <div>{message}</div> : null}
          <DetailTechnique
            libelle="Détails techniques"
            detail={
              erreur.stack?.includes(erreur.message)
                ? erreur.stack
                : `${erreur.message}${erreur.stack ? `\n\n${erreur.stack}` : ""}`
            }
          />
        </AlertDescription>
        {/* Hors de la description, dont les liens sont soulignés : celui-ci
            a l'allure d'un bouton. */}
        <div className="col-start-2 mt-2 flex flex-wrap gap-2">
          <BoutonReessayer onClick={this.reinitialiser} />
          {/* Rechargement complet voulu, même sous un `LienProvider` : il
              repart d'un état sain. */}
          <ButtonLink lien="a" href={accueil} size="sm">
            Retour à l'accueil
          </ButtonLink>
        </div>
      </Alert>
    )
  }
}
