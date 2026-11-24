# QA procedure: place search clear

Feature: the "Effacer" button empties the search field and closes the
suggestion list, without moving the map. It is shown only while the field
holds text. Clearing the field drops the search under way.

Settings, controls and recorded answers: see `place-search-query.md`. To type
and to pause are defined there.

## place-search-clear 1: clearing the search is offered only while the search field holds text

1. Open the application.
2. Expect no "Effacer" button on the page.
3. Click the search field and type "G".
4. Expect an "Effacer" button next to the search field.

## place-search-clear 2: clearing the search empties the field and closes the list without moving the map

1. Open the application. Note the text of the view indicator.
2. Click the search field, type "Gre" and pause. Expect the suggestion list
   to be open.
3. Click "Effacer".
4. Expect the search field to be empty, showing "Rechercher un lieu ou une
   adresse", `aria-expanded` to be `false`, and no option on the page.
5. Expect no "Effacer" button on the page, and the view indicator to read the
   text noted at step 1.

## place-search-clear 3: clearing the search before the pause makes no search

1. Open the application. Click the search field.
2. Type "Gre", and click "Effacer" at once, within 100 ms of the last key.
3. Pause.
4. Expect no search, and the search field to be empty.

## place-search-clear 4: clearing the search ignores the answer still to come

Hold the answers to the search for "Gre" until step 3.

1. Open the application. Click the search field, type "Gre" and pause.
2. Click "Effacer".
3. Let the held answers through. Wait one second.
4. Expect the search field to be empty, `aria-expanded` to be `false`, and
   no option and no message on the page.
