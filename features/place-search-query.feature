# mutation-stamp: sha256=8f6b26d234ed1a9f801ab1a9f0015f7f1a3e5b416259c1e27d4968e0385e9fe6
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T10:35:25.239206049Z","feature_name":"Place search query","feature_path":"features/place-search-query.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:9e96dc90bc5fd317edde485b0463e3da575197a94d57ecf1366c44dda94e90cb","scenarios":[{"index":0,"name":"place-search-query 1: a search is made once the user has stopped typing","scenario_hash":"d7fc0548efaccc6977d6e7085d478065df2b2c557e6f66e821364d6506104cdd","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:46.714218041Z"},{"index":1,"name":"place-search-query 2: a search needs at least 3 characters","scenario_hash":"f48e2176151401acc5ac97b0612c1d8625610aa4e3616f00ef4ad87b2dc73ef3","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:46.714218041Z"},{"index":2,"name":"place-search-query 3: erasing below 3 characters closes the suggestion list","scenario_hash":"bd5ef8224744b37c551b26bc61f07cd502c5df6623d45ba9c53167fade5a0df1","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:46.714218041Z"},{"index":3,"name":"place-search-query 4: a late answer to an earlier text is ignored","scenario_hash":"35a41e871b89a79fb3e60d16300c841855d927fd36015c23d0c1286048579936","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:46.714218041Z"}]}
# acceptance-mutation-manifest-end

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
