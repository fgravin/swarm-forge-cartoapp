# QA procedure: layer legend

Feature: the "Légende" button of a layer unfolds or folds, under the layer,
the legend image its server declares, described as "Légende de <title>" and
asked over HTTPS. If the image does not load, or if no legend is declared,
the legend reads "Légende indisponible".

Settings, controls and recorded documents: see `layer-panel.md`.

## layer-legend 1: every legend is folded when the application starts

1. Open the application.
2. Expect the three "Légende" buttons to have `aria-expanded` `false`, and no
   image described as "Légende de …" on the page.

## layer-legend 2: the legend button unfolds the legend image the server declares

Run the steps once for each layer.

1. Open the application.
2. Press the layer's "Légende" button.
3. Expect `aria-expanded` to be `true`, and, under the layer's controls, an
   image of 40 × 60 pixels described as "Légende de <title>".
4. Expect the image to have been asked at the legend URL of the layer's
   capabilities document, over `https://`. For the BRGM, whose document
   declares the legend over `http://`, expect the same URL over `https://`,
   and no request to an `http://` URL.
5. Expect the layer's eye button to be as before step 2: not pressed.

## layer-legend 3: the legend button folds the legend again

1. Open the application. Press the "Légende" button of layer 2. Expect its
   legend image.
2. Press it again.
3. Expect `aria-expanded` to be `false`, and no image described as "Légende
   de Carte lithologique simplifiée au 1/1 000 000" on the page.

## layer-legend 4: a legend image that does not load is unavailable

The legend request of layer 1 is answered with HTTP 404.

1. Open the application. Press the "Légende" button of layer 1.
2. Expect, under the layer's controls, "Légende indisponible", and no broken
   image.

## layer-legend 5: a layer without a declared legend has its legend unavailable

The BRGM's recorded capabilities document has no `LegendURL` for its layer.

1. Open the application. Press the "Légende" button of layer 2.
2. Expect, under the layer's controls, "Légende indisponible", and no legend
   request to the BRGM.
