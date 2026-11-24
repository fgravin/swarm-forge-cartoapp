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
  "Couche indisponible" if its server does not answer, answers with an
  error, or does not declare it. While a layer reads either, its controls
  are disabled: its eye button, zoom button, opacity slider and legend
  button. The other layers stay usable.
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
      | LANDCOVER.CLC18_FR                                | does not answer       | 1        | LANDCOVER.CLC18_FR                                | Couche indisponible | disabled       | enabled              |
      | LITHO_1M_SIMPLIFIEE                               | answers with an error | 2        | LITHO_1M_SIMPLIFIEE                               | Couche indisponible | disabled       | enabled              |
      | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | does not declare it   | 3        | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | Couche indisponible | disabled       | enabled              |
