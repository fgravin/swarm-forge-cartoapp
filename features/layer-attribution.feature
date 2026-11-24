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
