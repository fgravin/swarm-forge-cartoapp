# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:17.364813588Z","feature_name":"Layer visibility","feature_path":"features/layer-visibility.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:73b68b0534c6a6475b25741896a83583b884b9d1432427dcfe9849c503061365","scenarios":[{"index":0,"name":"layer-visibility 1: every layer is hidden when the application starts","scenario_hash":"d1c256d077ffc437cfed41decb562af254c817edb96a556b1cb9cb7b2753b6e1","mutation_count":9,"result":{"Total":9,"Killed":9,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:25.725309534Z"},{"index":1,"name":"layer-visibility 2: the eye button shows the layer","scenario_hash":"8f2e7b1fc39aa1ba4a129cf5ab7d24f18244141f0da6dc1e3341eb4ceed7ba21","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:25.725309534Z"},{"index":2,"name":"layer-visibility 3: the eye button hides the layer again","scenario_hash":"0faed712596742f5f34e40129a033a361b2375ad5d27c65a8f65d65464f9619e","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:25.725309534Z"},{"index":3,"name":"layer-visibility 4: the first layer of the list is drawn on top","scenario_hash":"4fd69dc755ce65ac8480e9ca5cbe509d3c6042e9676fbb4e8aa101843004175e","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:25.725309534Z"},{"index":4,"name":"layer-visibility 5: changing the basemap keeps the layers as they were","scenario_hash":"a09d3942153e0b29b7e6f204d72aa79f404c83672b70702bdca18f9a819cd29f","mutation_count":7,"result":{"Total":7,"Killed":7,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:25.725309534Z"},{"index":6,"name":"layer-visibility 7: choosing a place found by the search keeps the layers","scenario_hash":"c14c95023ce8d8191d2bb0119ccba89e67e132a92d988498512a4f49392e62fb","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:25.725309534Z"}]}
# acceptance-mutation-manifest-end

