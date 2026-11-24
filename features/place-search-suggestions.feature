# place-search-suggestions
Feature: Place search suggestions
  The suggestion list shows what GeoNames found for the search: the address
  first, if GeoNames found one, then the places in the order GeoNames gives
  them, and 8 suggestions at most. A suggestion gives a name, a type and a
  context.
  A place is named by the name GeoNames gives it in French. Its type follows
  its GeoNames feature class and code: Pays for a code that starts with PCL,
  Région for any other code of class A, Ville for class P, and Lieu for
  every other class. An address is named by its house number, its street
  and its town, as in "4 Place Saint-André, Grenoble", and its type is
  Adresse.
  The context is the region, then the country, separated by a comma and a
  space, with the country named in French. It leaves out what GeoNames does
  not give, and what is the suggestion itself.
  The application has started with a GeoNames username. A step that says
  what GeoNames finds gives everything GeoNames finds for every search.
  GeoNames finds no address when it answers without one, or with the status
  15, no result found.

  Background:
    Given the application has started

  # place-search-suggestions 1
  Scenario Outline: place-search-suggestions 1: a place suggestion gives the place's name, type and context
    Given GeoNames finds the place <name> of class <feature_class> and code <feature_code> in <region>, <country>
    When the user searches for Gre
    Then suggestion 1 is <suggestion_name>
    And its type reads <type>
    And its context reads <context>

    # A row with no region is a place for which GeoNames gives none.
    Examples:
      | name                 | feature_class | feature_code | region               | country            | suggestion_name      | type   | context                      |
      | Grenoble             | P             | PPLA3        | Auvergne-Rhône-Alpes | France             | Grenoble             | Ville  | Auvergne-Rhône-Alpes, France |
      | Isère                | A             | ADM2         | Auvergne-Rhône-Alpes | France             | Isère                | Région | Auvergne-Rhône-Alpes, France |
      | Auvergne-Rhône-Alpes | A             | ADM1         | Auvergne-Rhône-Alpes | France             | Auvergne-Rhône-Alpes | Région | France                       |
      | Grèce                | A             | PCLI         |                      | Grèce              | Grèce                | Pays   |                              |
      | Nouvelle-Calédonie   | A             | PCLD         |                      | Nouvelle-Calédonie | Nouvelle-Calédonie   | Pays   |                              |
      | Mont Blanc           | T             | MT           | Auvergne-Rhône-Alpes | France             | Mont Blanc           | Lieu   | Auvergne-Rhône-Alpes, France |
      | Lac Léman            | H             | LK           | Genève               | Suisse             | Lac Léman            | Lieu   | Genève, Suisse               |

  # place-search-suggestions 2
  Scenario Outline: place-search-suggestions 2: an address suggestion gives the address, its type and its context
    Given GeoNames finds the address <house_number> <street>, <town> in <region>, <country>
    When the user searches for Gre
    Then suggestion 1 is <suggestion_name>
    And its type reads <type>
    And its context reads <context>

    Examples:
      | house_number | street            | town     | region               | country | suggestion_name               | type    | context                      |
      | 4            | Place Saint-André | Grenoble | Auvergne-Rhône-Alpes | France  | 4 Place Saint-André, Grenoble | Adresse | Auvergne-Rhône-Alpes, France |

  # place-search-suggestions 3
  Scenario Outline: place-search-suggestions 3: the address comes first, within 8 suggestions
    Given GeoNames finds <max_count> places and an address
    When the user searches for Gre
    Then the suggestion list shows the address, then the first <max_count> places found less one

    Examples:
      | max_count |
      | 8         |

  # place-search-suggestions 4
  Scenario Outline: place-search-suggestions 4: the list shows 8 places at most
    Given GeoNames finds <max_count> places and one more, and no address
    When the user searches for Gre
    Then the suggestion list shows the first <max_count> places found

    Examples:
      | max_count |
      | 8         |

  # place-search-suggestions 5
  Scenario Outline: place-search-suggestions 5: the search says so when GeoNames finds nothing
    Given GeoNames finds no place and no address
    When the user searches for Gre
    Then the search shows the message <message>

    Examples:
      | message        |
      | Aucun résultat |
