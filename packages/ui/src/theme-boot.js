// Script de démarrage du thème de @etic-insa/ui (@etic-insa/ui/theme-boot.js).
// Chargé par l'index.html de l'application AVANT le bundle, comme script
// classique (sans type="module", qui le différerait) : il peint le thème
// mémorisé avant la première image, pour qu'un compte en thème sombre ne voie
// pas la page flasher en clair le temps que le compte se charge. Fichier
// externe plutôt que script en ligne : une CSP en `script-src 'self'` l'admet.
// Même clé et mêmes valeurs que src/theme.ts (CLE_THEME), qui prend le relais :
// classe `dark` sur <html>. Sans thème mémorisé, celui du système.
;(function () {
  var theme = null
  try {
    theme = localStorage.getItem("etic-theme")
  } catch (e) {
    // Stockage inaccessible (navigation privée stricte) : thème du système.
  }
  var sombre =
    theme === "dark" ||
    (theme !== "light" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  if (sombre) document.documentElement.classList.add("dark")
})()
