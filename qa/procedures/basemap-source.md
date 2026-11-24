# QA procedure: basemap source

Feature: each basemap is drawn from the raster tiles of its provider. While no
layer of the "Couches" panel is shown, the map credits that provider alone
(see `layer-attribution.md` for the credits of shown layers).

Every step is done in the browser, on the built application. Requests to tile
servers are answered locally by the test harness, which records their URLs, so
the procedure does not depend on the network.

The basemaps are the radio buttons of the "Fonds de plan" panel (see
`basemap-panel.md`). The map credits are the attribution text at the bottom
right of the map. In a tile URL, `{a,b,c,d}` stands for four servers, one per
letter. Esri URLs put the row `{y}` before the column `{x}`.

At the initial view (map zoom 5), the map asks for its 256-pixel tiles at
zoom 6. The tile that holds the initial centre is column 33, row 22.

## basemap-source 1: the map draws the chosen basemap and credits only its provider

Run the steps once for each row of the table.

1. Open the application.
2. Click the "First choice" basemap.
3. Click the "Then choose" basemap.
4. Expect the map, after step 3, to request tiles from the "Tile URL", for
   CARTO from each of the four servers `a`, `b`, `c` and `d`, including the
   tile that holds the initial centre, whose URL ends with "Centre tile".
5. Expect the map credits to contain "Credits" and none of "Not credited".
6. Press the "Zoom in" button of the map once, and wait until the view
   indicator ends with `zoom 6.0`. Expect the map to request tiles at zoom 7
   from the "Then choose" basemap, and no tile at all from the "First choice"
   basemap during this step: the first choice was replaced, not covered.

| First choice          | Then choose           | Tile URL                                                                                        | Centre tile                              | Credits                              | Not credited              |
|-----------------------|-----------------------|-------------------------------------------------------------------------------------------------|------------------------------------------|--------------------------------------|---------------------------|
| World Imagery         | Positron              | `https://{a,b,c,d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`                             | `/light_all/6/33/22.png`                 | © OpenStreetMap contributors © CARTO | Powered by Esri           |
| World Topographic Map | Dark Matter           | `https://{a,b,c,d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`                              | `/dark_all/6/33/22.png`                  | © OpenStreetMap contributors © CARTO | Powered by Esri           |
| Dark Matter           | World Imagery         | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | `/World_Imagery/MapServer/tile/6/22/33`  | Powered by Esri                      | CARTO, OpenStreetMap      |
| Positron              | World Topographic Map | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}` | `/World_Topo_Map/MapServer/tile/6/22/33` | Powered by Esri                      | CARTO, OpenStreetMap      |

## basemap-source 2: every basemap is drawn from tiles of one size up to one zoom level

Run the steps once for each basemap: "Positron", "Dark Matter",
"World Imagery" and "World Topographic Map".

1. Open the application.
2. Click the basemap.
3. Expect the map to request this basemap's centre tile at zoom 6 (see
   basemap-source 1) and none of its tiles at zoom 5: the tiles are 256
   pixels wide.
4. Press the "Zoom in" button of the map until the zoom shown by the view
   indicator stops growing.
5. Expect the map to have requested tiles of this basemap at zoom 19, and none
   at a zoom above 19.
