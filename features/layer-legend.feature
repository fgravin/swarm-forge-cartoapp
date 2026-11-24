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
