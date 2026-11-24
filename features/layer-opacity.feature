# layer-opacity
Feature: Layer opacity
  Each layer of the "Couches" panel has an opacity slider, named "Opacité de
  <title>", that sets the opacity of the layer from 0 to 100 %, by steps of
  5 %, and shows its value, as in "35 %". The map draws the layer at that
  opacity at once: an opacity of 35 % is an opacity of 0.35 on the map. The
  opacity is 100 % when the application starts. It is kept when the layer
  is hidden and shown again, and it can be set while the layer is hidden.
  To lower or raise the opacity by one step is to move the slider one step
  down or up.
  Layers 1, 2 and 3 are LANDCOVER.CLC18_FR, LITHO_1M_SIMPLIFIEE and
  ch.bafu.schutzgebiete-paerke_nationaler_bedeutung. Their servers answer at
  once.

  Background:
    Given the application has started

  # layer-opacity 1
  Scenario Outline: layer-opacity 1: every layer is fully opaque when the application starts
    Then the opacity of layer <position> reads <opacity_text>

    Examples:
      | position | opacity_text |
      | 1        | 100 %        |
      | 2        | 100 %        |
      | 3        | 100 %        |

  # layer-opacity 2
  Scenario Outline: layer-opacity 2: the slider sets the opacity by steps of 5 %, from 0 to 100 %
    Given the user has shown layer <position>
    When the user lowers the opacity of layer <position> by <lower_steps> steps, then raises it by <raise_steps> steps
    Then the opacity of layer <position> reads <opacity_text>
    And the map draws the layer <layer_name> at an opacity of <map_opacity>

    Examples:
      | position | lower_steps | raise_steps | opacity_text | layer_name         | map_opacity |
      | 1        | 1           | 0           | 95 %         | LANDCOVER.CLC18_FR | 0.95        |
      | 1        | 13          | 0           | 35 %         | LANDCOVER.CLC18_FR | 0.35        |
      | 1        | 20          | 0           | 0 %          | LANDCOVER.CLC18_FR | 0           |
      | 1        | 21          | 0           | 0 %          | LANDCOVER.CLC18_FR | 0           |
      | 1        | 4           | 2           | 90 %         | LANDCOVER.CLC18_FR | 0.9         |
      | 1        | 4           | 5           | 100 %        | LANDCOVER.CLC18_FR | 1           |

  # layer-opacity 3
  Scenario Outline: layer-opacity 3: the opacity is kept when the layer is hidden and shown again
    Given the user has shown layer <position>
    And the user has lowered the opacity of layer <position> by <steps> steps
    When the user hides layer <position> and shows it again
    Then the opacity of layer <position> reads <opacity_text>
    And the map draws the layer <layer_name> at an opacity of <map_opacity>

    Examples:
      | position | steps | opacity_text | layer_name                                        | map_opacity |
      | 3        | 12    | 40 %         | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | 0.4         |

  # layer-opacity 4
  Scenario Outline: layer-opacity 4: an opacity set while the layer is hidden applies when it is shown
    Given the user has lowered the opacity of layer <position> by <steps> steps
    When the user presses the eye button of layer <position>
    Then the map draws the layer <layer_name> at an opacity of <map_opacity>

    Examples:
      | position | steps | layer_name          | map_opacity |
      | 2        | 10    | LITHO_1M_SIMPLIFIEE | 0.5         |
