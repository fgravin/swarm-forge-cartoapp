# QA procedure: layer opacity

Feature: the opacity slider of a layer, "Opacité de <title>", sets its
opacity from 0 to 100 % by steps of 5 % and shows the value. The map
follows at once. The opacity is 100 % when the application starts, and it
is kept when the layer is hidden and shown again.

Settings, controls and recorded documents: see `layer-panel.md`. C and how
to drag are defined in `bbox-drawing-mode.md`. The GetMap tiles of layer 1
are opaque blue, so the colour of the map at C shows the layer's opacity.

## layer-opacity 1: every layer is fully opaque when the application starts

1. Open the application.
2. Expect the three opacity sliders to read "100 %".

## layer-opacity 2: the slider sets the opacity by steps of 5 %, from 0 to 100 %

1. Open the application. Take a picture of the map. Show layer 1, and wait
   until the map at C is blue. Take a picture of the map.
2. Give the focus to "Opacité de CORINE Land Cover - France métropolitaine -
   2018". Press the left arrow once. Expect it to read "95 %".
3. Press the left arrow 12 more times. Expect it to read "35 %", and the map
   at C, at once, to look neither like the first picture nor like the
   second: a mix of the basemap and blue.
4. Press the left arrow 8 more times. Expect it to read "0 %", and the map to
   look like the first picture.
5. Press the right arrow twice. Expect "10 %". Press End. Expect "100 %",
   and the map to look like the second picture. Press the right arrow.
   Expect "100 %" still.
6. Drag the slider's thumb with the mouse along the slider. Expect it to
   read only multiples of 5, followed by " %".

## layer-opacity 3: the opacity is kept when the layer is hidden and shown again

1. Open the application. Show layer 3.
2. Press the left arrow 12 times on "Opacité de Parcs suisses (Zones)".
   Expect it to read "40 %". Take a picture of the map.
3. Hide layer 3, then show it again. Wait until the map has requested its
   tiles again, if it does.
4. Expect the slider to read "40 %", and the map to look like the picture of
   step 2.

## layer-opacity 4: an opacity set while the layer is hidden applies when it is shown

1. Open the application. Take a picture of the map.
2. Press the left arrow 10 times on "Opacité de Carte lithologique simplifiée
   au 1/1 000 000". Expect it to read "50 %", and the map to look like the
   picture of step 1: the layer is still hidden.
3. Show layer 2.
4. Expect the map at C to be a mix of the basemap and red, not pure red.
