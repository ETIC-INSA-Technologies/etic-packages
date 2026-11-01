import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": "off",
      // Imports par sous-chemin : la racine de ces paquets fait charger tous
      // leurs modules aux outils sans tree-shaking (vitest des applications,
      // qui pré-bundlait la bibliothèque pour cette raison). Couvre aussi
      // `export … from`.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@base-ui/react",
              message: "Importer par sous-chemin : @base-ui/react/<composant>.",
            },
            {
              name: "date-fns",
              message: "Importer par sous-chemin : date-fns/<fonction>.",
            },
            {
              name: "react-day-picker/locale",
              message:
                "Importer la seule locale voulue : react-day-picker/locale/fr.",
            },
          ],
        },
      ],
    },
  },
])
