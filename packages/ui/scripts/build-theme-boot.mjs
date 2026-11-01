// Copie src/theme-boot.js dans dist/ : un script classique, que Vite ne
// regroupe pas avec les modules. Les applications le servent depuis leur
// origine (@etic-insa/ui/theme-boot.js, voir le README).
import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..")
mkdirSync(resolve(racine, "dist"), { recursive: true })
copyFileSync(
  resolve(racine, "src/theme-boot.js"),
  resolve(racine, "dist/theme-boot.js")
)
