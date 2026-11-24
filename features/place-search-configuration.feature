# mutation-stamp: sha256=452f7e22a26a9e841fe22f1220f82799b34d886593488c13d81935f158dee257
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:21.148205974Z","feature_name":"Place search configuration","feature_path":"features/place-search-configuration.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"sha256:0079f4434a257bd9ae8cf9435ea887bf0096d70bc0fefa4cc6b055636ae7810c","scenarios":[{"index":0,"name":"place-search-configuration 1: without a GeoNames username, the search is disabled","scenario_hash":"9e09f3b9f49113d457a6dbd65901514e30a2345f4dc64922d3de3aa771640ba7","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:44.351544338Z"},{"index":1,"name":"place-search-configuration 2: GeoNames is searched with the configured username","scenario_hash":"4902313b83c45582f2e6f7c33eb9ac7e4cd3b5b9da19efd21c37337733e04ed5","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-24T10:29:44.351544338Z"}]}
# acceptance-mutation-manifest-end

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
