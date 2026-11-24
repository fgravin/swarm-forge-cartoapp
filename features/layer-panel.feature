# mutation-stamp: sha256=6d09b0915df580a69b85698ac31aa46b34ab4194bb92143e4fd054fe36cf51a2
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:13.510563340Z","feature_name":"Layer panel","feature_path":"features/layer-panel.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:37ab7ee7e68a1d8aa965380409dbd90a51194d072306b2b878aafe0a1f9e8a80","scenarios":[{"index":0,"name":"layer-panel 1: the panel lists three layers","scenario_hash":"6dc2db8294d88a2051d36a3e1c9a80bb8a0aae4df936a8b634d697f730db3b65","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:08.095575112Z"},{"index":1,"name":"layer-panel 2: each layer is listed under the title its server declares, in a fixed order","scenario_hash":"767311bc1dbbbe793391c8caa279e4b9d74b0a5e98b775aafe8ce5dda9723ffd","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:08.095575112Z"},{"index":2,"name":"layer-panel 3: the application asks every server for its capabilities at once","scenario_hash":"468c67f4196d7386c55f16cb23068152bc11efd7f7f99e3406983f2408087da5","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:08.095575112Z"},{"index":3,"name":"layer-panel 4: a layer reads \"Chargement…\" until its server answers","scenario_hash":"1b2789ed710eb2c7a16deb66f9eb5ce510ba2909020ee107220b9e59cf8fd850","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:08.095575112Z"},{"index":4,"name":"layer-panel 5: a layer its server cannot give is unavailable, and the other layers stay usable","scenario_hash":"7bb5a59529b64d30030c8342d84c62b909cb77ee723f7bdf1b279e01e5903aeb","mutation_count":21,"result":{"Total":21,"Killed":21,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:08.095575112Z"},{"index":5,"name":"layer-panel 6: a layer whose server has not answered within 30 seconds is unavailable","scenario_hash":"d0047a8a09762d7afb2eb2ca017fbeb27c13176809e10c534b1ea7508e2536c4","mutation_count":7,"result":{"Total":7,"Killed":7,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:59:08.095575112Z"}]}
# acceptance-mutation-manifest-end

# layer-panel
Feature: Layer panel
  The "Couches" panel lists three WMS layers, in this order: layer 1 is
  LANDCOVER.CLC18_FR of the server https://data.geopf.fr/wms-r/wms, layer 2
  is LITHO_1M_SIMPLIFIEE of the server https://geoservices.brgm.fr/geologie,
  and layer 3 is ch.bafu.schutzgebiete-paerke_nationaler_bedeutung of the
  server https://wms.geo.admin.ch/?lang=fr. The application asks the three
  servers for their capabilities at once, as soon as it starts.
  A layer is listed under the title its server declares for it, and under
  its WMS name until then, or if its server declares none.
  A layer reads "Chargement…" until its server has answered. It reads
  "Couche indisponible" if its server cannot be reached, answers with an
  error, does not declare it, or has not answered within 30 seconds of the
  start of the application; a layer stays unavailable once it is. While a
  layer reads either, its controls are disabled: its eye button, zoom
  button, opacity slider and legend button. The other layers stay usable.
  Unless a step says otherwise, each server answers at once and declares
  its layer with this title, extent and credit, a legend, and a GetMap
  service. An extent is written west, south, east, north.
  layer 1: CORINE Land Cover - France métropolitaine - 2018;
  -9.88, 40.58, 11.68, 51.44; Ministère de la Transition écologique et de
  la Cohésion des territoires.
  layer 2: Carte lithologique simplifiée au 1/1 000 000;
  -5.50, 41.33, 10.81, 51.09; BRGM.
  layer 3: Parcs suisses (Zones); 3.33, 44.07, 14.28, 49.20; Das Geoportal
  des Bundes.

  Background:
    Given the application has started

  # layer-panel 1
  Scenario Outline: layer-panel 1: the panel lists three layers
    Then the layer panel lists <layer_count> layers

    Examples:
      | layer_count |
      | 3           |

  # layer-panel 2
  Scenario Outline: layer-panel 2: each layer is listed under the title its server declares, in a fixed order
    Given the server declares the layer <layer_name> with the title <declared_title>
    Then layer <position> of the layer panel is <shown_name>

    Examples:
      | layer_name                                        | declared_title                                   | position | shown_name                                       |
      | LANDCOVER.CLC18_FR                                | CORINE Land Cover - France métropolitaine - 2018 | 1        | CORINE Land Cover - France métropolitaine - 2018 |
      | LITHO_1M_SIMPLIFIEE                               | Carte lithologique simplifiée au 1/1 000 000     | 2        | Carte lithologique simplifiée au 1/1 000 000     |
      | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | Parcs suisses (Zones)                            | 3        | Parcs suisses (Zones)                            |

  # layer-panel 3
  Scenario Outline: layer-panel 3: the application asks every server for its capabilities at once
    Given no server has answered yet
    Then the application has asked for the capabilities of <server_urls>

    Examples:
      | server_urls                                                                                            |
      | https://data.geopf.fr/wms-r/wms, https://geoservices.brgm.fr/geologie, https://wms.geo.admin.ch/?lang=fr |

  # layer-panel 4
  Scenario Outline: layer-panel 4: a layer reads "Chargement…" until its server answers
    Given the server of <layer_name> has not answered yet
    Then layer <position> of the layer panel is <shown_name>
    And its status reads <status>
    And its controls are <controls_state>
    And the controls of the other layers are <other_controls_state>

    Examples:
      | layer_name          | position | shown_name          | status      | controls_state | other_controls_state |
      | LITHO_1M_SIMPLIFIEE | 2        | LITHO_1M_SIMPLIFIEE | Chargement… | disabled       | enabled              |

  # layer-panel 5
  Scenario Outline: layer-panel 5: a layer its server cannot give is unavailable, and the other layers stay usable
    Given the server of <layer_name> <failure>
    Then layer <position> of the layer panel is <shown_name>
    And its status reads <status>
    And its controls are <controls_state>
    And the controls of the other layers are <other_controls_state>

    Examples:
      | layer_name                                        | failure               | position | shown_name                                        | status              | controls_state | other_controls_state |
      | LANDCOVER.CLC18_FR                                | cannot be reached     | 1        | LANDCOVER.CLC18_FR                                | Couche indisponible | disabled       | enabled              |
      | LITHO_1M_SIMPLIFIEE                               | answers with an error | 2        | LITHO_1M_SIMPLIFIEE                               | Couche indisponible | disabled       | enabled              |
      | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | does not declare it   | 3        | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | Couche indisponible | disabled       | enabled              |

  # layer-panel 6
  Scenario Outline: layer-panel 6: a layer whose server has not answered within 30 seconds is unavailable
    Given the server of <layer_name> never answers
    When the user waits <timeout> milliseconds less one
    Then layer <position> of the layer panel is <shown_name>
    And its status reads <loading_status>
    When the user waits one more millisecond
    Then its status reads <unavailable_status>
    And its controls are <controls_state>

    Examples:
      | layer_name                                        | timeout | position | shown_name                                        | loading_status | unavailable_status  | controls_state |
      | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | 30000   | 3        | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | Chargement…    | Couche indisponible | disabled       |
