# mutation-stamp: sha256=6e4f01724429a805bce1acbab56c677ac7c2c9a9d874454cfb0e3be995359daa
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:08.661538370Z","feature_name":"Layer legend","feature_path":"features/layer-legend.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:c68d4eedc8c51f5b2e0db8d22c7b33c21bdb16fcbc168fa49e951b72751afe46","scenarios":[{"index":0,"name":"layer-legend 1: every legend is folded when the application starts","scenario_hash":"54dec0628f49531110e04681c42639952dfe329ec27131ee4df4b88ca8ce6d3c","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:58:04.878739218Z"},{"index":1,"name":"layer-legend 2: the legend button unfolds the legend image the server declares","scenario_hash":"68e893ff77b20847a9e75546f2b11f71c6d7780a445fe6fe73836947ebecc201","mutation_count":15,"result":{"Total":15,"Killed":15,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:58:04.878739218Z"},{"index":2,"name":"layer-legend 3: the legend button folds the legend again","scenario_hash":"a325a6ddb1871771ccb22a8a024d325899c879edbc16f723083b1c625ff4b831","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:58:04.878739218Z"},{"index":3,"name":"layer-legend 4: a legend image that does not load is unavailable","scenario_hash":"c96c511b9f37b8a4a36fbcb07b98b41a775f658c5de7d9dbb12453088ea58a5e","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:58:04.878739218Z"},{"index":4,"name":"layer-legend 5: a layer without a declared legend has its legend unavailable","scenario_hash":"a80ceac21acaa553f58ed322d49132fcf3c0b313e8ed94aa2a1ac9775cc21c74","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:58:04.878739218Z"}]}
# acceptance-mutation-manifest-end

# layer-legend
Feature: Layer legend
  Each layer of the "Couches" panel has a "Légende" button that unfolds or
  folds, under the layer, the legend image of the layer's default style, as
  its server declares it (LegendURL). The image is described as "Légende de
  <title>". It is asked over HTTPS, even when the server declares it over
  http. If the image does not load, or if the server declares no legend for
  the layer, the unfolded legend reads "Légende indisponible" instead.
  Legends are folded when the application starts.
  Layers 1, 2 and 3 are LANDCOVER.CLC18_FR, LITHO_1M_SIMPLIFIEE and
  ch.bafu.schutzgebiete-paerke_nationaler_bedeutung. Their servers answer at
  once and declare them with the titles CORINE Land Cover - France
  métropolitaine - 2018, Carte lithologique simplifiée au 1/1 000 000 and
  Parcs suisses (Zones), and with a legend, unless a step says otherwise.

  Background:
    Given the application has started

  # layer-legend 1
  Scenario Outline: layer-legend 1: every legend is folded when the application starts
    Then the legend of layer <position> is <legend_state>

    Examples:
      | position | legend_state |
      | 1        | folded       |
      | 2        | folded       |
      | 3        | folded       |

  # layer-legend 2
  Scenario Outline: layer-legend 2: the legend button unfolds the legend image the server declares
    Given the server declares the layer <layer_name> with the legend <declared_legend_url>
    When the user presses the legend button of layer <position>
    Then the legend of layer <position> shows the image <legend_url>, described as <description>

    # Row 2 is declared over http, as the BRGM does.
    Examples:
      | layer_name                                        | declared_legend_url                                                                                                                         | position | legend_url                                                                                                                                   | description                                                |
      | LANDCOVER.CLC18_FR                                | https://data.geopf.fr/annexes/ressources/legendes/LANDCOVER.CLC18_FR-legend.png                                                             | 1        | https://data.geopf.fr/annexes/ressources/legendes/LANDCOVER.CLC18_FR-legend.png                                                              | Légende de CORINE Land Cover - France métropolitaine - 2018 |
      | LITHO_1M_SIMPLIFIEE                               | http://geoservices.brgm.fr/geologie?version=1.3.0&service=WMS&request=GetLegendGraphic&sld_version=1.1.0&layer=LITHO_1M_SIMPLIFIEE&format=image/png | 2        | https://geoservices.brgm.fr/geologie?version=1.3.0&service=WMS&request=GetLegendGraphic&sld_version=1.1.0&layer=LITHO_1M_SIMPLIFIEE&format=image/png | Légende de Carte lithologique simplifiée au 1/1 000 000     |
      | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | https://api3.geo.admin.ch/static/images/legends/ch.bafu.schutzgebiete-paerke_nationaler_bedeutung_fr.png                                    | 3        | https://api3.geo.admin.ch/static/images/legends/ch.bafu.schutzgebiete-paerke_nationaler_bedeutung_fr.png                                     | Légende de Parcs suisses (Zones)                           |

  # layer-legend 3
  Scenario Outline: layer-legend 3: the legend button folds the legend again
    Given the user has unfolded the legend of layer <position>
    When the user presses the legend button of layer <position>
    Then the legend of layer <position> is <legend_state>

    Examples:
      | position | legend_state |
      | 2        | folded       |

  # layer-legend 4
  Scenario Outline: layer-legend 4: a legend image that does not load is unavailable
    Given the user has unfolded the legend of layer <position>
    When the legend image of layer <position> fails to load
    Then the legend of layer <position> reads <message>

    Examples:
      | position | message              |
      | 1        | Légende indisponible |

  # layer-legend 5
  Scenario Outline: layer-legend 5: a layer without a declared legend has its legend unavailable
    Given the server declares the layer <layer_name> with no legend
    When the user presses the legend button of layer <position>
    Then the legend of layer <position> reads <message>

    Examples:
      | layer_name          | position | message              |
      | LITHO_1M_SIMPLIFIEE | 2        | Légende indisponible |
