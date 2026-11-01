export { AuthProvider, type AuthProviderProps } from "./AuthProvider"
export {
  ACTION_RECONNEXION,
  analyserErreur,
  chaineRequete,
  CODE_DELAI_DEPASSE,
  CODE_REDIRECTION_REFUSEE,
  CODE_RESEAU,
  CODE_REPONSE_NON_JSON,
  creerClientAuth,
  creerClientHttp,
  ErreurApi,
  PREFIXE_PAR_DEFAUT,
  type ClientAuth,
  type ClientHttp,
  type OptionsClientHttp,
  type OptionsRequete,
  type ParametresRequete,
} from "./client"
export {
  SessionRequise,
  SiPermission,
  type SessionRequiseProps,
  type SiPermissionProps,
} from "./composants"
export { CLE_ME, useAuth, type AuthValeur } from "./context"
export { lireErreurConnexion, type ErreurConnexion } from "./erreurConnexion"
export { EVENEMENT_NON_AUTHENTIFIE, signalerNonAuthentifie } from "./evenements"
export {
  emailDistinct,
  LIBELLE_SESSION_INCONNUE,
  nomAffichage,
} from "./nomAffichage"
export { aPermission, type PorteurDePermissions } from "./permissions"
export type { EnveloppeErreur, Me, Preferences, Theme } from "./types"
