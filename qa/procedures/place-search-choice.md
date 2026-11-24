# QA procedure: place search choice

Feature: choosing a suggestion, by a click or with the arrow keys and Enter,
moves the map to it. The map shows the suggestion's extent if GeoNames gives
one. Otherwise it centres the map on the suggestion, at zoom 12 for a place
and zoom 17 for an address. The search field then holds the suggestion's
name and the suggestion list closes. Escape closes the list. The basemap
and the bbox do not change.

Settings, controls and recorded answers: see `place-search-query.md`. To type
and to pause are defined there. The view indicator is at the bottom left of
the map. When the view indicator is said to read a text, wait until it stops
changing: the map may move there with an animation.

## place-search-choice 1: choosing a suggestion without an extent centres the map on it

Run the steps once for each row of the table. The answers are those of
`place-search-query.md`: the places search finds Grenoble, without an extent,
and the address search finds 4 Place Saint-André, Grenoble, only for the
row that types it.

1. Open the application. Click the search field.
2. Type the text of the row and pause.
3. Click the suggestion of the row.
4. Expect the view indicator to read the text of the row.

| Text                         | Suggestion                    | View indicator                       |
|------------------------------|-------------------------------|--------------------------------------|
| Gre                          | Grenoble                      | 45.1667° N, 5.7167° E · zoom 12.0    |
| 4 place Saint-André Grenoble | 4 Place Saint-André, Grenoble | 45.1929° N, 5.7287° E · zoom 17.0    |

## place-search-choice 2: choosing a suggestion with an extent shows that extent

Run the steps once for each row of the table. The places search for the text
typed finds only the place of the row, with the extent of the row as `bbox`.
The extent is written west, south, east, north.

1. Open the application. Click the search field.
2. Type the text of the row and pause. Click the suggestion.
3. Expect the view indicator to show a centre and a zoom within the ranges of
   the row.

| Text | Place  | Extent                          | Centre                                       | Zoom          |
|------|--------|---------------------------------|----------------------------------------------|---------------|
| Isè  | Isère  | 4.74, 44.70, 6.36, 45.88        | 45.25° N to 45.35° N, 5.50° E to 5.60° E     | 7.0 to 8.2    |
| Fid  | Fidji  | 177.12, -20.68, -178.42, -12.48 | 16.3° S to 16.9° S, 179.0° E to 179.7° E     | 5.0 to 6.0    |

The Fidji extent crosses the 180° meridian. A map that reads it as running
from 177.12° E westwards to 178.42° W shows nearly the whole world, centred
near 0.6° W, and fails this row.

## place-search-choice 3: a chosen suggestion fills the search field and closes the list

1. Open the application. Click the search field, type "Gre" and pause.
2. Note the number of searches made. Click "Grenoble". Pause.
3. Expect the search field to read "Grenoble", `aria-expanded` to be
   `false`, and no option on the page.
4. Expect no search made since step 2.

## place-search-choice 4: the arrow keys move the active suggestion round the list

Run the steps once for each row of the table. The places search for "Gre"
finds Grenoble, Grésy-sur-Aix and Grèce, in this order, all of class P and
code PPL.

1. Open the application. Note the text of the view indicator. Using only the
   keyboard, press Tab until the search field has the focus. Type "Gre" and
   pause.
2. Press the down arrow as many times as "Down" says, then the up arrow as
   many times as "Up" says.
3. Expect the search field to still have the focus, and the active suggestion
   to be the one the row names: named by `aria-activedescendant`, marked
   selected, and highlighted. Expect no other suggestion to be marked
   selected.
4. Expect the view indicator to read the text noted at step 1: the arrow keys
   moved through the suggestions, not the map.

| Down | Up | Active        |
|------|----|---------------|
| 1    | 0  | Grenoble      |
| 3    | 0  | Grèce         |
| 4    | 0  | Grenoble      |
| 0    | 1  | Grèce         |
| 2    | 1  | Grenoble      |
| 1    | 1  | Grèce         |

## place-search-choice 5: Enter chooses the active suggestion

The places search for "Gre" finds the places of place-search-choice 4.
Grésy-sur-Aix is at latitude 45.72060, longitude 5.92830, without an extent.

1. Open the application. Using only the keyboard, press Tab until the search
   field has the focus. Type "Gre" and pause.
2. Press the down arrow twice, then Enter.
3. Expect the search field to read "Grésy-sur-Aix", `aria-expanded` to be
   `false`, and the view indicator to read
   `45.7206° N, 5.9283° E · zoom 12.0`.

## place-search-choice 6: Enter chooses nothing while no suggestion is active

The places search for "Gre" finds the places of place-search-choice 4.

1. Open the application. Note the text of the view indicator.
2. Click the search field, type "Gre" and pause. Press Enter.
3. Expect the suggestion list to still show its 3 suggestions, none marked
   selected, the search field to read "Gre", and the view indicator to read
   the text noted at step 1.

## place-search-choice 7: Escape closes the suggestion list

1. Open the application. Note the text of the view indicator.
2. Click the search field, type "Gre" and pause. Press the down arrow once,
   then Escape.
3. Expect `aria-expanded` to be `false`, no option on the page, the search
   field to read "Gre", and the view indicator to read the text noted at step
   1: Escape chose nothing.

## place-search-choice 8: choosing a suggestion keeps the basemap and the bbox

C and how to drag are defined in `bbox-drawing-mode.md`.

1. Open the application. In the "Fonds de plan" panel, choose "World Imagery".
2. Click "Dessiner une emprise" and drag on the map from C-(100,100) to
   C+(100,100). Note the text of the "Emprise" panel.
3. Click the search field, type "Gre" and pause. Click "Grenoble".
4. Expect the view indicator to read `45.1667° N, 5.7167° E · zoom 12.0`,
   "World Imagery" to be the only checked basemap, and the "Emprise" panel
   to read the text noted at step 2.