# layer-visibility
Feature: Layer visibility
  Each layer of the "Couches" panel has an eye button that shows or hides
  it. The button is named "Afficher <title>" while the layer is hidden and
  "Masquer <title>" while it is shown, and it is pressed while the layer is
  shown. The three layers are hidden when the application starts.
  The map draws the shown layers over the basemap, in the order of the
  list: layer 1 on top. Choosing another basemap changes neither the list,
  nor which layers are shown, nor their opacity, nor their order.
  A shown layer is drawn from transparent PNG tiles of 256 pixels in
  EPSG:3857, asked from the GetMap service its server announces: WMS 1.3.0,
  the layer's name, its default style, and the bounds of each tile, left
  for the map to fill in ({bbox-epsg-3857}, written as is). The tiles keep
  the parameters of the announced URL, and are asked over HTTPS, even when
  the server announces its GetMap service over http.
  Layers 1, 2 and 3 are LANDCOVER.CLC18_FR, LITHO_1M_SIMPLIFIEE and
  ch.bafu.schutzgebiete-paerke_nationaler_bedeutung. Their servers answer at
  once and declare them with the titles CORINE Land Cover - France
  métropolitaine - 2018, Carte lithologique simplifiée au 1/1 000 000 and
  Parcs suisses (Zones), unless a step says otherwise. An opacity is set by
  steps of 5 %.
  To search for a text is to type it in the search field of the header and
  stop typing for one second. GeoNames then finds places for it.

  Background:
    Given the application has started

  # layer-visibility 1
  Scenario Outline: layer-visibility 1: every layer is hidden when the application starts
    Then the eye button of layer <position> is named <button_name>
    And it is <pressed_state>
    And the map draws no layer

    Examples:
      | position | button_name                                               | pressed_state |
      | 1        | Afficher CORINE Land Cover - France métropolitaine - 2018 | not pressed   |
      | 2        | Afficher Carte lithologique simplifiée au 1/1 000 000     | not pressed   |
      | 3        | Afficher Parcs suisses (Zones)                            | not pressed   |

  # layer-visibility 2
  Scenario Outline: layer-visibility 2: the eye button shows the layer
    When the user presses the eye button of layer <position>
    Then the map draws only the layer <layer_name>
    And the eye button of layer <position> is named <button_name>
    And it is <pressed_state>

    Examples:
      | position | layer_name                                        | button_name                                              | pressed_state |
      | 1        | LANDCOVER.CLC18_FR                                | Masquer CORINE Land Cover - France métropolitaine - 2018 | pressed       |
      | 2        | LITHO_1M_SIMPLIFIEE                               | Masquer Carte lithologique simplifiée au 1/1 000 000     | pressed       |
      | 3        | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | Masquer Parcs suisses (Zones)                            | pressed       |

  # layer-visibility 3
  Scenario Outline: layer-visibility 3: the eye button hides the layer again
    Given the user has shown layer <position>
    When the user presses the eye button of layer <position>
    Then the map draws no layer
    And the eye button of layer <position> is named <button_name>
    And it is <pressed_state>

    Examples:
      | position | button_name                                           | pressed_state |
      | 2        | Afficher Carte lithologique simplifiée au 1/1 000 000 | not pressed   |

  # layer-visibility 4
  Scenario Outline: layer-visibility 4: the first layer of the list is drawn on top
    Given the user has shown the layers <shown_positions>
    Then the map draws the layers <drawn_layers>, from top to bottom

    # The positions are those of the list, in the order the user shows them.
    Examples:
      | shown_positions | drawn_layers                                                                                 |
      | 3, 1            | LANDCOVER.CLC18_FR, ch.bafu.schutzgebiete-paerke_nationaler_bedeutung                        |
      | 3, 2            | LITHO_1M_SIMPLIFIEE, ch.bafu.schutzgebiete-paerke_nationaler_bedeutung                       |
      | 2, 3, 1         | LANDCOVER.CLC18_FR, LITHO_1M_SIMPLIFIEE, ch.bafu.schutzgebiete-paerke_nationaler_bedeutung   |

  # layer-visibility 5
  Scenario Outline: layer-visibility 5: changing the basemap keeps the layers as they were
    Given the user has shown the layers <shown_positions>
    And the user has lowered the opacity of layer <position> by <steps> steps
    When the user chooses the basemap <basemap>
    Then the map draws the layers <drawn_layers>, from top to bottom
    And the map draws the layer <layer_name> at an opacity of <map_opacity>

    Examples:
      | shown_positions | position | steps | basemap     | drawn_layers                                                          | layer_name                                        | map_opacity |
      | 3, 1            | 3        | 12    | Dark Matter | LANDCOVER.CLC18_FR, ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | 0.4         |

  # layer-visibility 6
  Scenario Outline: layer-visibility 6: a shown layer is drawn from transparent GetMap tiles, over HTTPS
    Given the server of <layer_name> announces its GetMap service at <announced_url>
    When the user presses the eye button of layer <position>
    Then the map draws the layer <drawn_layer> from the GetMap tiles of <tile_service_url>

    # Row 2 is announced over http, as the BRGM does.
    Examples:
      | layer_name                                        | announced_url                         | position | drawn_layer                                       | tile_service_url                      |
      | LANDCOVER.CLC18_FR                                | https://data.geopf.fr/wms-r?          | 1        | LANDCOVER.CLC18_FR                                | https://data.geopf.fr/wms-r           |
      | LITHO_1M_SIMPLIFIEE                               | http://geoservices.brgm.fr/geologie?  | 2        | LITHO_1M_SIMPLIFIEE                               | https://geoservices.brgm.fr/geologie  |
      | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | https://wms.geo.admin.ch/?lang=fr     | 3        | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | https://wms.geo.admin.ch/?lang=fr     |

  # layer-visibility 7
  Scenario Outline: layer-visibility 7: choosing a place found by the search keeps the layers
    Given the user has shown the layers <shown_positions>
    When the user searches for Gre
    And the user clicks suggestion 1
    Then the map draws the layers <drawn_layers>, from top to bottom

    Examples:
      | shown_positions | drawn_layers                                                          |
      | 3, 1            | LANDCOVER.CLC18_FR, ch.bafu.schutzgebiete-paerke_nationaler_bedeutung |
