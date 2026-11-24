# QA procedure: layer panel

Feature: the "Couches" panel lists three WMS layers, in a fixed order, under
the titles their servers declare. A layer reads "Chargement…" until its
server answers, and "Couche indisponible" if its server cannot give it or
has not answered within 30 seconds.
While a layer reads either, its controls are disabled. The other layers
stay usable.

Every step is done in the browser, in a 1280 × 720 window, on the built
application. No request reaches a WMS server or a tile server. Requests to
tile servers are answered locally with blank tiles. Requests to the WMS
servers are answered locally with the recorded documents below, and their
URLs are recorded in order.

## What the user sees

- The "Couches" panel is a region over the map, whose visible title is
  "Couches". It lies on the right of the map, under the map's zoom buttons
  ("Zoom in", "Zoom out", and the compass).
- The panel lists the three layers, one under the other. Each layer is a
  group named by its title, or by its WMS name while it has no title. Its
  title is shown, followed by its controls, in this order:
  - the eye button, a toggle button that shows an eye. It is named
    "Afficher <title>" while the layer is hidden and "Masquer <title>" while
    it is shown, and is pressed (`aria-pressed="true"`) while it is shown;
  - the zoom button, named "Zoomer sur <title>";
  - the opacity slider, named "Opacité de <title>", from 0 to 100 by steps
    of 5, next to its value, shown as in "35 %";
  - the "Légende" button, whose `aria-expanded` says whether the legend is
    unfolded. The unfolded legend lies under the layer's controls: an image
    described as "Légende de <title>", or the text "Légende indisponible".
- A layer that is loading or unavailable shows "Chargement…" (with the one
  character …) or "Couche indisponible" under its name.
- If the panel is taller than the room the map leaves for it, the panel
  scrolls. It never covers the zoom buttons, the map credits or the view
  indicator.
- These labels are French. The map's own controls keep their current names,
  such as "Zoom in".

## The layers and their servers

| Position | Server (as given to the application)  | Layer                                             | Title                                            | Credit                                                                 |
|----------|----------------------------------------|---------------------------------------------------|--------------------------------------------------|------------------------------------------------------------------------|
| 1        | `https://data.geopf.fr/wms-r/wms`      | `LANDCOVER.CLC18_FR`                              | CORINE Land Cover - France métropolitaine - 2018 | Ministère de la Transition écologique et de la Cohésion des territoires |
| 2        | `https://geoservices.brgm.fr/geologie` | `LITHO_1M_SIMPLIFIEE`                             | Carte lithologique simplifiée au 1/1 000 000     | BRGM                                                                   |
| 3        | `https://wms.geo.admin.ch/?lang=fr`    | `ch.bafu.schutzgebiete-paerke_nationaler_bedeutung` | Parcs suisses (Zones)                          | Das Geoportal des Bundes                                               |

## The recorded documents

- A GetCapabilities request to a server is a request whose URL starts with
  the server's URL, as in the table, and carries `REQUEST=GetCapabilities`
  (in any letter case). The geo.admin.ch request keeps `lang=fr`.
- Each server answers with a WMS 1.3.0 capabilities document recorded from
  the real server and reduced to its layer. The document keeps the layer's
  title, its `EX_GeographicBoundingBox` and its `BoundingBox` in EPSG:4326
  (in WMS 1.3.0 axis order: latitude first), its default style with its
  `LegendURL`, its `Attribution` title, and the server's GetMap URL. As the
  real BRGM server does, the BRGM document announces its GetMap and legend
  URLs over `http://`.
- The extents the documents declare are, west, south, east, north:
  layer 1 `-9.88, 40.58, 11.68, 51.44`, layer 2 `-5.50, 41.33, 10.81, 51.09`,
  layer 3 `3.33, 44.07, 14.28, 49.20`.
- A GetMap request is answered with an opaque PNG of 256 × 256 pixels, of one
  colour per server: blue for layer 1, red for layer 2, green for layer 3.
- A legend request is answered with a PNG of 40 × 60 pixels.

## layer-panel 1: the panel lists three layers

