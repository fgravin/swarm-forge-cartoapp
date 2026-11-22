# QA procedure: bbox capture

Feature: in the drawing mode, a drag on the map draws a rectangle that follows
the pointer; releasing it captures the bbox, shown in the "Emprise" panel as
west, south, east, north in WGS84 degrees with 5 decimals.

Every step is done in the browser, on the built application. Requests to tile
servers are answered locally with blank tiles, so the only thing drawn on the
map is the bbox rectangle: compare pictures of the map to see it. See
`bbox-drawing-mode.md` for the controls, C, and how to drag.

At the initial view (centre 45.5646° N, 5.9178° E, zoom 5), a 200-pixel
square centred on C covers about west 3.72053, south 44.00522, east 8.11507,
north 47.08187. A position on the screen is known to about half a pixel, so
compare those values within 0.02.

## bbox-capture 1: the drawn rectangle becomes the bbox, whatever the drawing direction

Run the steps once for each row of the table.

1. Open the application.
2. Click "Dessiner une emprise".
3. Drag on the map from "From" to "To".
4. Expect the "Emprise" panel to read four numbers with exactly 5 decimals,
   separated by a comma and a space: west, south, east, north, as in
   `5.71234, 45.12345, 6.01234, 45.56789`.
5. Expect them to match, within 0.02, `3.72053, 44.00522, 8.11507, 47.08187`.
   Expect the four rows to give the same text.

| Direction  | From          | To            |
|------------|---------------|---------------|
| north-east | C+(-100,100)  | C+(100,-100)  |
| south-west | C+(100,-100)  | C+(-100,100)  |
| south-east | C+(-100,-100) | C+(100,100)   |
| north-west | C+(100,100)   | C+(-100,-100) |

## bbox-capture 2: capturing a bbox leaves its rectangle on the map and ends the drawing mode

1. Open the application. Take a picture of the map.
2. Click "Dessiner une emprise" and drag on the map from C+(100,-100) to
   C+(-100,100).
3. Expect "Dessiner une emprise" not to be pressed, and the mouse cursor over
   the map not to be a crosshair.
4. Expect the map to look different from the picture of step 1 on the edges
   of the dragged square, and the same well outside it: the rectangle stays
   where it was drawn.
5. Drag on the map from C to C+(100,0). Expect the view indicator to change:
   the map moves again.

## bbox-capture 3: the rectangle follows the pointer while it is drawn

1. Open the application.
2. Click "Dessiner une emprise".
3. Press the mouse button at C and move it to C+(100,100) without releasing
   it. Expect the map to show a rectangle between C and the pointer, and the
   "Emprise" panel to read "Aucune emprise". Take a picture of the map.
4. Still without releasing, move the mouse to C-(100,100). Expect the map to
   look different from the picture of step 3: the rectangle now lies between
   C and the pointer, above and to the left of C.
5. Release the mouse button. Expect the "Emprise" panel to show a bbox.

## bbox-capture 4: a new bbox replaces the previous one

1. Open the application. Take a picture of the map.
2. Click "Dessiner une emprise" and drag on the map from C-(150,150) to
   C-(50,50). Note the text of the "Emprise" panel.
3. Click "Dessiner une emprise" and drag on the map from C+(50,50) to
   C+(150,150).
4. Expect the "Emprise" panel to read a bbox different from the text noted at
   step 2.
5. Expect the map, around the square of step 2, to look like the picture of
   step 1 again, and to show the new rectangle: there is only one rectangle.

## bbox-capture 5: a drag must be at least 3 pixels wide and high to capture a bbox

Run the steps once for each row of the table.

1. Open the application.
2. Click "Dessiner une emprise" and drag on the map from C-(150,150) to
   C-(50,50). Note the text of the "Emprise" panel.
3. Click "Dessiner une emprise".
4. Drag on the map from C to C+("Width","Height"). For 0 by 0, click at C.
5. Expect the "Emprise" panel and "Dessiner une emprise" to be as the table
   says.

| Width | Height | "Emprise" panel                | "Dessiner une emprise" |
|-------|--------|--------------------------------|------------------------|
| 2     | 3      | the text noted at step 2       | pressed                |
| 3     | 2      | the text noted at step 2       | pressed                |
| 0     | 0      | the text noted at step 2       | pressed                |
| 3     | 3      | a bbox other than that text    | not pressed            |

## bbox-capture 6: a bbox can be drawn by touch

This procedure has no Gherkin scenario: only the browser can show it.

1. Open the application on a touch screen.
2. Tap "Dessiner une emprise".
3. Touch the map at C+(-100,100), slide the finger to C+(100,-100), then lift
   it.
4. Expect the "Emprise" panel to read the bbox of bbox-capture 1, within
   0.02, "Dessiner une emprise" not to be pressed, and the view indicator to
   read the same text as before step 3: the map did not move.
