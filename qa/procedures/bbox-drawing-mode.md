# QA procedure: bbox drawing mode

Feature: the "Dessiner une emprise" button turns the drawing mode on and off;
while it is on, a drag on the map draws a rectangle instead of moving the map;
Escape leaves it.

Every step is done in the browser, on the built application. Requests to tile
servers are answered locally with blank tiles, so the procedure does not
depend on the network, and the only thing drawn on the map is the bbox
rectangle: compare pictures of the map to see it.

## What the user sees

- "Dessiner une emprise" is a toggle button over the map. It is pressed while
  the drawing mode is on, and not pressed otherwise.
- The "Emprise" panel is a region over the map whose visible title is
  "Emprise". It shows the captured bbox, or "Aucune emprise".
- "Effacer l'emprise" is a button, shown only while a bbox exists.
- These labels are French. The map's own controls keep their current names,
  such as "Zoom in".
- C is the centre of the map. "Drag on the map from P to Q" means: press the
  mouse button at P, move to Q in small steps, pause, then release. Offsets
  are in pixels: C+(100,50) is 100 pixels right of C and 50 pixels below it.

## bbox-drawing-mode 1: the drawing mode is off when the application starts

1. Open the application.
2. Expect a "Dessiner une emprise" button over the map, not pressed, and the
   "Emprise" panel over the map.
3. Expect neither of them to cover the "Fonds de plan" panel, the "Zoom in"
   button, the map credits, the view indicator, or each other.
4. Expect the mouse cursor over the map not to be a crosshair.
5. Drag on the map from C to C+(100,0). Expect the view indicator to change:
   the map moved.

## bbox-drawing-mode 2: the drawing button turns the drawing mode on

1. Open the application.
2. Click "Dessiner une emprise". Expect it to be pressed.
3. Expect the mouse cursor over the map to be a crosshair.
4. Note the text of the view indicator. Drag on the map from C to
   C+(200,100). Expect the view indicator to read the noted text: the map did
   not move.

## bbox-drawing-mode 3: the drawing button turns the drawing mode off again

1. Open the application.
2. Click "Dessiner une emprise" twice. Expect it not to be pressed.
3. Expect the mouse cursor over the map not to be a crosshair.
4. Drag on the map from C to C+(100,0). Expect the view indicator to change,
   and the "Emprise" panel to still read "Aucune emprise".

## bbox-drawing-mode 4: Escape leaves the drawing mode

1. Open the application.
2. Using only the keyboard, press Tab until "Dessiner une emprise" has the
   focus, then press Enter. Expect it to be pressed.
3. Press Escape. Expect "Dessiner une emprise" not to be pressed, and the
   mouse cursor over the map not to be a crosshair.

## bbox-drawing-mode 5: Escape cancels the rectangle being drawn and keeps the previous bbox

1. Open the application.
2. Click "Dessiner une emprise" and drag on the map from C-(150,150) to
   C-(50,50). Note the text of the "Emprise" panel and the view indicator,
   and take a picture of the map.
3. Click "Dessiner une emprise". Press the mouse button at C+(50,50) and move
   it to C+(150,150) without releasing it. Expect the map to look different
   from the picture of step 2: a second rectangle follows the pointer.
4. Press Escape, then release the mouse button.
5. Expect "Dessiner une emprise" not to be pressed, the "Emprise" panel and
   the view indicator to read the texts noted at step 2, and the map to look
   like the picture of step 2: only the first rectangle is left.
