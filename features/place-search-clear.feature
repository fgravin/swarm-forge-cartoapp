# place-search-clear
Feature: Place search clear
  The "Effacer" button empties the search field and closes the suggestion
  list, without moving the map. It is offered only while the search field
  holds text. Once the search field is emptied, no search is made for what
  it held, and no answer to such a search is shown.
  A closed suggestion list shows no suggestion and no message.
  To pause is to stop typing for one second. To search for a text is to type
  or erase characters until the search field holds that text, then pause.
  The application has started with a GeoNames username. Unless a step says
  otherwise, GeoNames answers each search at once, and finds places and no
  address.

  Background:
    Given the application has started

  # place-search-clear 1
  Scenario Outline: place-search-clear 1: clearing the search is offered only while the search field holds text
    Then clearing the search is <offer_before_typing>
    When the user types G
    Then clearing the search is <offer_after_typing>

    Examples:
      | offer_before_typing | offer_after_typing |
      | not offered         | offered            |

  # place-search-clear 2
  Scenario Outline: place-search-clear 2: clearing the search empties the field and closes the list without moving the map
    Given the user has searched for Gre
    When the user clears the search
    Then the search field is empty
    And the suggestion list is closed
    And the map has not moved
    And clearing the search is <offer>

    Examples:
      | offer       |
      | not offered |

  # place-search-clear 3
  Scenario: place-search-clear 3: clearing the search before the pause makes no search
    When the user types Gre
    And the user clears the search
    And the user pauses
    Then no search has been made

  # place-search-clear 4
  Scenario: place-search-clear 4: clearing the search ignores the answer still to come
    Given GeoNames answers each search only when told to
    When the user searches for Gre
    And the user clears the search
    And GeoNames answers the search for Gre
    Then the suggestion list is closed
