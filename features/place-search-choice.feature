# mutation-stamp: sha256=ab57e55a63044736d5c12c9b0096bc719216f29fd055babaa278bb12d2ffea7c
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T10:38:52.778701131Z","feature_name":"Place search choice","feature_path":"features/place-search-choice.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:2ad98c767e0aa4f22aede3b149753596f13ae97c701a6efc65e789d5d66816e9","scenarios":[{"index":3,"name":"place-search-choice 4: the arrow keys move the active suggestion round the list","scenario_hash":"b0ab3ff14833a6b05399e7ec1734e335aacc9a8e83748ab83665a76c8af549d9","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:38:52.778701131Z"},{"index":4,"name":"place-search-choice 5: Enter chooses the active suggestion","scenario_hash":"7bd70dfa7ee64134871b409b0f23940366683b8a6619d1792838fa2578d718c9","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:35:24.217888942Z"},{"index":0,"name":"place-search-choice 1: choosing a suggestion without an extent centres the map on it","scenario_hash":"d846b288e62c61457cf180363b8f7126c8fac9ec8b1d1767f1d6b6e8dda0f11c","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:41.567008182Z"},{"index":1,"name":"place-search-choice 2: choosing a suggestion with an extent shows that extent","scenario_hash":"f1787f2a2f2422c547f3a33fea25c06a7fc9154ab73fd4a8db1ab229e47704d0","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:41.567008182Z"},{"index":2,"name":"place-search-choice 3: a chosen suggestion fills the search field and closes the list","scenario_hash":"556ec37c66811cfc2e3a680ee4412cdf47937273e03b5922a4e456c8b6b3ff6c","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:41.567008182Z"},{"index":5,"name":"place-search-choice 6: Enter chooses nothing while no suggestion is active","scenario_hash":"c4eba8d510c0414eec9459b2426e048bac883cf23754637fb3e967d62f6de305","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:41.567008182Z"},{"index":6,"name":"place-search-choice 7: Escape closes the suggestion list","scenario_hash":"dd472ee0ad7248c5fb1db6a8145511e6fe288f2c9fd25c114fbd117884feaf55","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:41.567008182Z"},{"index":7,"name":"place-search-choice 8: choosing a suggestion keeps the basemap and the bbox","scenario_hash":"ba7d99af1eb577d650ad49a0397e1523dca6c36960cd7985983e645c9be478d0","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:41.567008182Z"}]}
# acceptance-mutation-manifest-end

