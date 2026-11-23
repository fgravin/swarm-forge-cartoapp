# mutation-stamp: sha256=7fd5cd0b6e61f14a916d5038bf411ba9433df6fe9dc4b80db63c31865bac2f4c
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-23T11:29:00.433104698Z","feature_name":"Bbox georeference","feature_path":"features/bbox-georeference.feature","background_hash":"ff0761cf3e9b3a4da69a9b72f9640b97af1ea8824b3e748720dee988ec16f1b0","implementation_hash":"sha256:4da36f4a71e995809d7772d33aeef4ca037dd463cac3aade35284d34e6463ca2","scenarios":[{"index":0,"name":"bbox-georeference 1: moving and zooming the map keeps the bbox in place","scenario_hash":"9073f2125f2f39eaec085329455f41334515f36f66d0cf0eada7976cc4e1ac14","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:26.739193706Z"},{"index":1,"name":"bbox-georeference 2: changing the basemap keeps the bbox","scenario_hash":"36bf7cd6da55352c6eac9b70ba9bfb8d1bc5857cbeb8e8ded7fffa5e72f0ba1a","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:26.739193706Z"}]}
# acceptance-mutation-manifest-end

# bbox-georeference
Feature: Bbox georeference
  A bbox is a place on the Earth, not on the screen. Moving or zooming the
  map, or changing its basemap, leaves the bbox and its rectangle as they
  were. A point on the map is written longitude, latitude; a rectangle is
  written west, south, east, north.

  Background:
    Given the application has started
    And the user has turned the drawing mode on

  # bbox-georeference 1
  Scenario Outline: bbox-georeference 1: moving and zooming the map keeps the bbox in place
    Given the user drags on the map from <start_corner> to <end_corner>
    When the user moves and zooms the map
    Then the bbox panel reads <bbox_text>
    And the map shows the rectangle <bbox_text>

    Examples:
      | start_corner      | end_corner        | bbox_text                            |
      | 5.71234, 45.12345 | 6.01234, 45.56789 | 5.71234, 45.12345, 6.01234, 45.56789 |

  # bbox-georeference 2
  Scenario Outline: bbox-georeference 2: changing the basemap keeps the bbox
    Given the user drags on the map from <start_corner> to <end_corner>
    When the user chooses the basemap <basemap>
    Then the bbox panel reads <bbox_text>
    And the map shows the rectangle <bbox_text>

    Examples:
      | start_corner      | end_corner        | basemap       | bbox_text                            |
      | 2.40000, 48.90000 | 2.30000, 48.80000 | World Imagery | 2.30000, 48.80000, 2.40000, 48.90000 |
