# place-search-query
Feature: Place search query
  The search field of the header searches GeoNames for what the user types.
  A search for a text asks GeoNames for the places whose name starts with
  that text and for the address that matches it. A search is made once the
  search field holds at least 3 characters and the user has stopped typing
  for 300 milliseconds. The suggestion list shows only the answer to the
  search for the text the search field holds: an answer to an earlier text
  is ignored, whenever it arrives.
  A closed suggestion list shows no suggestion and no message.
  To pause is to stop typing for one second. To search for a text is to type
  or erase characters until the search field holds that text, then pause.
  The application has started with a GeoNames username. Unless a step says
  otherwise, GeoNames answers each search at once, and finds places and no
  address.

  Background:
    Given the application has started

  # place-search-query 1
  Scenario Outline: place-search-query 1: a search is made once the user has stopped typing
    When the user types Grenoble one character every <delay> milliseconds less one
    And the user waits <delay> milliseconds less one
    Then no search has been made
    When the user waits one more millisecond
    Then the only search made is for Grenoble

    Examples:
      | delay |
      | 300   |

  # place-search-query 2
  Scenario Outline: place-search-query 2: a search needs at least 3 characters
    When the user types the first <min_length> characters of Grenoble less one and pauses
    Then no search has been made
    When the user types the next character and pauses
    Then the only search made is for the first <min_length> characters of Grenoble

    Examples:
      | min_length |
      | 3          |

  # place-search-query 3
  Scenario Outline: place-search-query 3: erasing below 3 characters closes the suggestion list
    Given the user has searched for the first <min_length> characters of Grenoble
    When the user erases the last character and pauses
    Then the suggestion list is closed
    And the only search made is for the first <min_length> characters of Grenoble

    Examples:
      | min_length |
      | 3          |

  # place-search-query 4
  Scenario Outline: place-search-query 4: a late answer to an earlier text is ignored
    Given GeoNames answers each search only when told to
    When the user searches for Gre
    And the user searches for Gren
    And GeoNames answers the search for Gren with the place <place>
    And GeoNames answers the search for Gre
    Then the suggestion list shows only <shown_place>

    Examples:
      | place    | shown_place |
      | Grenoble | Grenoble    |

  # place-search-query 5
  Scenario: place-search-query 5: a late answer is ignored once the search field holds less than 3 characters
    Given GeoNames answers each search only when told to
    When the user searches for Gre
    And the user erases the last character and pauses
    And GeoNames answers the search for Gre
    Then the suggestion list is closed
