# us2-saisie-bbox

**En tant qu'** utilisateur de la carte,
**je veux** dessiner un rectangle sur la carte pour saisir une emprise (BBOX),
**afin de** récupérer ses coordonnées et de les réutiliser ailleurs : filtre spatial, requête sur un service.

## Critères d'acceptation

1. Un bouton « Dessiner une emprise » est affiché sur la carte. Il indique s'il est enfoncé (mode dessin actif) ou non.
2. Quand le mode dessin est actif, le curseur sur la carte est une croix, et un cliquer-glisser trace un rectangle au lieu de déplacer la carte. Le rectangle suit le pointeur pendant le tracé.
3. Au relâchement, l'emprise est saisie : le rectangle reste affiché sur la carte, le mode dessin se désactive et la carte se déplace de nouveau normalement.
4. L'emprise saisie est affichée dans un panneau « Emprise », en degrés décimaux WGS84 (EPSG:4326), dans l'ordre ouest, sud, est, nord, avec 5 décimales. Exemple : `5.71234, 45.12345, 6.01234, 45.56789`.
5. Quel que soit le sens du tracé, l'emprise vérifie ouest ≤ est et sud ≤ nord.
6. Un tracé de moins de 3 pixels de large ou de haut, un simple clic par exemple, ne saisit rien et laisse l'emprise précédente intacte.
7. La touche Échap, pendant le mode dessin, annule le tracé en cours et quitte le mode dessin sans toucher à l'emprise précédente.
8. Saisir une nouvelle emprise remplace la précédente : il n'y en a jamais plus d'une.
9. Un bouton « Effacer l'emprise » supprime le rectangle et vide le panneau. Il n'est proposé que lorsqu'une emprise existe. Sans emprise, le panneau indique « Aucune emprise ».
10. Le rectangle est géoréférencé : il reste à sa place quand on déplace ou zoome la carte, et il reste affiché quand le fond de carte change.
11. Les libellés de l'interface sont en français.

## Hors périmètre

- Modifier, déplacer ou redimensionner une emprise existante ; saisir plusieurs emprises.
- Saisie des coordonnées au clavier, copie dans le presse-papiers, export.
- Emprise à cheval sur l'antiméridien ; carte pivotée ou inclinée.
