# mutation-stamp: sha256=1859bf27a7fe76893c67c7336143864ad9638f2cd8740840c4faf875c3db984e
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:21.806436524Z","feature_name":"Place search suggestions","feature_path":"features/place-search-suggestions.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:07b9a5d90ca212bee0e8bd0ecd24cad13bf9c57afc1f4402adaeac4cc53b4da3","scenarios":[{"index":0,"name":"place-search-suggestions 1: a place suggestion gives the place's name, type and context","scenario_hash":"488d82cffd18031d0019adf48193e235f9dcd2d44700ffa85ffce9a3a3747e4a","mutation_count":49,"result":{"Total":49,"Killed":49,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:39:10.566888257Z"},{"index":1,"name":"place-search-suggestions 2: an address suggestion gives the address, its type and its context","scenario_hash":"e77a52c849936e761db6c1267163a2b51b5a420190ca787ac3d504e16aa0a44e","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:30:06.864184061Z"},{"index":2,"name":"place-search-suggestions 3: the address comes first, within 8 suggestions","scenario_hash":"264d7fa8179b259fd984aa5dc748c0951d0ae6837feb314168d087c4bfed549f","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:30:06.864184061Z"},{"index":3,"name":"place-search-suggestions 4: the list shows 8 places at most","scenario_hash":"b83abc5f6a803c1ec51c881b17a8d903bd9267401cb1a5dea4a4d5350e2bcb70","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:30:06.864184061Z"},{"index":4,"name":"place-search-suggestions 5: the search says so when GeoNames finds nothing","scenario_hash":"2ef2148e4740ec7af563ddae0af689cb27a3138f7531acb0d17ffe4b97ba5b45","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:30:06.864184061Z"}]}
# acceptance-mutation-manifest-end

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
    Given GeoNames finds the place <name> of <feature> in <region>, <country>
    When the user searches for Gre
    Then suggestion 1 is <suggestion_name>
    And its type reads <type>
    And its context reads <context>

    # A row gives a place by what decides its type: its class, with a code
    # that does not start with PCL; its code, which does; or a class other
    # than A and P. A row with no region is a place for which GeoNames gives
    # none.
    Examples:
      | name                 | feature                    | region               | country            | suggestion_name      | type   | context                      |
      | Grenoble             | class P                    | Auvergne-Rhône-Alpes | France             | Grenoble             | Ville  | Auvergne-Rhône-Alpes, France |
      | Isère                | class A                    | Auvergne-Rhône-Alpes | France             | Isère                | Région | Auvergne-Rhône-Alpes, France |
      | Auvergne-Rhône-Alpes | class A                    | Auvergne-Rhône-Alpes | France             | Auvergne-Rhône-Alpes | Région | France                       |
      | Grèce                | code PCLI                  |                      | Grèce              | Grèce                | Pays   |                              |
      | Nouvelle-Calédonie   | code PCLD                  |                      | Nouvelle-Calédonie | Nouvelle-Calédonie   | Pays   |                              |
      | Mont Blanc           | a class other than A and P | Auvergne-Rhône-Alpes | France             | Mont Blanc           | Lieu   | Auvergne-Rhône-Alpes, France |
      | Lac Léman            | a class other than A and P | Genève               | Suisse             | Lac Léman            | Lieu   | Genève, Suisse               |

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
