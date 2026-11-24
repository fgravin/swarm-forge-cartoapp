# layer-zoom
Feature: Layer zoom
  Each layer of the "Couches" panel has a zoom button, named "Zoomer sur
  <title>", that makes the map show the extent its server declares for the
  layer in geographic coordinates (EPSG:4326). The zoom button neither shows
  nor hides the layer. It is disabled when the server declares no extent for
  the layer.
  An extent is written west, south, east, north.
  Layers 1, 2 and 3 are LANDCOVER.CLC18_FR, LITHO_1M_SIMPLIFIEE and
  ch.bafu.schutzgebiete-paerke_nationaler_bedeutung. Their servers answer at
  once and declare them with an extent, unless a step says otherwise.

  Background:
    Given the application has started

  # layer-zoom 1
  Scenario Outline: layer-zoom 1: the zoom button shows the extent the server declares for the layer
    Given the server declares the layer <layer_name> with the extent <declared_extent>
    When the user presses the zoom button of layer <position>
    Then the map shows the extent <shown_extent>

    Examples:
      | layer_name                                        | declared_extent            | position | shown_extent               |
      | LANDCOVER.CLC18_FR                                | -9.88, 40.58, 11.68, 51.44 | 1        | -9.88, 40.58, 11.68, 51.44 |
      | LITHO_1M_SIMPLIFIEE                               | -5.50, 41.33, 10.81, 51.09 | 2        | -5.50, 41.33, 10.81, 51.09 |
      | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | 3.33, 44.07, 14.28, 49.20  | 3        | 3.33, 44.07, 14.28, 49.20  |

  # layer-zoom 2
  Scenario Outline: layer-zoom 2: the zoom button neither shows nor hides the layer
    Given the user has shown the layers <shown_positions>
    When the user presses the zoom button of layer <position>
    Then the map draws the layers <drawn_layers>, from top to bottom

    Examples:
      | shown_positions | position | drawn_layers        |
      | 1               | 2        | LANDCOVER.CLC18_FR  |
      | 2               | 2        | LITHO_1M_SIMPLIFIEE |

  # layer-zoom 3
  Scenario Outline: layer-zoom 3: the zoom button is disabled when the server declares no extent
    Given the server declares the layer <layer_name> with no extent
    Then the zoom button of layer <position> is <button_state>

    Examples:
      | layer_name          | position | button_state |
      | LITHO_1M_SIMPLIFIEE | 2        | disabled     |
