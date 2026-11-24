# mutation-stamp: sha256=8c1980df2c0b215081008f80089b88838000b4d9e148d3e03dcfff67e00fd3a2
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:20.144807020Z","feature_name":"Place search availability","feature_path":"features/place-search-availability.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:e6afcaaf3aacc9d36446f16d4095ce269d9f7f1127d859ff6f31fb18085914a8","scenarios":[{"index":0,"name":"place-search-availability 1: a search that GeoNames cannot answer or refuses is unavailable","scenario_hash":"28eff37d8a7a2730ef5f0fd5343b96aa7546bdeb26e3a0855a84421d3786df8d","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:27.897037389Z"},{"index":1,"name":"place-search-availability 2: the status 15 means that GeoNames found nothing","scenario_hash":"a7166483eb492a292e5014d0248b0ec9ff7befa788226f64438c0e1467012185","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:27.897037389Z"},{"index":2,"name":"place-search-availability 3: a later search that GeoNames answers shows its suggestions","scenario_hash":"5360c31812e13a96adba50886f6e83de9253338d7bd3f5135492c0cd53180d73","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:27.897037389Z"}]}
# acceptance-mutation-manifest-end

# place-search-availability
Feature: Place search availability
  If GeoNames cannot answer a search, or refuses it, the search shows the
  message "Recherche indisponible" instead of suggestions. A later search
  that GeoNames answers shows its suggestions again. The rest of the
  application goes on working.
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
