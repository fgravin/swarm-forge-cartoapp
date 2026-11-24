# mutation-stamp: sha256=2ab879f55b47266be86254b8ecf040dedd26c9f04a47363a60e370b2cd4abeb8
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:19.810656271Z","feature_name":"Layer zoom","feature_path":"features/layer-zoom.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:90a741965e7d908db4c197d8139c494ab7bb2b26ab0fa209d09312eb621ceab7","scenarios":[{"index":1,"name":"layer-zoom 2: the zoom button neither shows nor hides the layer","scenario_hash":"31390de6b882dbe5c697ab7742911b1ed8fd5fd417270705becf46efe70e203c","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-11-24T11:04:19.810656271Z"},{"index":0,"name":"layer-zoom 1: the zoom button shows the extent the server declares for the layer","scenario_hash":"8e8ce4616eeeee984c9c73e0bb23e56b1aba9be392771ff6ad40900deee96b35","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:34.026631340Z"},{"index":2,"name":"layer-zoom 3: the zoom button is disabled when the server declares no extent","scenario_hash":"5c6857622f448370b53c3935ddad1b5db1855c9b6a00fe01e6d526972079cbf8","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:34.026631340Z"}]}
# acceptance-mutation-manifest-end

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
    Then the map shows the extent <shown_extent>
    And the map draws the layers <drawn_layers>, from top to bottom

    Examples:
      | shown_positions | position | shown_extent               | drawn_layers        |
      | 1               | 2        | -5.50, 41.33, 10.81, 51.09 | LANDCOVER.CLC18_FR  |
      | 2               | 2        | -5.50, 41.33, 10.81, 51.09 | LITHO_1M_SIMPLIFIEE |

  # layer-zoom 3
  Scenario Outline: layer-zoom 3: the zoom button is disabled when the server declares no extent
    Given the server declares the layer <layer_name> with no extent
    Then the zoom button of layer <position> is <button_state>

    Examples:
      | layer_name          | position | button_state |
      | LITHO_1M_SIMPLIFIEE | 2        | disabled     |
