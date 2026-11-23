# bbox-clear
Feature: Bbox clearing
  The "Effacer l'emprise" button removes the bbox. It is offered only while a
  bbox exists. Without a bbox, the bbox panel reads "Aucune emprise".

  Background:
    Given the application has started

  # bbox-clear 1
  Scenario Outline: bbox-clear 1: without a bbox, the panel says so and clearing is not offered
    Then the bbox panel reads <bbox_text>
    And clearing the bbox is <clear_offer>
    And the map shows no rectangle

    Examples:
      | bbox_text      | clear_offer |
      | Aucune emprise | not offered |

  # bbox-clear 2
  Scenario Outline: bbox-clear 2: clearing is offered once a bbox is captured
    Given the user has captured a bbox
    Then clearing the bbox is <clear_offer>

    Examples:
      | clear_offer |
      | offered     |

  # bbox-clear 3
  Scenario Outline: bbox-clear 3: clearing removes the rectangle and empties the panel
    Given the user has captured a bbox
    When the user clears the bbox
    Then the bbox panel reads <bbox_text>
    And clearing the bbox is <clear_offer>
    And the map shows no rectangle

    Examples:
      | bbox_text      | clear_offer |
      | Aucune emprise | not offered |
