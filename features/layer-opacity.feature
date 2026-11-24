# mutation-stamp: sha256=12b216a9904c5b5bdd9e268960d1b1bfac0f8a758b18aa48ed14a464483c7d9b
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:13.198756935Z","feature_name":"Layer opacity","feature_path":"features/layer-opacity.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:121d6bddb98cdd0ff565fd696a80ed7eccd0c293c979668da18b2dd1ea7f155b","scenarios":[{"index":1,"name":"layer-opacity 2: the slider sets the opacity by steps of 5 %, from 0 to 100 %","scenario_hash":"22f985afb05c930a669e5de0a7b942d1a13649c5500a993e9d152be168bda197","mutation_count":21,"result":{"Total":21,"Killed":21,"Survived":0,"Errors":0},"tested_at":"2026-11-24T11:04:13.198756935Z"},{"index":0,"name":"layer-opacity 1: every layer is fully opaque when the application starts","scenario_hash":"452e195972512a8f9b7c45017860c3459c5ac4f67da0e684245ca19debefc70c","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:58:47.592270862Z"},{"index":2,"name":"layer-opacity 3: the opacity is kept when the layer is hidden and shown again","scenario_hash":"0cd948a9d0a59fd967c53d6bb187a270a17098b02fec185071caa8727a8ab192","mutation_count":5,"result":{"Total":5,"Killed":5,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:58:47.592270862Z"},{"index":3,"name":"layer-opacity 4: an opacity set while the layer is hidden applies when it is shown","scenario_hash":"0b3636ccbe12f58cba23cfdb02e4a5cfc4c30fbc5b1e011b700a4b3eb6aca46d","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:58:47.592270862Z"}]}
# acceptance-mutation-manifest-end

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
    And the user has lowered the opacity of layer <position> by <steps> steps
    When the user <move> the opacity of layer <position> by <move_steps> steps
    Then the opacity reads <opacity_texts> after each step
    And the map draws the layer <layer_name> at an opacity of <map_opacity>

    # Rows 2 and 3 reach 0 % and 100 %, then try one step beyond.
    Examples:
      | position | steps | move   | move_steps | opacity_texts      | layer_name         | map_opacity |
      | 1        | 11    | lowers | 2          | 40 %, 35 %         | LANDCOVER.CLC18_FR | 0.35        |
      | 1        | 18    | lowers | 3          | 5 %, 0 %, 0 %      | LANDCOVER.CLC18_FR | 0           |
      | 1        | 2     | raises | 3          | 95 %, 100 %, 100 % | LANDCOVER.CLC18_FR | 1           |

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
