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
