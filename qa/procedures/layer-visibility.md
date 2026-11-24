# QA procedure: layer visibility

Feature: the eye button of a layer shows or hides it. The layers are hidden
when the application starts. The map draws the shown layers over the
basemap and under the bbox rectangle, with layer 1 on top. Changing the
basemap keeps them. A shown layer is drawn from transparent GetMap tiles,
asked over HTTPS.

Settings, controls and recorded documents: see `layer-panel.md`. C and how
to drag are defined in `bbox-drawing-mode.md`. Compare pictures of the map to
see the layers: the basemap tiles are blank, and each layer's GetMap tiles
are of one colour, so the colour at C tells which layer is on top.

## layer-visibility 1: every layer is hidden when the application starts

1. Open the application. Take a picture of the map.
2. Expect the eye buttons "Afficher CORINE Land Cover - France métropolitaine
   - 2018", "Afficher Carte lithologique simplifiée au 1/1 000 000" and
   "Afficher Parcs suisses (Zones)", none of them pressed.
3. Wait two seconds. Expect no GetMap request.

## layer-visibility 2: the eye button shows the layer

Run the steps once for each layer.

1. Open the application. Take a picture of the map.
2. Press the layer's eye button, "Afficher <title>".
3. Expect it to be named "Masquer <title>" and to be pressed.
4. Expect the map to request GetMap tiles from the layer's server, and the
   map at C to take the layer's colour.

## layer-visibility 3: the eye button hides the layer again

1. Open the application. Take a picture of the map.
2. Press "Afficher Carte lithologique simplifiée au 1/1 000 000". Wait until
   the map at C is red.
3. Press "Masquer Carte lithologique simplifiée au 1/1 000 000".
4. Expect it to be named "Afficher Carte lithologique simplifiée au
   1/1 000 000", not pressed, and the map to look like the picture of step 1.
5. Note the number of GetMap requests. Drag on the map from C to C+(200,0).
   Expect no new GetMap request.

## layer-visibility 4: the first layer of the list is drawn on top

Run the steps once for each row of the table.

1. Open the application.
2. Press the eye buttons of the layers of "Shown", in that order.
3. Expect the map at C to be of the colour of the row.
4. Hide the top layer. Expect the map at C to take the colour of the next
   layer of the row.

| Shown   | Colour at C | After hiding the top layer |
|---------|-------------|----------------------------|
| 3, 1    | blue        | green                      |
| 3, 2    | red         | green                      |
| 2, 3, 1 | blue        | red                        |

## layer-visibility 5: changing the basemap keeps the layers as they were

1. Open the application. Show layer 3, then layer 1.
2. Press the left arrow 12 times on the opacity slider of layer 3. Expect it
   to read "40 %".
3. In the "Fonds de plan" panel, choose "Dark Matter". Wait until the map has
   requested Dark Matter tiles.
4. Expect the eye buttons of layers 1 and 3 to still be pressed, the one of
   layer 2 not to be, the slider of layer 3 to read "40 %", and the map at C
   to be blue.
5. Hide layer 1. Expect the map at C to be a mix of green and of the
   basemap's colour, not pure green: layer 3 is still at 40 %.

## layer-visibility 6: a shown layer is drawn from transparent GetMap tiles, over HTTPS

Run the steps once for each layer.

1. Open the application. Show the layer.
2. Expect every GetMap request of the layer to go to its server over
   `https://`, the BRGM included, though its capabilities announce `http://`.
   Expect no request to an `http://` URL.
3. Expect each GetMap request to carry these parameters, in any order and
   letter case of their names: `SERVICE=WMS`, `REQUEST=GetMap`,
   `VERSION=1.3.0`, `LAYERS=` the layer's WMS name, `STYLES=` (empty: the
   default style), `CRS=EPSG:3857`, `WIDTH=256`, `HEIGHT=256`,
   `FORMAT=image/png` and `TRANSPARENT=TRUE`. Expect the geo.admin.ch
   requests to also carry `lang=fr`.
4. Expect each request's `BBOX` to be four numbers separated by commas: the
   bounds of a tile, in metres. Expect none to contain `bbox-epsg-3857`,
   `{` or `%7B`.

## layer-visibility 7: choosing a place found by the search keeps the layers

The search and its recorded GeoNames answers are those of
`place-search-query.md`: the places search for "Gre" finds Grenoble.

1. Open the application. Show layer 3, then layer 1.
2. Click the search field, type "Gre" and pause. Click "Grenoble".
3. Expect the view indicator to read `45.1667° N, 5.7167° E · zoom 12.0`,
   the eye buttons of layers 1 and 3 to still be pressed, the one of layer 2
   not to be, and the map at C to be blue.

## layer-visibility 8: the layers are drawn under the bbox rectangle

This procedure has no Gherkin scenario: only the browser can show it.

1. Open the application. Click "Dessiner une emprise" and drag on the map
   from C-(100,100) to C+(100,100). Take a picture of the map.
2. Show layer 1. Wait until the map at C is blue.
3. Expect the edges of the rectangle to look as in the picture of step 1:
   the rectangle is drawn over the layer.
4. Expect the map, well outside the rectangle, to be blue: the layer is drawn
   over the basemap.
