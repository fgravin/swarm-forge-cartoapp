# mutation-stamp: sha256=c6bdc7e4560fb4697d1f74d1a995ffc3f949094cb71ed56b5c7bb90fc86494bf
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:07.292588095Z","feature_name":"Bbox capture","feature_path":"features/bbox-capture.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:c1ef660a63ad9ece4b84810fbefcc4885a9902dc5c089237034dcc97773d41c8","scenarios":[{"index":4,"name":"bbox-capture 5: a drag must be at least 3 pixels wide and high to capture a bbox","scenario_hash":"1a2cbf65bd45b1ddc0e7871e0c182329703c21223de49caa41d2752747d0b154","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:28:59.623642502Z"},{"index":0,"name":"bbox-capture 1: the drawn rectangle becomes the bbox, whatever the drawing direction","scenario_hash":"16a92dd1c7f876e832bea762fbd8e2d566654034be687efb5a19dd71cabb8282","mutation_count":18,"result":{"Total":18,"Killed":18,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:21.935188571Z"},{"index":1,"name":"bbox-capture 2: capturing a bbox leaves its rectangle on the map and ends the drawing mode","scenario_hash":"f7e7fe3e4e08e182db24e551e7a6a1fddfb8a75a7863cf193360f944b3badf63","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:21.935188571Z"},{"index":2,"name":"bbox-capture 3: the rectangle follows the pointer while it is drawn","scenario_hash":"23066025af281b51d9718c319b3de2adc49966a5e816b7fc46835d77df2db23b","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:21.935188571Z"},{"index":3,"name":"bbox-capture 4: a new bbox replaces the previous one","scenario_hash":"1662a97f5375b3542ede9ddadc0faddc4d6d16ab40139792217a26ae204ef817","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:21.935188571Z"}]}
# acceptance-mutation-manifest-end

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
    When the user drags on the map across <min_size> by <min_size> pixels less one pixel of width
    Then the previous bbox is kept
    And the drawing mode is on
    When the user drags on the map across <min_size> by <min_size> pixels less one pixel of height
    Then the previous bbox is kept
    And the drawing mode is on
    When the user clicks on the map
    Then the previous bbox is kept
    And the drawing mode is on
    When the user drags on the map across <min_size> by <min_size> pixels
    Then the previous bbox is replaced
    And the drawing mode is off

    # min_size is the smallest drag that captures a bbox: one pixel less in
    # either direction, or a click, captures nothing.
    Examples:
      | min_size |
      | 3        |
