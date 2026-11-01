import {
  createContext,
  useContext,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react"

/** Lien du routeur de l'application (react-router, TanStack Router…), qui
 *  reçoit `href` comme un `<a>`. Par défaut, un `<a>` : rechargement complet. */
export type LienComposant = ComponentType<ComponentProps<"a">> | "a"

const ContexteLien = createContext<LienComposant>("a")

export interface LienProviderProps {
  /**
   * Le composant de lien du routeur, qui reçoit `href` comme un `<a>`. Une
   * référence stable, définie au niveau du module : un composant écrit en
   * ligne (`lien={(p) => <Link … />}`) serait nouveau à chaque rendu, et
   * React remonterait tous les liens de l'application.
   */
  lien: LienComposant
  children: ReactNode
}

/**
 * Donne une fois pour toutes le lien du routeur aux composants qui en
 * rendent un (`AppShell`, `DetailHeader`, `ButtonLink`, `DataTableCellLink`),
 * à poser autour de l'application : sans lui, ils rendent un `<a>`. La prop
 * `lien` d'un composant reste prioritaire (`lien="a"` pour un rechargement
 * complet, un téléchargement ou une adresse externe).
 */
export function LienProvider({ lien, children }: LienProviderProps) {
  return <ContexteLien.Provider value={lien}>{children}</ContexteLien.Provider>
}

/**
 * Le composant de lien à rendre : `lien` s'il est donné, sinon celui du
 * `LienProvider` le plus proche, sinon `<a>`. Pour les liens propres d'une
 * application : `const Lien = useLien()`, puis `<Lien href="/groupes">`.
 *
 * La valeur rendue est stable (une prop ou le contexte), mais la règle
 * `react-hooks/static-components` ne peut pas le savoir : un `<Lien />` rendu
 * directement par le composant qui appelle ce hook demande un
 * `eslint-disable-next-line` commenté (`ButtonLink`, `DataTableCellLink`).
 * Passé en prop à un sous-composant (`AppShell`), il n'en demande pas.
 */
export function useLien(lien?: LienComposant): LienComposant {
  const fourni = useContext(ContexteLien)
  return lien ?? fourni
}
