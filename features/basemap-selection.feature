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
