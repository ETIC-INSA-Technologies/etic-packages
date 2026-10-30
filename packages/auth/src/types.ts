/** Thème d'interface, partagé par toute la suite ETIC (enregistré dans ETIC Members). */
export type Theme = "system" | "light" | "dark"

export interface Preferences {
  theme: Theme
}

/** Réponse de `GET {prefixe}/me` : identité et droits de la session courante. */
export interface Me {
  membre_id: string
  email: string | null
  /** Libellé prêt à afficher, calculé par ETIC Members (« Prénom Nom », rôle d'un
   *  compte fonctionnel, e-mail à défaut). */
  nom_affichage: string | null
  /** Codes déjà développés par le serveur : rien à déduire côté navigateur. */
  permissions: string[]
  is_superadmin: boolean
  /** `null` si ETIC Members n'a pas pu les rendre : garder le réglage local. */
  preferences: Preferences | null
}

/** Enveloppe d'erreur commune des API ETIC. */
export interface EnveloppeErreur {
  error: {
    code: string
    message: string
    details?: Record<string, unknown> | null
  }
}
