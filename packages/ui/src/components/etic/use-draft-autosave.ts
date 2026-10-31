import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

/**
 * Sauvegarde automatique d'un brouillon de formulaire long (import, saisie en
 * masse…), là où l'application le range : son API, ou le stockage du
 * navigateur. Règles :
 *
 * - **En arrière-plan, sans indicateur.** Les actions qui terminent la saisie
 *   (« Quitter », « Enregistrer ») attendent `enregistrerMaintenant()` : les
 *   dernières frappes sont rangées avant de quitter la page.
 * - **Anti-rebond et sans doublon.** Le contenu est sérialisé en JSON et
 *   comparé au dernier rangé : une modification qui ne change rien n'écrit rien.
 * - **Une écriture à la fois.** Deux écritures simultanées arriveraient dans
 *   l'ordre du réseau, pas dans celui des frappes : un gros brouillon parti
 *   avant une correction pourrait l'écraser. Les écritures passent donc par une
 *   file, et celle qu'une plus récente rend caduque est sautée (le brouillon
 *   est un instantané complet : seul le dernier compte).
 * - **Verrou optimiste.** Chaque écriture reçoit la version connue du
 *   brouillon et renvoie la nouvelle ; l'application refuse une version
 *   périmée (un autre onglet, une autre personne a écrit entre-temps).
 * - **Un échec se voit.** `erreur` porte le dernier échec, `reessayer()` le
 *   rejoue : une session expirée fait justement échouer l'écriture qui aurait
 *   sauvé le travail.
 * - **Quitter l'onglet avec des modifications non rangées est signalé** par
 *   le navigateur (`beforeunload`).
 *
 * L'objet renvoyé et ses fonctions sont stables (seul `erreur` les change) :
 * ils peuvent figurer dans les dépendances d'un effet.
 */
export interface DraftAutosave<T = unknown> {
  /** Range tout de suite les dernières modifications, et attend aussi
   *  l'écriture déjà en cours. */
  enregistrerMaintenant: () => Promise<void>
  /** Des modifications ne sont pas encore rangées (anti-rebond en attente, ou
   *  écriture échouée). */
  nonEnregistre: () => boolean
  /** Abandonne l'écriture en attente et celles en file (avant de supprimer
   *  le brouillon, qu'elles recréeraient). Une écriture déjà partie ne
   *  s'interrompt pas. Sans `annuler()`, l'écriture en attente part quand le
   *  composant est démonté (navigation interne). */
  annuler: () => void
  /** Déclare un contenu comme rangé (après l'enregistrement final, ou un
   *  brouillon chargé) : par défaut celui du dernier rendu. Appelé dans le
   *  même gestionnaire que la mise à jour du contenu, passer le nouveau. */
  marquerEnregistre: (contenu?: T | null) => void
  /** Déclare l'état rangé inconnu (après « repartir de zéro »). */
  marquerNonEnregistre: () => void
  /** Aligne la version connue (brouillon chargé, supprimé, conflit résolu). */
  definirVersion: (version: number) => void
  /** Dernier échec d'écriture, ou `null`. */
  erreur: unknown
  /** Rejoue l'écriture échouée (bouton « Réessayer »). */
  reessayer: () => Promise<void>
}

export interface DraftAutosaveOptions<T> {
  /** Ce qu'il faut ranger, sérialisable en JSON ; `null` tant que rien ne
   *  vaut la peine d'être rangé (rien n'est alors écrit). */
  contenu: T | null
  /** Range le brouillon et renvoie sa nouvelle version. `version` est celle
   *  que le client croit à jour ; rejeter si elle a changé. Reçoit le
   *  contenu tel que l'application l'a donné. */
  enregistrer: (contenu: T, version: number) => Promise<number>
  /** Attente après la dernière modification, en millisecondes. */
  delai?: number
  /** Version de départ : celle du brouillon chargé, 0 s'il n'y en a pas.
   *  Au-dessus de 0, le contenu du premier rendu est ce brouillon : il
   *  compte pour rangé et n'est pas réécrit. */
  versionInitiale?: number
}

/** Une écriture : le contenu, et son JSON pour la comparaison. */
interface Ecriture<T> {
  texte: string
  contenu: T
}

