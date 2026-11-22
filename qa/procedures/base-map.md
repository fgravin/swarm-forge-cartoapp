# QA procedure: base map

Feature: the application opens on a map the user can move.

Every step is done in the browser, on the built application. Requests to tile
servers are answered locally by the test harness, so the procedure does not
depend on the network.

## base-map 1: the map is displayed at its initial view

1. Open the application.
2. Expect a map to fill the page under the "Carto App" header.
3. Expect the view indicator, at the bottom left of the map, to read
   `45.5646° N, 5.9178° E · zoom 5.0`.
4. Expect the map to credit OpenStreetMap contributors.

## base-map 2: zooming in updates the view indicator

1. Open the application.
2. Press the "Zoom in" button of the map.
3. Expect the view indicator to end with `zoom 6.0`.
