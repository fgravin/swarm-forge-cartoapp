# us1-fonds-de-plan

**En tant qu'** utilisateur de la carte,
**je veux** choisir le fond de plan affiché parmi des fonds CARTO et Esri,
**afin d'** adapter la carte à ce que je regarde : plan clair, plan sombre, imagerie ou topographie.

## Contexte

Aujourd'hui la carte affiche un unique fond OpenStreetMap, codé en dur dans l'adaptateur MapLibre (`src/adapters/maplibreMap.ts`). Il n'existe aucun moyen d'en changer.

## Critères d'acceptation

1. Un panneau « Fonds de plan » est affiché par-dessus la carte, en haut à gauche. Il propose quatre fonds, regroupés par fournisseur :
   - CARTO : « Positron » et « Dark Matter »
   - Esri : « World Imagery » et « World Topographic Map »
2. Un seul fond est actif à la fois. Le fond actif se distingue visuellement des autres et il est annoncé comme sélectionné aux lecteurs d'écran.
3. À l'ouverture de l'application, le fond actif est « Positron ». Le fond OpenStreetMap actuel n'est plus utilisé.
4. Choisir un autre fond remplace le fond affiché, sans recharger la page et sans modifier le centre ni le zoom de la carte.
5. L'attribution affichée sur la carte est celle du fond actif, et seulement celle-là.
6. Le panneau s'utilise entièrement au clavier.
7. Les libellés de l'interface sont en français. Les noms des fonds restent ceux des fournisseurs.

## Fonds de plan

Ce sont des tuiles raster de 256 px, sans clé d'API, avec un zoom maximal de 19.

| Fond | Modèle d'URL des tuiles | Attribution |
|---|---|---|
| CARTO Positron | `https://{a,b,c,d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png` | © OpenStreetMap contributors © CARTO |
| CARTO Dark Matter | `https://{a,b,c,d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png` | © OpenStreetMap contributors © CARTO |
| Esri World Imagery | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | Powered by Esri |
| Esri World Topographic Map | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}` | Powered by Esri |

`{a,b,c,d}` désigne les quatre sous-domaines CARTO. Les services Esri ordonnent les tuiles en `{z}/{y}/{x}`, pas en `{z}/{x}/{y}`.

## Hors périmètre

- Fonds vectoriels, superposition de plusieurs fonds, réglage d'opacité.
- Ajout de fonds par l'utilisateur.
- Mémorisation du fond choisi d'une visite à l'autre.
