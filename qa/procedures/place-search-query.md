# QA procedure: place search query

Feature: the search field of the header searches GeoNames for the places and
the address matching what the user typed, once the field holds at least 3
characters and the user has stopped typing for 300 milliseconds; only the
answer for the text the field holds is shown.

Every step is done in the browser, in a 1280 × 720 window, on the application
built with `VITE_GEONAMES_USERNAME=carto-qa`. `carto-qa` is a made-up
username: no request reaches GeoNames. Requests to tile servers are answered
locally with blank tiles. Requests to GeoNames are answered locally with the
recorded answers the procedure gives, and their URLs are recorded in order.

## What the user sees

- The header holds the title "Carto App" and, right of it, the search field:
  a combobox named "Rechercher un lieu ou une adresse", which shows that text
  while it is empty.
- The suggestion list is a listbox that opens right under the search field.
  The search field's `aria-expanded` is `true` while the list is open, and
  `false` otherwise. Each suggestion is an option that reads, in this order,
  its name, its type ("Pays", "Région", "Ville", "Lieu" or "Adresse"), and
  its context: region, then country, such as "Auvergne-Rhône-Alpes, France".
- The keyboard focus stays in the search field while the user moves through
  the suggestions. The active suggestion is the option that the search
  field's `aria-activedescendant` names. It is marked selected
  (`aria-selected="true"`) and is highlighted.
- In place of the list, a message appears right under the search field: "Aucun
  résultat" or "Recherche indisponible". It is a status, announced by screen
  readers.
- "Effacer" is a button next to the search field. It is shown only while the
  field holds text.
- These labels are French.

## How GeoNames is asked

- The places search for a text T is a GET request to
  `https://secure.geonames.org/searchJSON` with the parameters
  `name_startsWith=T`, `orderby=relevance`, `maxRows=8`, `lang=fr`,
  `inclBbox=true` and `username=carto-qa`, in any order.
- The address search for T is a GET request to
  `https://secure.geonames.org/geoCodeAddressJSON` with `q=T` and
  `username=carto-qa`.
- A search for T is the two of them. "No search" means no request to
  `secure.geonames.org` at all.
- To type T is to type it one key at a time, 100 ms apart. To pause is to wait
  one second without typing.

## The recorded answers

A places answer has the shape of a real GeoNames answer. Latitudes,
longitudes and bbox values are numbers written as strings. `bbox` is present
only when the procedure gives the place an extent.

```json
{"totalResultsCount": 1, "geonames": [
  {"name": "Grenoble", "toponymName": "Grenoble", "fcl": "P", "fcode": "PPLA3",
   "adminName1": "Auvergne-Rhône-Alpes", "countryName": "France", "countryCode": "FR",
   "lat": "45.16667", "lng": "5.71667"}]}
```

An address answer is written in the format of GeoNames' address services
below. **This format has not been checked against a real answer** (see
`tasks/us3-recherche-geonames.md`). If a real answer shows another format,
the recorded answers change with it, and so does this procedure.

```json
{"address": {"houseNumber": "4", "street": "Place Saint-André", "locality": "Grenoble",
  "postalcode": "38000", "adminName1": "Auvergne-Rhône-Alpes", "countryCode": "FR",
  "lat": "45.19290", "lng": "5.72867"}}
```

Unless the procedure says otherwise, every places search finds Grenoble as
above, and every address search finds no address and answers `{}`.

## place-search-query 1: a search is made once the user has stopped typing

1. Open the application. Click the search field.
2. Type "Grenoble". Note the time of the last key.
3. Expect no search to have started before 250 ms after the last key.
4. Within one second of the last key, expect exactly one places search and
   one address search, both for "Grenoble".
5. Expect the places search to carry `orderby=relevance`, `maxRows=8`,
   `lang=fr`, `inclBbox=true` and `username=carto-qa`, and the address search
   `username=carto-qa`, both to `https://secure.geonames.org`.

## place-search-query 2: a search needs at least 3 characters

1. Open the application. Click the search field.
2. Type "Gr" and pause. Expect no search, and the search field's
   `aria-expanded` not to be `true`.
3. Type "e" and pause. Expect exactly one search, for "Gre", and the
   suggestion list to be open, showing "Grenoble".

## place-search-query 3: erasing below 3 characters closes the suggestion list

1. Open the application. Click the search field, type "Gre" and pause.
   Expect the suggestion list to be open.
2. Press Backspace and pause.
3. Expect the suggestion list to be closed, no option and no message on the
   page, and no search other than the one for "Gre".

## place-search-query 4: a late answer to an earlier text is ignored

Hold the answers to the search for "Gre" until step 4. The places search for
"Gre" finds Grèce (class A, code PCLI, no region, country Grèce, latitude 39,
longitude 22). The places search for "Gren" finds Grenoble.

1. Open the application. Click the search field, type "Gre" and pause.
2. Type "n" and pause. Expect the suggestion list to show only "Grenoble".
3. Expect a search for "Gre" and one for "Gren".
4. Let the held answers for "Gre" through. Wait one second.
5. Expect the suggestion list to still show only "Grenoble": no "Grèce".

## place-search-query 5: a late answer is ignored once the search field holds less than 3 characters

Hold the answers to the search for "Gre" until step 3.

1. Open the application. Click the search field, type "Gre" and pause.
2. Press Backspace and pause.
3. Let the held answers through. Wait one second.
4. Expect the suggestion list to be closed, with no option and no message on
   the page.

## place-search-query 6: the search field sits in the header and follows the combobox pattern

This procedure has no Gherkin scenario: only the browser can show it.

1. Open the application.
2. Expect the search field to lie inside the header, entirely right of the
   "Carto App" title, and not to cover it.
3. Expect the search field to be enabled, empty, and showing "Rechercher un
   lieu ou une adresse", with `aria-expanded` `false`.
4. Using only the keyboard, press Tab until the search field has the focus.
   Type "Gre" and pause. Expect `aria-expanded` to be `true`, and the
   search field's `aria-controls` to name the listbox of the suggestions.
5. Expect the suggestion list to be drawn over the map and its panels and
   to be fully visible: no part of it lies behind the map, the "Fonds de
   plan" panel or the "Dessiner une emprise" button.
