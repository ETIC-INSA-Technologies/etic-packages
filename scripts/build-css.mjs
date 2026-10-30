// Écrit dist/styles.css : src/styles.css avec l'import de shadcn/tailwind.css
// remplacé par son contenu, pour que les applications n'aient pas à installer
// le CLI shadcn. Les autres imports (tw-animate-css, polices) restent des
// dépendances du paquet, résolues par le Tailwind de l'application.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(resolve(racine, "package.json"))

const IMPORT_SHADCN = '@import "shadcn/tailwind.css";'
const source = readFileSync(resolve(racine, "src/styles.css"), "utf8")
if (!source.includes(IMPORT_SHADCN)) {
  throw new Error(`src/styles.css ne contient plus ${IMPORT_SHADCN}`)
}
const shadcn = readFileSync(require.resolve("shadcn/tailwind.css"), "utf8")

mkdirSync(resolve(racine, "dist"), { recursive: true })
writeFileSync(
  resolve(racine, "dist/styles.css"),
  // Remplacement par fonction : un « $ » dans le CSS de shadcn reste littéral.
  source.replace(
    IMPORT_SHADCN,
    () =>
      `/* --- shadcn/tailwind.css --- */\n${shadcn}\n/* --- fin de shadcn/tailwind.css --- */`
  )
)
