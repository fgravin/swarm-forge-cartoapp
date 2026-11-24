# mutation-stamp: sha256=ab4fa59685cfc46d57ab850649468cca1c5f088bfaa7686b7912000092afbf43
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-11-24T10:35:19.312118532Z","feature_name":"Bbox clearing","feature_path":"features/bbox-clear.feature","background_hash":"e5bed71706d72c3c3e3c34780b7efb78f6b18cc2828695d5e5876656d395d975","implementation_hash":"sha256:0b454b0495ceeb40e71e5db56ce6aaff79df38677c98f7e62aa0d146b710d7cf","scenarios":[{"index":0,"name":"bbox-clear 1: without a bbox, the panel says so and clearing is not offered","scenario_hash":"6747c872834f32b6fb675685f9b1c8a39c1a81beefa35320ca8c13126002fd24","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:23.445826831Z"},{"index":1,"name":"bbox-clear 2: clearing is offered once a bbox is captured","scenario_hash":"9201907789369f32615a5fe58314531a0e9ba4c86ba60f21a591540f9cf93aa8","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:23.445826831Z"},{"index":2,"name":"bbox-clear 3: clearing removes the rectangle and empties the panel","scenario_hash":"2c66dfb1f65214458bc899890186d8fa75f09ac3e3cbec6c5c7210ad9ef3ccf0","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-11-23T11:26:23.445826831Z"}]}
# acceptance-mutation-manifest-end

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
