---
"@etic-insa/auth": minor
---

`creerQueryClient` : le `QueryClient` commun des applications. Une lecture en échec est
retentée une fois, jamais sur un refus 4xx (`lectureARetenter`) ; pas de relecture au retour sur
l'onglet ; données fraîches 30 s (`staleTime` en option) ; mutations jamais rejouées.
