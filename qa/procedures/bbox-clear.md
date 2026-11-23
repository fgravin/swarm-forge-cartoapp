# QA procedure: bbox clearing

Feature: the "Effacer l'emprise" button removes the bbox; it is offered only
while a bbox exists; without a bbox, the "Emprise" panel reads
"Aucune emprise".

Every step is done in the browser, on the built application. Requests to tile
servers are answered locally with blank tiles, so the only thing drawn on the
map is the bbox rectangle: compare pictures of the map to see it. See
`bbox-drawing-mode.md` for the controls, C, and how to drag.

## bbox-clear 1: without a bbox, the panel says so and clearing is not offered

1. Open the application.
2. Expect the "Emprise" panel to read "Aucune emprise".
3. Expect no "Effacer l'emprise" button on the page.

## bbox-clear 2: clearing is offered once a bbox is captured

1. Open the application.
2. Click "Dessiner une emprise" and drag on the map from C-(100,100) to
   C+(100,100).
3. Expect an "Effacer l'emprise" button to be shown.

## bbox-clear 3: clearing removes the rectangle and empties the panel

1. Open the application. Take a picture of the map.
2. Click "Dessiner une emprise" and drag on the map from C-(100,100) to
   C+(100,100). Expect the map to look different from the picture of step 1.
3. Click "Effacer l'emprise".
4. Expect the "Emprise" panel to read "Aucune emprise", no
   "Effacer l'emprise" button on the page, and the map to look like the
   picture of step 1: the rectangle is gone.
