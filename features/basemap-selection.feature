# mutation-stamp: sha256=3dc26ec63c6e2ca5e959aaa407f6647d2510fe6bab11c1e1fb461b817e1949b1
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-23T11:28:58.614500652Z","feature_name":"Basemap selection","feature_path":"features/basemap-selection.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:2faa02f94eb115ef838bb58055b4a5cc095883c6d6be638bb9a0ea83d82d3b12","scenarios":[{"index":0,"name":"basemap-selection 1: Positron is selected when the application starts","scenario_hash":"31726862c7835f5396f18e92ee543dd4e9243eae047acdd0776dc2f28edb184d","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-11-22T12:22:07.518662653Z"},{"index":1,"name":"basemap-selection 2: choosing a basemap selects it alone","scenario_hash":"047eaf20c58691eeae0de5f5bcaf8b06870d83b5e2ad9e140183f0b1a77646aa","mutation_count":10,"result":{"Total":10,"Killed":10,"Survived":0,"Errors":0},"tested_at":"2026-11-22T12:22:07.518662653Z"},{"index":2,"name":"basemap-selection 3: changing the basemap keeps the view","scenario_hash":"35f04839c73a58136d0a6030528c413c80e1110ca41612ff2aead27313ac7808","mutation_count":5,"result":{"Total":5,"Killed":5,"Survived":0,"Errors":0},"tested_at":"2026-11-22T12:22:07.518662653Z"}]}
# acceptance-mutation-manifest-end

# basemap-selection
Feature: Basemap selection
  One basemap is selected at a time. The application opens on Positron, and
  choosing another basemap replaces it without moving the map.
  In a tile URL, {a,b,c,d} stands for four tile servers, one per letter, in
  that order.

  Background:
    Given the application has started

  # basemap-selection 1
  Scenario Outline: basemap-selection 1: Positron is selected when the application starts
    Then the basemap <basemap> is the only one selected
    And the map draws raster tiles only from <tile_url>
    And the map credits only <attribution>

    Examples:
      | basemap  | tile_url                                                           | attribution                          |
      | Positron | https://{a,b,c,d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png | © OpenStreetMap contributors © CARTO |

  # basemap-selection 2
  Scenario Outline: basemap-selection 2: choosing a basemap selects it alone
    Given the user chooses the basemap <previous_basemap>
    When the user chooses the basemap <basemap>
    Then the basemap <basemap> is the only one selected

    Examples:
      | previous_basemap      | basemap               |
      | Positron              | Dark Matter           |
      | Dark Matter           | World Imagery         |
      | World Imagery         | World Topographic Map |
      | World Topographic Map | Positron              |
      | Dark Matter           | Dark Matter           |

  # basemap-selection 3
  Scenario Outline: basemap-selection 3: changing the basemap keeps the view
    Given the map has been moved to latitude <latitude>, longitude <longitude>, zoom <zoom>
    When the user chooses the basemap <basemap>
    Then the view indicator reads <view_description>

    Examples:
      | latitude | longitude | zoom | basemap       | view_description                   |
      | -34.6037 | -58.3816  | 11   | World Imagery | 34.6037° S, 58.3816° W · zoom 11.0 |
