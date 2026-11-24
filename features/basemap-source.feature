# mutation-stamp: sha256=bd246fb8c96667c8a3b01e4c75827dc1d122a5cbafe7354d9cee5c2213eeafb4
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:07.028503749Z","feature_name":"Basemap source","feature_path":"features/basemap-source.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:62804ea6e77178824a79fbe51499261723ec881e163035ae354f58e1b2313921","scenarios":[{"index":0,"name":"basemap-source 1: the map draws the chosen basemap and credits only its provider","scenario_hash":"2def18fe3a13c2547384f24732975447436ca3963342b7d7ecc763b99205e1b9","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-11-22T12:22:19.702901107Z"},{"index":1,"name":"basemap-source 2: every basemap is drawn from tiles of one size up to one zoom level","scenario_hash":"973d5acf38161602efd9dbbeae626da4e62f4797000014860f6f627405c8e118","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-22T12:22:19.702901107Z"}]}
# acceptance-mutation-manifest-end

# basemap-source
Feature: Basemap source
  Each basemap is drawn from the raster tiles of its provider. While no
  layer of the "Couches" panel is shown, the map credits that provider
  alone. The tiles need no API key.
  In a tile URL, {a,b,c,d} stands for four tile servers, one per letter, in
  that order. Esri tile URLs put the row {y} before the column {x}.

  Background:
    Given the application has started

  # basemap-source 1
  Scenario Outline: basemap-source 1: the map draws the chosen basemap and credits only its provider
    Given the user chooses the basemap <previous_basemap>
    When the user chooses the basemap <basemap>
    Then the map draws raster tiles only from <tile_url>
    And the map credits only <attribution>

    Examples:
      | previous_basemap      | basemap               | tile_url                                                                                        | attribution                          |
      | World Imagery         | Positron              | https://{a,b,c,d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png                              | © OpenStreetMap contributors © CARTO |
      | World Topographic Map | Dark Matter           | https://{a,b,c,d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png                               | © OpenStreetMap contributors © CARTO |
      | Dark Matter           | World Imagery         | https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}  | Powered by Esri                      |
      | Positron              | World Topographic Map | https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x} | Powered by Esri                      |

  # basemap-source 2
  Scenario Outline: basemap-source 2: every basemap is drawn from tiles of one size up to one zoom level
    When the user chooses each basemap in turn
    Then every basemap was drawn from tiles of <tile_size> pixels up to zoom level <max_zoom>

    Examples:
      | tile_size | max_zoom |
      | 256       | 19       |
