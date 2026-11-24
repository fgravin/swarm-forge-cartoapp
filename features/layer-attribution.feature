# mutation-stamp: sha256=625a8c7696be454fd361321adf0150eeeec2a05c310bffa4fb97f47f14c04b0e
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:08.367304564Z","feature_name":"Layer attribution","feature_path":"features/layer-attribution.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:0c86e7fd54fa4f1bdf52c9d76e39e9a8c8d1b51df144981abfcc33dc44d09407","scenarios":[{"index":0,"name":"layer-attribution 1: a shown layer adds the credit its server declares","scenario_hash":"f6f87239dc74a31b36e5f553c402c33b0323da45be431b7cf18bd28a6ef42348","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:57:34.647103626Z"},{"index":1,"name":"layer-attribution 2: the credits of the layers follow the order of the list","scenario_hash":"e05a133282a41d366e365f4c851537b9aad568bc0f11ced029960d0f36fe9077","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:57:34.647103626Z"},{"index":2,"name":"layer-attribution 3: hiding a layer removes its credit","scenario_hash":"9d77a3a56436453debba1909b8a2f3b9111c1a0ff7c46c898829b2f51c041d30","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:57:34.647103626Z"},{"index":3,"name":"layer-attribution 4: the credits follow the chosen basemap","scenario_hash":"835e95d0442dbb3efba2f3b63909446585b930b7f099240c5bf2b042e77913ef","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:57:34.647103626Z"}]}
# acceptance-mutation-manifest-end

# layer-attribution
Feature: Layer attribution
  The map credits the basemap, then the credit that the server of each shown
  layer declares for it (Attribution), in the order of the list. A hidden
  layer is not credited: while no layer is shown, the basemap alone is
  credited. A layer whose server declares no credit for it adds none.
  Credits are written separated by a comma and a space.
  Layers 1, 2 and 3 are LANDCOVER.CLC18_FR, LITHO_1M_SIMPLIFIEE and
  ch.bafu.schutzgebiete-paerke_nationaler_bedeutung. Their servers answer at
  once and declare them with the credits Ministère de la Transition
  écologique et de la Cohésion des territoires, BRGM and Das Geoportal des
  Bundes, unless a step says otherwise. The application opens on the
  basemap Positron, credited © OpenStreetMap contributors © CARTO.

  Background:
    Given the application has started

  # layer-attribution 1
  Scenario Outline: layer-attribution 1: a shown layer adds the credit its server declares
    Given the server declares the layer <layer_name> with the credit <declared_credit>
    When the user presses the eye button of layer <position>
    Then the map credits only <credits>

    Examples:
      | layer_name                                        | declared_credit                                                        | position | credits                                                                                                      |
      | LANDCOVER.CLC18_FR                                | Ministère de la Transition écologique et de la Cohésion des territoires | 1        | © OpenStreetMap contributors © CARTO, Ministère de la Transition écologique et de la Cohésion des territoires |
      | LITHO_1M_SIMPLIFIEE                               | BRGM                                                                   | 2        | © OpenStreetMap contributors © CARTO, BRGM                                                                   |
      | ch.bafu.schutzgebiete-paerke_nationaler_bedeutung | Das Geoportal des Bundes                                               | 3        | © OpenStreetMap contributors © CARTO, Das Geoportal des Bundes                                               |

  # layer-attribution 2
  Scenario Outline: layer-attribution 2: the credits of the layers follow the order of the list
    Given the user has shown the layers <shown_positions>
    Then the map credits only <credits>

    Examples:
      | shown_positions | credits                                                                                                                               |
      | 3, 1            | © OpenStreetMap contributors © CARTO, Ministère de la Transition écologique et de la Cohésion des territoires, Das Geoportal des Bundes |

  # layer-attribution 3
  Scenario Outline: layer-attribution 3: hiding a layer removes its credit
    Given the user has shown the layers <shown_positions>
    When the user presses the eye button of layer <position>
    Then the map credits only <credits>

    Examples:
      | shown_positions | position | credits                                    |
      | 1, 2            | 1        | © OpenStreetMap contributors © CARTO, BRGM |
      | 2               | 2        | © OpenStreetMap contributors © CARTO       |

  # layer-attribution 4
  Scenario Outline: layer-attribution 4: the credits follow the chosen basemap
    Given the user has shown the layers <shown_positions>
    When the user chooses the basemap <basemap>
    Then the map credits only <credits>

    Examples:
      | shown_positions | basemap       | credits               |
      | 2               | World Imagery | Powered by Esri, BRGM |
