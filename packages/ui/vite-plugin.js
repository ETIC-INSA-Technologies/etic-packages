// @ts-check
// Plugin Vite des applications : `@etic-insa/ui/vite`. Code Node, chargé par
// le `vite.config.ts` de l'application ; jamais dans un bundle. Types :
// vite-plugin.d.ts.
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { searchForWorkspaceRoot } from "vite"

const VARIABLE = "ETIC_UI_SOURCES"
const IMPORT_STYLES = "@etic-insa/ui/styles.css"

/**
 * Les sources locales à servir, ou `null` (avec la raison) : la variable
 * `ETIC_UI_SOURCES` (chemin de `packages/ui/src`, ou `npm`), sinon
 * `etic-packages` à côté du dépôt de l'application, depuis son checkout
 * principal comme depuis un worktree.
 *
 * @param {boolean} auth
 * @returns {{ ui: string, auth: string, racine: string } | { raison: string }}
 */
function trouverSources(auth) {
  const choix = process.env[VARIABLE]
  if (choix === "npm") return { raison: `${VARIABLE}=npm` }
  let ui = choix
  if (!ui) {
    try {
      const depotGit = execFileSync(
        "git",
        ["rev-parse", "--path-format=absolute", "--git-common-dir"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      ).trim()
      ui = resolve(dirname(depotGit), "../etic-packages/packages/ui/src")
    } catch {
      return { raison: "application hors d'un dépôt git" }
    }
  }
  const racine = resolve(ui, "../../..")
  const sourcesAuth = resolve(racine, "packages/auth/src")
  // Les sources importent leurs propres dépendances (Base UI,
  // shadcn/tailwind.css…) : sans les node_modules d'etic-packages, rien ne
  // se résoudrait.
  const complet =
    existsSync(resolve(ui, "index.ts")) &&
    (!auth || existsSync(resolve(sourcesAuth, "index.ts"))) &&
    existsSync(resolve(racine, "node_modules"))
  return complet
    ? { ui, auth: sourcesAuth, racine }
    : { raison: "pas de checkout d'etic-packages avec ses node_modules" }
}

/** @param {string} racine */
function decrireCommit(racine) {
  try {
    /** @param {string[]} args */
    const git = (...args) =>
      execFileSync("git", ["-C", racine, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim()
    const modifie = git("status", "--porcelain", "--", "packages")
      ? ", modifié"
      : ""
    return `${git("rev-parse", "--abbrev-ref", "HEAD")} ${git("rev-parse", "--short", "HEAD")}${modifie}`
  } catch {
    return "commit inconnu"
  }
}

/**
 * @param {string} texte
 */
const exact = (texte) =>
  new RegExp(`^${texte.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`)

/**
 * @param {import("./vite-plugin.js").EticPackagesSourcesOptions} [options]
 * @returns {import("vite").Plugin}
 */
export function eticPackagesSources(options = {}) {
  const { auth = false, dedupe = [] } = options
  /** @type {ReturnType<typeof trouverSources> | null} */
  let sources = null

  return {
    name: "etic-packages-sources",
    enforce: "pre",
    apply: (_config, { command }) => command === "serve" && !process.env.VITEST,
    config(config) {
      sources = trouverSources(auth)
      if ("raison" in sources) return
      const { ui, racine } = sources
      return {
        resolve: {
          alias: [
            {
              find: exact(IMPORT_STYLES),
              replacement: resolve(ui, "styles.css"),
            },
            {
              find: exact("@etic-insa/ui/test"),
              replacement: resolve(ui, "testing/index.ts"),
            },
            {
              find: exact("@etic-insa/ui/charts"),
              replacement: resolve(ui, "charts/index.ts"),
            },
            {
              find: exact("@etic-insa/ui"),
              replacement: resolve(ui, "index.ts"),
            },
            // Les composants de la bibliothèque s'importent entre eux par
            // « @etic-ui/… ».
            { find: /^@etic-ui\//, replacement: `${ui}/` },
            ...(auth
              ? [
                  {
                    find: exact("@etic-insa/auth"),
                    replacement: resolve(sources.auth, "index.ts"),
                  },
                ]
              : []),
          ],
          // Une seule copie de React (et de ce que l'application ajoute),
          // même si etic-packages a ses propres node_modules. recharts
          // aussi : le `ChartContainer` des sources et les graphiques de
          // l'application partagent ses contextes (taille du conteneur).
          dedupe: ["react", "react-dom", "recharts", ...dedupe],
        },
        server: {
          fs: {
            // Les sources et leurs node_modules sont hors de la racine de
            // l'application. Donner `allow` coupe la détection de l'espace
            // de travail : il est repris ici.
            allow: [
              searchForWorkspaceRoot(config.root ?? process.cwd()),
              racine,
            ],
          },
        },
      }
    },
    configureServer(serveur) {
      if (!sources) return
      serveur.config.logger.info(
        "raison" in sources
          ? `Bibliothèque : paquets npm installés (${sources.raison})`
          : `Bibliothèque : sources locales ${sources.racine} (${decrireCommit(sources.racine)})`
      )
    },
    // Tailwind doit lire les sources pour générer les classes des
    // composants modifiés : la feuille qui importe les styles de la
    // bibliothèque reçoit leur `@source`.
    transform(code, id) {
      if (!sources || "raison" in sources) return
      const chemin = id.split("?")[0]
      if (chemin.endsWith(".css") && code.includes(IMPORT_STYLES)) {
        return `${code}\n@source ${JSON.stringify(sources.ui)};\n`
      }
    },
  }
}
