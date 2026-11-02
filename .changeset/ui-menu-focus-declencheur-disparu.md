---
"@etic-insa/ui": patch
---

`DropdownMenu` : quand l'entrée choisie retire le déclencheur du menu (ligne supprimée par son menu
« … », barre retirée), la fermeture ne renvoie plus le focus au dernier menu ou sélecteur ouvert
ailleurs dans la page (repli de Base UI sur son historique de focus). Il tombe sur `<body>`, où
les rattrapages existants (ligne supprimée d'un `DataTable`, barre d'actions groupées) le
reprennent. Un focus parti ailleurs (dialogue de confirmation ouvert par une entrée) y reste. Un
`finalFocus` passé à `DropdownMenuContent` passe d'abord ; s'il vaut `true`, la garde
s'applique. Rien à faire côté application. Les dialogues, sélecteurs, popovers et combobox ont le
même repli et ne sont pas encore corrigés.
