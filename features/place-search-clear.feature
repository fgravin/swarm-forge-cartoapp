# mutation-stamp: sha256=8626ea246e737ebc10a0fcb3fde9739e8bb2be043f47f941fcc5c528cd6ee851
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:20.790996832Z","feature_name":"Place search clear","feature_path":"features/place-search-clear.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:bf61ba76c8c1633fd959120b2d7e0df44ac31779651ca290f31306bd418c7a38","scenarios":[{"index":0,"name":"place-search-clear 1: clearing the search is offered only while the search field holds text","scenario_hash":"2cd167cb083618b67b31f248b5402c89345d8ec15b1119d49f955d6c2bc4f8e0","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:42.824003120Z"},{"index":1,"name":"place-search-clear 2: clearing the search empties the field and closes the list without moving the map","scenario_hash":"99d1c67b1f081e67640150975ff62487f6b8a696aa9362b9c32baf075214447b","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:42.824003120Z"}]}
# acceptance-mutation-manifest-end

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
