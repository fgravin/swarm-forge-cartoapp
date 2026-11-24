# us4-arbre-des-couches

**En tant qu'** utilisateur de la carte,
**je veux** une liste de couches WMS que je peux afficher, cadrer, rendre transparentes et dont je peux lire la légende,
**afin de** superposer des données thématiques au fond de plan et de les comprendre.

## Contexte

La carte n'affiche aujourd'hui qu'un fond de plan et l'emprise saisie. On ajoute trois couches WMS publiques, venant de trois serveurs différents. Toutes les informations des couches (titre, emprise, légende, attribution) sont lues dans le GetCapabilities de chaque serveur, avec la bibliothèque [`@camptocamp/ogc-client`](https://github.com/camptocamp/ogc-client).

## Critères d'acceptation

1. Un panneau « Couches » est affiché sur la carte, à droite, sans masquer les boutons de zoom. Il liste les trois couches ci-dessous, dans cet ordre, sous le titre annoncé par leur serveur.
2. L'ordre de la liste est l'ordre de superposition : la première couche est dessinée au-dessus des autres.
3. Pendant le chargement des capacités d'un serveur, la couche indique « Chargement… ». Si son serveur ne répond pas, renvoie une erreur ou ne déclare pas la couche, la couche indique « Couche indisponible » et ses commandes sont désactivées. Les autres couches restent utilisables.
4. **Afficher / masquer** : un bouton en forme d'œil affiche ou masque la couche. Il est annoncé aux lecteurs d'écran comme « Afficher <titre> » ou « Masquer <titre> » et indique son état (`aria-pressed`). À l'ouverture, les trois couches sont masquées.
5. **Zoomer sur la couche** : un bouton ajuste la carte à l'emprise géographique de la couche déclarée dans le GetCapabilities. Il ne change pas la visibilité de la couche. Il est désactivé si le serveur ne déclare pas d'emprise.
6. **Transparence** : un curseur règle l'opacité de la couche de 0 à 100 %, par pas de 5 %, et affiche la valeur. L'effet est immédiat. L'opacité est conservée quand on masque puis réaffiche la couche. Elle vaut 100 % à l'ouverture.
7. **Légende** : un bouton « Légende » déplie ou replie, sous la couche, l'image de légende du style WMS (`LegendURL` du GetCapabilities), avec un texte alternatif « Légende de <titre> ». Si l'image ne se charge pas, le panneau indique « Légende indisponible ».
8. Les couches WMS sont dessinées au-dessus du fond de plan et sous le rectangle de l'emprise. Changer de fond de plan ne change ni la liste, ni la visibilité, ni l'opacité, ni l'ordre des couches.
9. Quand une couche est affichée, l'attribution de la carte ajoute le crédit que son serveur déclare (`Attribution` du GetCapabilities). Ce crédit disparaît quand la couche est masquée. Cela précise le critère 5 de `us1-fonds-de-plan` : le fond actif reste crédité seul tant qu'aucune couche n'est affichée.
10. Le panneau s'utilise entièrement au clavier. Les libellés de l'interface sont en français.

## Couches

| Serveur (URL passée à `WmsEndpoint`) | Couche (`Name`) | Titre déclaré | Emprise déclarée (O, S, E, N) |
|---|---|---|---|
| IGN Géoplateforme : `https://data.geopf.fr/wms-r/wms` | `LANDCOVER.CLC18_FR` | CORINE Land Cover - France métropolitaine - 2018 | -9.88, 40.58, 11.68, 51.44 |
| BRGM : `https://geoservices.brgm.fr/geologie` | `LITHO_1M_SIMPLIFIEE` | Carte lithologique simplifiée au 1/1 000 000 | -5.50, 41.33, 10.81, 51.09 |
| geo.admin.ch : `https://wms.geo.admin.ch/?lang=fr` | `ch.bafu.schutzgebiete-paerke_nationaler_bedeutung` | Parcs suisses (Zones) | 3.33, 44.07, 14.28, 49.20 |

## Notes techniques

Vérifié le 2026-11-24, avec `@camptocamp/ogc-client` 2.0.2 lancé contre les trois serveurs :

- Les trois serveurs renvoient `Access-Control-Allow-Origin: *` sur GetCapabilities, GetMap et les légendes. Ils acceptent `CRS=EPSG:3857` et rendent des PNG transparents.
- API : `await new WmsEndpoint(url).isReady()`, puis `getLayerByName(name)`, qui donne :
  - `title` ;
  - `boundingBoxes['EPSG:4326']`, déjà dans l'ordre `[ouest, sud, est, nord]` : ogc-client remet les axes de WMS 1.3.0 dans l'ordre lon/lat ;
  - `styles[0].legendUrl` ;
  - `attribution.title` : « Ministère de la Transition écologique et de la Cohésion des territoires », « BRGM », « Das Geoportal des Bundes ».
- **Piège 1** : `getMapUrl()` encode les valeurs des paramètres. Lui passer `{bbox-epsg-3857}` produit `%7Bbbox-epsg-3857%7D`, que MapLibre ne remplace pas. Le gabarit d'URL des tuiles doit contenir `{bbox-epsg-3857}` en clair.
- **Piège 2** : `getMapUrl()` n'ajoute pas `TRANSPARENT=TRUE`.
- **Piège 3** : ogc-client analyse les capacités dans un Web Worker. Sous Node (Vitest), il n'y a pas de Worker. ogc-client vit donc dans un adaptateur (`src/adapters/`) derrière un port, comme `maplibre-gl`, et la logique (ordre, visibilité, opacité, état de chargement, choix de la légende et du crédit) se teste dans `src/domain` et `src/application`.
- Le BRGM annonce ses URL GetMap et de légende en `http://`. Cela fonctionne en local, mais serait bloqué si l'application était servie en HTTPS. Les mêmes URL répondent en `https://`.
- Le BRGM ne rend la carte lithologique qu'aux échelles plus grandes que le 1/10 000 000 (`MaxScaleDenominator`). Avec des tuiles de 256 px, elle apparaît dès le zoom carte 5 et disparaît en dessous d'environ 4,5. C'est le serveur, pas un défaut.
- Le GetCapabilities de geo.admin.ch pèse 2,7 Mo et celui de l'IGN 1 Mo. Charger les trois serveurs en parallèle.
- **Tests de bout en bout** : GetCapabilities, GetMap et légendes interceptés (`page.route`) avec des documents enregistrés et réduits aux couches utiles. Aucun appel réel aux serveurs dans les tests.

## Hors périmètre

- Réordonner les couches (glisser-déposer), groupes et sous-arbres.
- Ajout de couches ou de serveurs par l'utilisateur.
- Interrogation des couches (GetFeatureInfo), dimensions temporelles, choix d'un autre style.
- Signalement des couches hors de leur plage d'échelle.
- Mémorisation de l'état des couches d'une visite à l'autre.
