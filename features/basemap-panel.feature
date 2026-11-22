# mutation-stamp: sha256=43232bce18e1eff7aadb8a9e8744bbe81a1cf674d670e0e83b91a81ddac1a8e7
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-22T12:21:55.222280179Z","feature_name":"Basemap panel","feature_path":"features/basemap-panel.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:321dfd32f48d11248e0d561e383a92f72feaef0c8e4a37b344d5bad0b49b7306","scenarios":[{"index":0,"name":"basemap-panel 1: the panel offers each basemap under its provider","scenario_hash":"371237615373e211bb7fdd94ab3cd4cad09b3339731f15636698b0ec5374cc51","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-11-22T12:21:55.222280179Z"},{"index":1,"name":"basemap-panel 2: the panel offers no other basemap","scenario_hash":"e818378137603211a206be895832f6e4348816b5e9b7ed472a9fb955fe435ad6","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-22T12:21:55.222280179Z"}]}
# acceptance-mutation-manifest-end

# basemap-panel
Feature: Basemap panel
  The "Fonds de plan" panel offers the basemaps the user can choose from,
  grouped by provider. Provider and basemap names are the providers' own.

  Background:
    Given the application has started

  # basemap-panel 1
  Scenario Outline: basemap-panel 1: the panel offers each basemap under its provider
    Then group <group_position> of the basemap panel is <provider>
    And basemap <basemap_position> of the <provider> group is <basemap>

    Examples:
      | group_position | provider | basemap_position | basemap               |
      | 1              | CARTO    | 1                | Positron              |
      | 1              | CARTO    | 2                | Dark Matter           |
      | 2              | Esri     | 1                | World Imagery         |
      | 2              | Esri     | 2                | World Topographic Map |

  # basemap-panel 2
  Scenario Outline: basemap-panel 2: the panel offers no other basemap
    Then the basemap panel offers <basemap_count> basemaps in <group_count> groups

    Examples:
      | basemap_count | group_count |
      | 4             | 2           |
