import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { defineConfig } from "vitest/config"

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "package.json"), "utf8")
)
// Tout ce que le paquet déclare (dépendances et react) reste un import : les
// applications l'installent, la bibliothèque ne l'embarque pas.
const externes = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]
const estExterne = (id: string) =>
  externes.some((nom) => id === nom || id.startsWith(`${nom}/`))

// `npm run dev` sert l'atelier (atelier/) ; `npm run build` construit la
// bibliothèque (src/index.ts → dist/), un fichier par module pour que les
// applications n'embarquent que les composants qu'elles importent.
export default defineConfig(({ command }) => ({
  root: command === "serve" ? "atelier" : undefined,
  plugins: [
    react(),
    command === "serve" && tailwindcss(),
    command === "build" &&
      dts({
        tsconfigPath: "./tsconfig.lib.json",
        entryRoot: "src",
      }),
  ],
  resolve: {
    // Alias propre à la bibliothèque (et non « @/ ») : une application qui lit
    // ces sources en développement le déclare sans perdre son propre « @/ ».
    alias: {
      "@etic-ui": resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      formats: ["es"],
    },
    rolldownOptions: {
      external: estExterne,
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
  },
  test: {
    root: import.meta.dirname,
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
}))
