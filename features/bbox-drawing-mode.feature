# mutation-stamp: sha256=14c3a23d8ba785d06536c4d2dd0d9837b8866b881f21df9604f4ede095481696
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T11:04:07.827652617Z","feature_name":"Bbox drawing mode","feature_path":"features/bbox-drawing-mode.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:4bf1a27a57c273fa972ad2ad729a68be47a65a7ac5e280b34ca0e6483e0e2213","scenarios":[{"index":0,"name":"bbox-drawing-mode 1: the drawing mode is off when the application starts","scenario_hash":"226c9476000547e81b4683c592de2f09f2be4f6bae1a9ead1f32ef47d72d70c0","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:25.067378704Z"},{"index":1,"name":"bbox-drawing-mode 2: the drawing button turns the drawing mode on","scenario_hash":"ac5ee8015e35f40f272afb86d1405421123b30b89d9a37ebee7f59b374256055","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:25.067378704Z"},{"index":2,"name":"bbox-drawing-mode 3: the drawing button turns the drawing mode off again","scenario_hash":"8cc9ba007ebe43c74d29ca60a5fd75de8d71c10c0eda4e074f824cd6ca1b127b","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:25.067378704Z"},{"index":3,"name":"bbox-drawing-mode 4: Escape leaves the drawing mode","scenario_hash":"6dee9a57a83189b278de80cdb8da0bd99269595ffafb07d69b996735a9c0af4f","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:25.067378704Z"},{"index":4,"name":"bbox-drawing-mode 5: Escape cancels the rectangle being drawn and keeps the previous bbox","scenario_hash":"a4dc562f04f290727b2ef94d8106c9173a81fdc76b2744248791bc188a97b02a","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:25.067378704Z"}]}
# acceptance-mutation-manifest-end

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
