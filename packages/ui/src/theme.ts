import { useEffect, useRef } from "react"

/**
 * Application du thème clair ou sombre : la classe `dark` sur `<html>`, seule
 * convention du thème (`styles.css`, shadcn), qui ne lit pas la requête média.
 * En « system », la classe suit le réglage du système, y compris quand il
 * change. Rien ici ne dépend du compte : l'application fournit la préférence
 * (celle du compte, `theme` de @etic-insa/auth) et la peinture se fait ici.
 */

/** Préférence de thème d'un compte, commune à toute la suite. */
export type ThemePreference = "light" | "system" | "dark"

/**
 * Clé de la copie locale du dernier thème appliqué (`localStorage`). Elle ne
 * sert qu'à peindre la première image dans le bon thème, avant que le compte
 * ne soit chargé : `theme-boot.js` la relit, avec les mêmes valeurs.
 */
export const CLE_THEME = "etic-theme"

/** Les préférences, dans l'ordre du menu de thème. */
export const THEMES: readonly ThemePreference[] = ["light", "system", "dark"]

export function estThemePreference(valeur: unknown): valeur is ThemePreference {
  return (
    typeof valeur === "string" && (THEMES as readonly string[]).includes(valeur)
  )
}

const SYSTEME_SOMBRE = "(prefers-color-scheme: dark)"

let themeCourant: ThemePreference = "system"
// Requête média écoutée tant que le thème est « system », pour s'en désabonner.
let systemeEcoute: MediaQueryList | null = null

function systemeSombre(): boolean {
  return typeof matchMedia === "function" && matchMedia(SYSTEME_SOMBRE).matches
}

function peindre() {
  const sombre =
    themeCourant === "dark" || (themeCourant === "system" && systemeSombre())
  document.documentElement.classList.toggle("dark", sombre)
}

/**
 * Pose ou retire la classe `dark` sur `<html>`. En « system », suit le
 * réglage du système et ses changements ; un autre choix cesse de l'écouter.
 */
export function appliquerTheme(theme: ThemePreference): void {
  if (typeof document === "undefined") return
  themeCourant = theme
  peindre()
  if (
    theme === "system" &&
    !systemeEcoute &&
    typeof matchMedia === "function"
  ) {
    systemeEcoute = matchMedia(SYSTEME_SOMBRE)
    systemeEcoute.addEventListener("change", peindre)
  } else if (theme !== "system" && systemeEcoute) {
    systemeEcoute.removeEventListener("change", peindre)
    systemeEcoute = null
  }
}

/**
 * Peint le thème du compte : l'applique et le mémorise dès qu'il est connu
 * (`undefined` tant que le compte n'est pas chargé : rien ne change, le thème
 * peint par `theme-boot.js` reste). Un changement fait dans un autre onglet
 * (événement `storage` de la copie locale) est appliqué ici aussi, puis
 * transmis à `onThemeAutreOnglet` pour que l'application aligne son état sans
 * rappeler le serveur.
 */
export function useThemeApplique(
  theme: ThemePreference | undefined,
  onThemeAutreOnglet?: (theme: ThemePreference) => void
): void {
  useEffect(() => {
    if (!theme) return
    appliquerTheme(theme)
    try {
      localStorage.setItem(CLE_THEME, theme)
    } catch {
      // Stockage indisponible (navigation privée stricte) : seul le premier
      // rendu du prochain chargement en pâtit.
    }
  }, [theme])

  // Le dernier rappel, sans réabonner l'écouteur à chaque rendu.
  const rappel = useRef(onThemeAutreOnglet)
  useEffect(() => {
    rappel.current = onThemeAutreOnglet
  })

  useEffect(() => {
    const surStockage = (evenement: StorageEvent) => {
      if (evenement.key !== CLE_THEME) return
      const suivant = evenement.newValue
      if (!estThemePreference(suivant)) return
      appliquerTheme(suivant)
      rappel.current?.(suivant)
    }
    window.addEventListener("storage", surStockage)
    return () => window.removeEventListener("storage", surStockage)
  }, [])
}
