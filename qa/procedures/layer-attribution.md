# QA procedure: layer attribution

Feature: the map credits the basemap, then the credit the server of each
shown layer declares, in the order of the list. A hidden layer is not
credited.

Settings, controls and recorded documents: see `layer-panel.md`. The map
credits are the attribution text at the bottom right of the map. "The
credits read A, then B" means that they show A, then B, in that order, as
the map separates its credits, and nothing else: no credit for MapLibre, no
credit of a hidden layer. Open the credits first if the map shows them
folded.

## layer-attribution 1: a shown layer adds the credit its server declares

Run the steps once for each layer.

1. Open the application. Expect the credits to read "© OpenStreetMap
   contributors © CARTO" alone.
2. Show the layer.
3. Expect the credits to read "© OpenStreetMap contributors © CARTO", then
   the layer's credit from the table of `layer-panel.md`.

## layer-attribution 2: the credits of the layers follow the order of the list

1. Open the application. Show layer 3, then layer 1.
2. Expect the credits to read "© OpenStreetMap contributors © CARTO", then
   "Ministère de la Transition écologique et de la Cohésion des territoires",
   then "Das Geoportal des Bundes".

## layer-attribution 3: hiding a layer removes its credit

1. Open the application. Show layer 1, then layer 2.
2. Hide layer 1. Expect the credits to read "© OpenStreetMap contributors ©
   CARTO", then "BRGM".
3. Hide layer 2. Expect the credits to read "© OpenStreetMap contributors ©
   CARTO" alone.

## layer-attribution 4: the credits follow the chosen basemap

1. Open the application. Show layer 2.
2. In the "Fonds de plan" panel, choose "World Imagery".
3. Expect the credits to read "Powered by Esri", then "BRGM".
