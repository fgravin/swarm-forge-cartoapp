# bbox-capture
Feature: Bbox capture
  In the drawing mode, a drag on the map draws a rectangle that follows the
  pointer, and releasing the pointer captures that rectangle as the bbox.
  The bbox panel shows the bbox in WGS84 decimal degrees (EPSG:4326), in the
  order west, south, east, north, with 5 decimals, whatever the direction of
  the drag. A point on the map is written longitude, latitude; a rectangle
  is written west, south, east, north.
  A drag less than 3 pixels wide or less than 3 pixels high captures
  nothing. A drag between two points whose size in pixels is not given is
  large enough to capture.
  In a Given step, "a bbox" differs from every bbox of the examples. A
  previous bbox is kept when the bbox panel still reads it and the map shows
  its rectangle and no other. It is replaced when the bbox panel reads a new
  bbox and the map shows the new rectangle and no other.

  Background:
    Given the application has started

  # bbox-capture 1
  Scenario Outline: bbox-capture 1: the drawn rectangle becomes the bbox, whatever the drawing direction
    Given the user has turned the drawing mode on
    When the user drags on the map from <start_corner> to <end_corner>
    Then the bbox panel reads <bbox_text>

    # Rows 1 to 4 drag towards the north-east, south-west, south-east and
    # north-west. Rows 5 and 6 need rounding to 5 decimals.
    Examples:
      | start_corner           | end_corner           | bbox_text                                  |
      | 5.71234, 45.12345      | 6.01234, 45.56789    | 5.71234, 45.12345, 6.01234, 45.56789       |
      | 2.40000, 48.90000      | 2.30000, 48.80000    | 2.30000, 48.80000, 2.40000, 48.90000       |
      | -58.50000, -34.50000   | -58.30000, -34.70000 | -58.50000, -34.70000, -58.30000, -34.50000 |
      | 4.90000, 45.70000      | 4.80000, 45.80000    | 4.80000, 45.70000, 4.90000, 45.80000       |
      | 5.712341, 45.123449    | 6, 45.5678951        | 5.71234, 45.12345, 6.00000, 45.56790       |
      | -0.1234549, 51.5000049 | 0.1234551, 51.4      | -0.12345, 51.40000, 0.12346, 51.50000      |

  # bbox-capture 2
  Scenario Outline: bbox-capture 2: capturing a bbox leaves its rectangle on the map and ends the drawing mode
    Given the user has turned the drawing mode on
    When the user drags on the map from <start_corner> to <end_corner>
    Then the map shows the rectangle <rectangle>
    And the drawing mode is <drawing_mode>

    Examples:
      | start_corner      | end_corner        | rectangle                            | drawing_mode |
      | 6.01234, 45.12345 | 5.71234, 45.56789 | 5.71234, 45.12345, 6.01234, 45.56789 | off          |

  # bbox-capture 3
  Scenario Outline: bbox-capture 3: the rectangle follows the pointer while it is drawn
    Given the user has turned the drawing mode on
    When the user starts dragging on the map at <start_corner>
    And the user moves the pointer to <first_pointer_corner>
    Then the map shows the rectangle <first_rectangle>
    When the user moves the pointer to <second_pointer_corner>
    Then the map shows the rectangle <second_rectangle>
    And the bbox panel reads <bbox_text>

    Examples:
      | start_corner      | first_pointer_corner | first_rectangle                      | second_pointer_corner | second_rectangle                     | bbox_text      |
      | 5.71234, 45.12345 | 6.01234, 45.56789    | 5.71234, 45.12345, 6.01234, 45.56789 | 5.50000, 45.00000     | 5.50000, 45.00000, 5.71234, 45.12345 | Aucune emprise |

  # bbox-capture 4
  Scenario Outline: bbox-capture 4: a new bbox replaces the previous one
    Given the user has captured a bbox
    And the user has turned the drawing mode on
    When the user drags on the map from <start_corner> to <end_corner>
    Then the bbox panel reads <bbox_text>
    And the map shows the rectangle <bbox_text>

    Examples:
      | start_corner      | end_corner        | bbox_text                            |
      | 2.30000, 48.80000 | 2.40000, 48.90000 | 2.30000, 48.80000, 2.40000, 48.90000 |

  # bbox-capture 5
  Scenario Outline: bbox-capture 5: a drag must be at least 3 pixels wide and high to capture a bbox
    Given the user has captured a bbox
    And the user has turned the drawing mode on
    When the user drags on the map across <width> by <height> pixels
    Then the previous bbox is <previous_bbox_outcome>
    And the drawing mode is <drawing_mode>

    Examples:
      | width | height | previous_bbox_outcome | drawing_mode |
      | 2     | 3      | kept                  | on           |
      | 3     | 2      | kept                  | on           |
      | 0     | 0      | kept                  | on           |
      | 3     | 3      | replaced              | off          |
