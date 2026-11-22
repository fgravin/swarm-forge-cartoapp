# QA procedure: basemap panel

Feature: the "Fonds de plan" panel offers four basemaps, grouped by provider.

Every step is done in the browser, on the built application. Requests to tile
servers are answered locally by the test harness, so the procedure does not
depend on the network.

The panel is a group named "Fonds de plan". Inside it, each provider has its
own group, named after the provider, and each basemap is a radio button named
after the basemap. The panel's labels are French; provider and basemap names
are the providers' own. The map's own controls keep their current names, such
as "Zoom in".

## basemap-panel 1: the panel offers each basemap under its provider

1. Open the application.
2. Expect a panel titled "Fonds de plan" over the map. It lies entirely inside
   the map, in its top left corner: its left edge is nearer the map's left
   edge than the map's right edge, and its top edge is nearer the map's top
   edge than the map's bottom edge.
3. Expect the panel not to cover the "Zoom in" button, the map credits, or the
   view indicator.
4. Expect the panel to hold two groups, in this order: "CARTO", then "Esri".
5. Expect the "CARTO" group to offer, in this order, "Positron" then
   "Dark Matter".
6. Expect the "Esri" group to offer, in this order, "World Imagery" then
   "World Topographic Map".

## basemap-panel 2: the panel offers no other basemap

1. Open the application.
2. Expect the "Fonds de plan" panel to hold exactly four radio buttons, in
   exactly two provider groups.
