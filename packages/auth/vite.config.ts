import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { defineConfig } from "vitest/config"

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "package.json"), "utf8")
)
// React et react-query restent des imports : l'application les fournit, et un
// second exemplaire de react-query ne verrait pas son QueryClient.
const externes = [...Object.keys(pkg.peerDependencies), "react/jsx-runtime"]
const estExterne = (id: string) =>
  externes.some((nom) => id === nom || id.startsWith(`${nom}/`))

export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: "./tsconfig.lib.json",
      entryRoot: "src",
    }),
  ],
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
})
