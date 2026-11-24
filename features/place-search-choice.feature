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
    And the user presses the down arrow <down_presses> times in the search field
    And the user presses the up arrow <up_presses> times in the search field
    Then suggestion <active> is active

    Examples:
      | count | down_presses | up_presses | active |
      | 3     | 1            | 0          | 1      |
      | 3     | 3            | 0          | 3      |
      | 3     | 4            | 0          | 1      |
      | 3     | 0            | 1          | 3      |
      | 3     | 2            | 1          | 1      |
      | 3     | 1            | 1          | 3      |

  # place-search-choice 5
  Scenario Outline: place-search-choice 5: Enter chooses the active suggestion
    Given GeoNames finds the places <names>
    When the user searches for Gre
    And the user presses the down arrow <down_presses> times in the search field
    And the user presses Enter in the search field
    Then the search field reads <field_text>
    And the suggestion list is closed

    Examples:
      | names                          | down_presses | field_text    |
      | Grenoble, Grésy-sur-Aix, Grèce | 2            | Grésy-sur-Aix |

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