export function useDraftAutosave<T>({
  contenu,
  enregistrer,
  delai = 1200,
  versionInitiale = 0,
}: DraftAutosaveOptions<T>): DraftAutosave<T> {
  const json = JSON.stringify(contenu ?? null)
  const aContenu = contenu !== null

  // Dernier contenu rendu, lu par les fonctions stables. Mis à jour dans un
  // effet de mise en page, avant ceux de l'application (déclarés après
  // l'appel du hook) et avant la fin d'un `flushSync` : une fonction appelée
  // de là lit déjà le nouveau contenu.
  const actuelRef = useRef({ json, contenu })
  useLayoutEffect(() => {
    actuelRef.current = { json, contenu }
  })

  // JSON du dernier contenu rangé. Un brouillon chargé (version > 0) est
  // déjà rangé : il n'est pas réécrit au montage.
  const rangeRef = useRef<string | null>(
    versionInitiale > 0 && aContenu ? json : null
  )
  const versionRef = useRef(versionInitiale)
  const minuterieRef = useRef<number | null>(null)
  // La dernière fonction d'écriture : l'écriture différée n'appelle jamais
  // une version périmée.
  const enregistrerRef = useRef(enregistrer)
  useLayoutEffect(() => {
    enregistrerRef.current = enregistrer
  })

  // La file : `fileRef` est la promesse de la dernière écriture émise,
  // `numeroRef` son numéro. Une écriture qui n'est plus la dernière à son tour
  // est sautée.
  const fileRef = useRef<Promise<void>>(Promise.resolve())
  const numeroRef = useRef(0)
  // Émis mais pas encore confirmé : ce que « Réessayer » rejoue.
  const enAttenteRef = useRef<Ecriture<T> | null>(null)
  const [erreur, setErreur] = useState<unknown>(null)

  // L'écriture différée par l'anti-rebond, `null` s'il n'y en a pas.
  const differeRef = useRef<Ecriture<T> | null>(null)

  const arreterMinuterie = useCallback(() => {
    if (minuterieRef.current !== null) {
      window.clearTimeout(minuterieRef.current)
      minuterieRef.current = null
    }
    differeRef.current = null
  }, [])

  const annuler = useCallback(() => {
    arreterMinuterie()
    // Les écritures en file deviennent caduques : seule une écriture plus
    // récente que ce numéro partira.
    numeroRef.current += 1
    enAttenteRef.current = null
  }, [arreterMinuterie])

  const ajouter = useCallback((envoi: Ecriture<T>): Promise<void> => {
    const numero = (numeroRef.current += 1)
    enAttenteRef.current = envoi
    const ecriture = fileRef.current.then(async () => {
      if (numero !== numeroRef.current) return // caduque
      if (envoi.texte === rangeRef.current) return // déjà rangé
      try {
        versionRef.current = await enregistrerRef.current(
          envoi.contenu,
          versionRef.current
        )
        rangeRef.current = envoi.texte
        enAttenteRef.current = null
        setErreur(null)
      } catch (raison) {
        setErreur(raison)
        throw raison
      }
    })
    // La file ne reste jamais rejetée : un échec bloquerait les écritures
    // suivantes, dont celle du « Quitter ».
    fileRef.current = ecriture.catch(() => undefined)
    return ecriture
  }, [])

  const nonEnregistre = useCallback(() => {
    const actuel = actuelRef.current
    return actuel.contenu !== null && actuel.json !== rangeRef.current
  }, [])

  const enregistrerMaintenant = useCallback(async () => {
    arreterMinuterie()
    const { json, contenu } = actuelRef.current
    if (contenu === null) {
      await fileRef.current // rien à écrire, mais on attend ce qui est parti
      return
    }
    await ajouter({ texte: json, contenu })
  }, [arreterMinuterie, ajouter])

  const reessayer = useCallback(async () => {
    const envoi = enAttenteRef.current
    if (envoi !== null) await ajouter(envoi)
  }, [ajouter])

  const marquerEnregistre = useCallback((marque?: T | null) => {
    rangeRef.current =
      marque === undefined
        ? actuelRef.current.json
        : JSON.stringify(marque ?? null)
    enAttenteRef.current = null
  }, [])

  const marquerNonEnregistre = useCallback(() => {
    rangeRef.current = null
  }, [])

  const definirVersion = useCallback((version: number) => {
    versionRef.current = version
  }, [])

  // Démontage (navigation interne) : l'écriture différée part tout de suite
  // au lieu d'être perdue, sauf après `annuler()`. Déclaré avant l'effet de
  // l'anti-rebond, dont le nettoyage passe après celui-ci. Le départ attend
  // une microtâche : le démontage simulé de StrictMode, aussitôt suivi d'un
  // remontage, n'écrit rien.
  const monteRef = useRef(false)
  useEffect(() => {
    monteRef.current = true
    return () => {
      monteRef.current = false
      const envoi = differeRef.current
      if (envoi === null) return
      void Promise.resolve().then(() => {
        if (monteRef.current) return
        arreterMinuterie()
        ajouter(envoi).catch(() => undefined)
      })
    }
  }, [arreterMinuterie, ajouter])

  useEffect(() => {
    const actuel = actuelRef.current.contenu
    if (actuel === null || json === rangeRef.current) return
    differeRef.current = { texte: json, contenu: actuel }
    minuterieRef.current = window.setTimeout(() => {
      minuterieRef.current = null
      const envoi = differeRef.current
      differeRef.current = null
      // L'échec est déjà dans `erreur`.
      if (envoi) ajouter(envoi).catch(() => undefined)
    }, delai)
    return arreterMinuterie
    // `aContenu` et `json` suivent `contenu` (lu par `actuelRef`, mis à jour
    // par l'effet déclaré plus haut) : seul un changement de JSON relance
    // l'attente.
  }, [json, aContenu, delai, arreterMinuterie, ajouter])

  useEffect(() => {
    function avantDeQuitter(event: BeforeUnloadEvent) {
      if (nonEnregistre()) event.preventDefault()
    }
    window.addEventListener("beforeunload", avantDeQuitter)
    return () => window.removeEventListener("beforeunload", avantDeQuitter)
  }, [nonEnregistre])

  return useMemo(
    () => ({
      enregistrerMaintenant,
      nonEnregistre,
      annuler,
      erreur,
      reessayer,
      marquerEnregistre,
      marquerNonEnregistre,
      definirVersion,
    }),
    [
      enregistrerMaintenant,
      nonEnregistre,
      annuler,
      erreur,
      reessayer,
      marquerEnregistre,
      marquerNonEnregistre,
      definirVersion,
    ]
  )
}
