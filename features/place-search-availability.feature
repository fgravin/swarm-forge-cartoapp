# place-search-availability
Feature: Place search availability
  If GeoNames cannot answer a search, or refuses it, the search shows the
  message "Recherche indisponible" instead of suggestions. A later search
  that GeoNames answers shows its suggestions again.
  GeoNames cannot answer when it cannot be reached, or when it answers with
  an HTTP error. It refuses a search by answering with HTTP 200 and a status
  other than 15, such as 10 (authentication) or 18, 19 and 20 (daily, hourly
  and weekly credits exhausted). The status 15, no result found, is not a
  refusal: GeoNames found nothing.
  To pause is to stop typing for one second. To search for a text is to type
  or erase characters until the search field holds that text, then pause.
  The application has started with a GeoNames username.

  Background:
    Given the application has started

  # place-search-availability 1
  Scenario Outline: place-search-availability 1: a search that GeoNames cannot answer or refuses is unavailable
    Given GeoNames <failure> the <service> search
    When the user searches for Gre
    Then the search shows the message <message>

    # The places search asks for the places whose name starts with the text;
    # the address search asks for the address that matches it.
    Examples:
      | failure       | service | message                |
      | refuses       | places  | Recherche indisponible |
      | refuses       | address | Recherche indisponible |
      | cannot answer | places  | Recherche indisponible |
      | cannot answer | address | Recherche indisponible |

  # place-search-availability 2
  Scenario Outline: place-search-availability 2: the status 15 means that GeoNames found nothing
    Given GeoNames answers every search with the status 15, no result found
    When the user searches for Gre
    Then the search shows the message <message>

    Examples:
      | message        |
      | Aucun résultat |

  # place-search-availability 3
  Scenario Outline: place-search-availability 3: a later search that GeoNames answers shows its suggestions
    Given GeoNames cannot answer any search
    And the user has searched for Gre
    When GeoNames can answer again, and finds the place <name>
    And the user searches for Gren
    Then the suggestion list shows only <shown_place>

    Examples:
      | name     | shown_place |
      | Grenoble | Grenoble    |