1. Open the application.
2. Expect the "Couches" panel to lie on the right of the map, under the zoom
   buttons. Expect it not to cover the zoom buttons, the compass, the map
   credits, the view indicator or the "Fonds de plan" panel.
3. Expect it to list exactly three layers.

## layer-panel 2: each layer is listed under the title its server declares, in a fixed order

1. Open the application.
2. Expect the layers to be listed in the order of the table, each under its
   title.
3. Change the recorded title of layer 2 to "Lithologie (titre enregistré)".
   Open the application again.
4. Expect layer 2 to be listed as "Lithologie (titre enregistré)", and its
   eye button to be named "Afficher Lithologie (titre enregistré)".

## layer-panel 3: the application asks every server for its capabilities at once

Hold every GetCapabilities answer until step 3.

1. Open the application.
2. Expect one GetCapabilities request to each of the three servers.
3. Let the held answers through. Expect the three layers to be listed under
   their titles.

## layer-panel 4: a layer reads "Chargement…" until its server answers

Hold the BRGM's GetCapabilities answer until step 4.

1. Open the application.
2. Expect layer 2 to be listed as `LITHO_1M_SIMPLIFIEE` and to read
   "Chargement…". Expect its eye button, zoom button, opacity slider and
   "Légende" button to be disabled.
3. Expect the controls of layers 1 and 3 to be enabled. Press "Afficher
   CORINE Land Cover - France métropolitaine - 2018". Expect it to be
   pressed, and the map to request GetMap tiles of layer 1.
4. Let the held answer through. Expect layer 2 to be listed as "Carte
   lithologique simplifiée au 1/1 000 000", with no "Chargement…", and its
   controls to be enabled.

## layer-panel 5: a layer its server cannot give is unavailable, and the other layers stay usable

Run the steps once for each row of the table. The server of the row gives
the answer of the row. The other servers give their recorded documents.

1. Open the application.
2. Expect the layer of the row to be listed under its WMS name and to read
   "Couche indisponible", and its four controls to be disabled.
3. Expect the controls of the two other layers to be enabled. Show one of
   them, and expect the map to request its GetMap tiles.

| Layer | Answer of its server                                                                                   |
|-------|--------------------------------------------------------------------------------------------------------|
| 1     | none: the connection is aborted                                                                        |
| 2     | HTTP 500, an empty body                                                                                |
| 2     | HTTP 200, a WMS `ServiceExceptionReport`                                                               |
| 3     | HTTP 200, the recorded capabilities document of geo.admin.ch, without its layer                       |

## layer-panel 6: a layer whose server has not answered within 30 seconds is unavailable

Hold geo.admin.ch's GetCapabilities answer until the end of the procedure.

1. Open the application. Note the time at which the page starts loading.
2. 25 seconds after that time, expect layer 3 to read "Chargement…".
3. 32 seconds after that time, expect layer 3, listed as
   `ch.bafu.schutzgebiete-paerke_nationaler_bedeutung`, to read "Couche
   indisponible", and its four controls to be disabled.
4. Let the held answer through. Wait two seconds. Expect layer 3 to still
   read "Couche indisponible": a layer stays unavailable once it is.
5. Expect the controls of layers 1 and 2 to be enabled.

## layer-panel 7: the panel can be used with the keyboard alone

This procedure has no Gherkin scenario: only the browser can show it.

1. Open the application. Using only the keyboard, press Tab until the eye
   button of layer 1 has the focus.
2. Press Tab repeatedly. Expect the focus to go through the eye button, the
   zoom button, the opacity slider and the "Légende" button of layer 1, then
   of layer 2, then of layer 3, in that order, each control showing a
   visible focus mark.
3. Give the focus to the eye button of layer 1 and press Space. Expect it to
   be pressed. Press Enter. Expect it not to be pressed.
4. Give the focus to the opacity slider of layer 1 and press the left arrow
   twice. Expect it to read "90 %".
5. Give the focus to the "Légende" button of layer 1 and press Enter. Expect
   the legend to unfold. Press Enter again. Expect it to fold.
6. Give the focus to the zoom button of layer 3 and press Enter. Expect the
   view indicator to change.
