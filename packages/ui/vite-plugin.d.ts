import type { Plugin } from "vite"

export interface EticPackagesSourcesOptions {
  /** Sert aussi les sources de `@etic-insa/auth`. Faux par défaut. */
  auth?: boolean
  /**
   * Paquets à n'avoir qu'en un exemplaire, en plus de `react` et
   * `react-dom` : `@tanstack/react-query` quand l'`AuthProvider` des
   * sources doit voir le `QueryClient` de l'application.
   */
  dedupe?: string[]
}

/**
 * En développement (`vite`, hors vitest), sert les sources locales
 * d'etic-packages à la place des paquets installés : une modification de la
 * bibliothèque se voit aussitôt, sans build ni publication. Les sources
 * sont `ETIC_UI_SOURCES` (chemin de `packages/ui/src`), sinon
 * `etic-packages` à côté du dépôt de l'application (depuis un worktree
 * aussi), et seulement si ce checkout a ses `node_modules`.
 * `ETIC_UI_SOURCES=npm` force les paquets installés. Build et tests
 * gardent toujours les paquets installés.
 *
 * Alias de `@etic-insa/ui` (et de `/styles.css`, `/test`), `@etic-ui`,
 * `@etic-insa/auth` avec `auth` ; `dedupe` ; accès du serveur au checkout ;
 * `@source` des sources ajouté à la feuille CSS qui importe
 * `@etic-insa/ui/styles.css`. Annonce au démarrage ce qui est servi.
 */
export function eticPackagesSources(
  options?: EticPackagesSourcesOptions
): Plugin
