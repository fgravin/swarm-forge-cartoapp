# place-search-configuration
Feature: Place search configuration
  The application searches GeoNames with the GeoNames username given, when
  the application is built, by the environment variable
  VITE_GEONAMES_USERNAME. Without a username, the search field is disabled
  and shows the hint "Recherche non configurée". An empty username is no
  username.
  To search for a text is to type characters until the search field holds
  that text, then stop typing for one second.

  # place-search-configuration 1
  Scenario Outline: place-search-configuration 1: without a GeoNames username, the search is disabled
    Given the application has started without a GeoNames username
    Then the search field is <field_state>
    And the search field shows the hint <hint>

    Examples:
      | field_state | hint                     |
      | disabled    | Recherche non configurée |

  # place-search-configuration 2
  Scenario Outline: place-search-configuration 2: GeoNames is searched with the configured username
    Given the application has started with the GeoNames username <username>
    When the user searches for Gre
    Then every search was made with the GeoNames username <searched_username>

    Examples:
      | username | searched_username |
      | carto-qa | carto-qa          |
