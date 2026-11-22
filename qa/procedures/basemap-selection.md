# QA procedure: basemap selection

Feature: one basemap is selected at a time; the application opens on
Positron, and choosing another basemap replaces it without moving the map.

Every step is done in the browser, on the built application. Requests to tile
servers are answered locally by the test harness, which records their URLs, so
the procedure does not depend on the network.

The basemaps are the radio buttons of the "Fonds de plan" panel (see
`basemap-panel.md`). The checked one is the selected basemap. The map credits
are the attribution text at the bottom right of the map.

At the initial view (map zoom 5), the map asks for its 256-pixel tiles at
zoom 6. The tile that holds the initial centre is column 33, row 22.

## basemap-selection 1: Positron is selected when the application starts

1. Open the application.
2. Expect "Positron" to be checked, and "Dark Matter", "World Imagery" and
   "World Topographic Map" not to be checked.
3. Expect the map to request Positron tiles,
   `https://{a,b,c,d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`, from
   each of the four servers `a`, `b`, `c` and `d`, including the tile that
   holds the initial centre, whose URL ends with `/light_all/6/33/22.png`.
4. Expect no tile request to the OpenStreetMap server `tile.openstreetmap.org`,
   to `dark_all`, or to `server.arcgisonline.com`.
5. Expect the map credits to contain "© OpenStreetMap contributors © CARTO"
   and not to contain "Powered by Esri".

## basemap-selection 2: choosing a basemap selects it alone

1. Open the application.
2. Take a picture of the "Fonds de plan" panel.
3. Click "Dark Matter". Expect "Dark Matter" to be checked, and the three
   other basemaps not to be checked.
4. Click the "Carto App" header, so that no basemap keeps the focus or the
   mouse. Expect the panel to look different from the picture of step 2: the
   selected basemap is marked on screen, not only for screen readers.
5. Click "World Imagery". Expect "World Imagery" to be checked, and the three
   other basemaps not to be checked.
6. Click "World Topographic Map". Expect "World Topographic Map" to be
   checked, and the three other basemaps not to be checked.
7. Click "Positron". Expect "Positron" to be checked, and the three other
   basemaps not to be checked.

## basemap-selection 3: changing the basemap keeps the view

1. Open the application.
2. Press the "Zoom in" button of the map twice, then drag the map about 200
   pixels to the left. Wait until the view indicator stops changing. Expect
   it to end with `zoom 7.0`, and note its text.
3. Click "World Imagery".
4. Expect "World Imagery" to be checked. The page was not reloaded: a reload
   would bring back Positron and the initial view.
5. Expect the view indicator to read exactly the text noted at step 2.
6. Expect the map to request World Imagery tiles at zoom 8, the tile zoom of
   map zoom 7.

## basemap-selection 4: the basemap is chosen from the keyboard

This procedure has no Gherkin scenario: only the browser can show it.

1. Open the application.
2. Using only the keyboard, press Tab until "Positron" has the focus. Expect
   the panel to look different than before the focus reached it: the focus is
   visible.
3. Press the Down arrow key. Expect "Dark Matter" to have the focus and to be
   checked, the three other basemaps not to be checked, and the map to request
   Dark Matter tiles,
   `https://{a,b,c,d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`.
4. Press the Down arrow key. Expect "World Imagery" to have the focus and to
   be checked: the arrow keys go on from the "CARTO" group into the "Esri"
   group. Expect the map to request World Imagery tiles and its credits to
   contain "Powered by Esri" and not "CARTO".
5. Press the Down arrow key. Expect "World Topographic Map" to be checked.
6. Press the Up arrow key three times. Expect "Positron" to be checked and the
   map credits to contain "© OpenStreetMap contributors © CARTO" and not
   "Powered by Esri".
