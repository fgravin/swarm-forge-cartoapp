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
