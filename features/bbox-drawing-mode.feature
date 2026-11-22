# bbox-drawing-mode
Feature: Bbox drawing mode
  The "Dessiner une emprise" button turns the drawing mode on and off. While
  the drawing mode is on, a drag on the map draws a rectangle instead of
  moving the map. Escape leaves the drawing mode.
  A previous bbox is kept when the bbox panel still reads it and the map
  shows its rectangle and no other.

  Background:
    Given the application has started

  # bbox-drawing-mode 1
  Scenario Outline: bbox-drawing-mode 1: the drawing mode is off when the application starts
    Then the drawing mode is <drawing_mode>

    Examples:
      | drawing_mode |
      | off          |

  # bbox-drawing-mode 2
  Scenario Outline: bbox-drawing-mode 2: the drawing button turns the drawing mode on
    When the user presses the drawing button
    Then the drawing mode is <drawing_mode>

    Examples:
      | drawing_mode |
      | on           |

  # bbox-drawing-mode 3
  Scenario Outline: bbox-drawing-mode 3: the drawing button turns the drawing mode off again
    Given the user has turned the drawing mode on
    When the user presses the drawing button
    Then the drawing mode is <drawing_mode>

    Examples:
      | drawing_mode |
      | off          |

  # bbox-drawing-mode 4
  Scenario Outline: bbox-drawing-mode 4: Escape leaves the drawing mode
    Given the user has turned the drawing mode on
    When the user presses Escape
    Then the drawing mode is <drawing_mode>

    Examples:
      | drawing_mode |
      | off          |

  # bbox-drawing-mode 5
  Scenario Outline: bbox-drawing-mode 5: Escape cancels the rectangle being drawn and keeps the previous bbox
    Given the user has captured a bbox
    And the user has turned the drawing mode on
    And the user has started dragging a rectangle on the map
    When the user presses Escape
    Then the drawing mode is <drawing_mode>
    And the previous bbox is <previous_bbox_outcome>

    Examples:
      | drawing_mode | previous_bbox_outcome |
      | off          | kept                  |
