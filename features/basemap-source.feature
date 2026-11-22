# basemap-source
Feature: Basemap source
  Each basemap is drawn from the raster tiles of its provider, and the map
  credits that provider alone. The tiles need no API key.
  In a tile URL, {a,b,c,d} stands for four tile servers, one per letter, in
  that order. Esri tile URLs put the row {y} before the column {x}.

  Background:
    Given the application has started

  # basemap-source 1
  Scenario Outline: basemap-source 1: the map draws the chosen basemap and credits only its provider
    Given the user chooses the basemap <previous_basemap>
    When the user chooses the basemap <basemap>
    Then the map draws raster tiles from <tile_url>
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