# place-search-choice
Feature: Place search choice
  Choosing a suggestion moves the map to it. If GeoNames gives the
  suggestion an extent, the map shows that extent. Otherwise the map is
  centred on the suggestion, at zoom 12 for a place and zoom 17 for an
  address. The search field then holds the name of the suggestion, the
  suggestion list closes, and no search is made for that name. Choosing a
  suggestion changes neither the basemap nor the bbox.
  The user chooses a suggestion by clicking it, or by making it active with
  the arrow keys and pressing Enter. The down arrow makes the next
  suggestion active, or the first one when the last one or none is active.
  The up arrow makes the previous suggestion active, or the last one when
  the first one or none is active. Enter chooses nothing while no
  suggestion is active. Escape closes the suggestion list.
  A closed suggestion list shows no suggestion and no message.
  A point on the map is written longitude, latitude. An extent is written
  west, south, east, north. An extent whose west is greater than its east
  crosses the 180° meridian: the map shows it across that meridian, and its
  east is then written beyond 180.
  To pause is to stop typing for one second. To search for a text is to type
  or erase characters until the search field holds that text, then pause.
  The application has started with a GeoNames username. A step that says
  what GeoNames finds gives everything GeoNames finds for every search.
  Unless a step says otherwise, GeoNames finds places and no address, and
  gives no extent.

  Background:
    Given the application has started

  # place-search-choice 1
  Scenario Outline: place-search-choice 1: choosing a suggestion without an extent centres the map on it
    Given GeoNames finds <kind> at <position>
    When the user searches for Gre
    And the user clicks suggestion 1
    Then the map is centred on <centre> at zoom <zoom>

    Examples:
      | kind        | position          | centre            | zoom |
      | a place     | 5.71667, 45.16667 | 5.71667, 45.16667 | 12   |
      | an address  | 5.72867, 45.19290 | 5.72867, 45.19290 | 17   |

  # place-search-choice 2
  Scenario Outline: place-search-choice 2: choosing a suggestion with an extent shows that extent
    Given GeoNames finds a place with the extent <extent>
    When the user searches for Gre
    And the user clicks suggestion 1
    Then the map shows the extent <shown_extent>

    # Rows 1 to 3 are a country, a department and a town. Row 4 crosses the
    # 180° meridian.
    Examples:
      | extent                          | shown_extent                   |
      | -5.14, 41.33, 9.56, 51.09       | -5.14, 41.33, 9.56, 51.09      |
      | 4.74, 44.70, 6.36, 45.88        | 4.74, 44.70, 6.36, 45.88       |
      | 5.68, 45.15, 5.75, 45.21        | 5.68, 45.15, 5.75, 45.21       |
      | 177.12, -20.68, -178.42, -12.48 | 177.12, -20.68, 181.58, -12.48 |

  # place-search-choice 3
  Scenario Outline: place-search-choice 3: a chosen suggestion fills the search field and closes the list
    Given GeoNames finds the place <name>
    When the user searches for Gre
    And the user clicks suggestion 1
    And the user pauses
    Then the search field reads <field_text>
    And the suggestion list is closed
    And the only search made is for Gre

    Examples:
      | name     | field_text |
      | Grenoble | Grenoble   |

  # place-search-choice 4
  Scenario Outline: place-search-choice 4: the arrow keys move the active suggestion round the list
    Given GeoNames finds <count> places
    When the user searches for Gre
    And the user presses the <arrow> arrow <presses> times in the search field
    Then the suggestions active after each press are <active_suggestions>

    # Each row presses one arrow round the whole list, from no active
    # suggestion back to the one it made active first.
    Examples:
      | count | arrow | presses | active_suggestions |
      | 3     | down  | 4       | 1, 2, 3, 1         |
      | 3     | up    | 4       | 3, 2, 1, 3         |

  # place-search-choice 5
  Scenario Outline: place-search-choice 5: Enter chooses the active suggestion
    Given GeoNames finds the places Grenoble, Grésy-sur-Aix, Grèce
    When the user searches for Gre
    And the user presses the down arrow 2 times in the search field
    And the user presses Enter in the search field
    Then the search field reads <field_text>
    And the suggestion list is closed

    Examples:
      | field_text    |
      | Grésy-sur-Aix |

  # place-search-choice 6
  Scenario Outline: place-search-choice 6: Enter chooses nothing while no suggestion is active
    Given GeoNames finds <count> places
    When the user searches for Gre
    And the user presses Enter in the search field
    Then the suggestion list shows <shown_count> suggestions
    And the search field reads <field_text>
    And the map has not moved

    Examples:
      | count | shown_count | field_text |
      | 3     | 3           | Gre        |

  # place-search-choice 7
  Scenario Outline: place-search-choice 7: Escape closes the suggestion list
    When the user searches for Gre
    And the user presses Escape in the search field
    Then the suggestion list is closed
    And the search field reads <field_text>
    And the map has not moved

    Examples:
      | field_text |
      | Gre        |

  # place-search-choice 8
  Scenario Outline: place-search-choice 8: choosing a suggestion keeps the basemap and the bbox
    Given the user chooses the basemap <basemap>
    And the user has captured a bbox
    When the user searches for Gre
    And the user clicks suggestion 1
    Then the basemap <basemap> is the only one selected
    And the previous bbox is kept

    Examples:
      | basemap       |
      | World Imagery |
