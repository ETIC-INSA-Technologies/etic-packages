import {
  createContext,
  createElement,
  useContext,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react"
import { useRender } from "@base-ui/react/use-render"

/** Lien du routeur de l'application (react-router, TanStack Router…), qui
 *  reçoit `href` comme un `<a>`. Par défaut, un `<a>` : rechargement complet. */
export type LienComposant = ComponentType<ComponentProps<"a">> | "a"

const ContexteLien = createContext<LienComposant>("a")

export interface LienProviderProps {
  /** Le composant de lien du routeur, qui reçoit `href` comme un `<a>`. */
  lien: LienComposant
  children: ReactNode
}

/**
 * Donne une fois pour toutes le lien du routeur aux composants qui en
 * rendent un (`AppShell`, `DetailHeader`, `ButtonLink`…), à poser autour de
 * l'application : sans lui, ils rendent un `<a>`. La prop `lien` d'un
 * composant reste prioritaire (`lien="a"` pour un rechargement complet).
 */
export function LienProvider({ lien, children }: LienProviderProps) {
  return <ContexteLien.Provider value={lien}>{children}</ContexteLien.Provider>
}

/** Le composant de lien à rendre : `lien` s'il est donné, sinon celui du
 *  `LienProvider` le plus proche, sinon `<a>`. */
export function useLien(lien?: LienComposant): LienComposant {
  const fourni = useContext(ContexteLien)
  return lien ?? fourni
}

/**
 * Un lien rendu par le composant de `useLien(lien)`. Usage interne
 * (`ButtonLink`, `DataTableCellLink`). L'élément vide du composant choisi
 * reçoit les props par `useRender` de Base UI, plutôt qu'un `<Lien />` en
 * JSX : le composant est stable, mais la règle
 * `react-hooks/static-components` prendrait un composant lu d'un hook pour
 * un composant créé pendant le rendu.
 */
export function LienApplication({
  lien,
  ...props
}: ComponentProps<"a"> & { lien?: LienComposant }) {
  return useRender({ render: createElement(useLien(lien)), props })
}
