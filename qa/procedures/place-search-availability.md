# QA procedure: place search availability

Feature: when GeoNames cannot answer a search or refuses it, the search shows
"Recherche indisponible", and the rest of the application goes on working. A
later search that GeoNames answers shows its suggestions. GeoNames refuses
by answering HTTP 200 with a `status` object. The status 15, no result
found, means it found nothing.

Settings, controls and recorded answers: see `place-search-query.md`. To type
and to pause are defined there.

## place-search-availability 1: a search that GeoNames cannot answer or refuses is unavailable

Run the steps once for each row of the table. The search of the row gets the
answer of the row. The other search gets its usual answer.

1. Open the application. Note the text of the view indicator.
2. Click the search field, type "Gre" and pause.
3. Expect "Recherche indisponible" right under the search field, as a status,
   and no option on the page.
4. Drag on the map from C to C+(100,0). Expect the view indicator to change.
   (C and how to drag are defined in `bbox-drawing-mode.md`.)
5. In the "Fonds de plan" panel, choose "World Imagery". Expect it to be the
   only checked basemap, and the map to request World Imagery tiles.
6. Click "Dessiner une emprise" and drag on the map from C-(100,100) to
   C+(100,100). Expect the "Emprise" panel to show a bbox.

| Search  | Answer                                                                                                     |
|---------|------------------------------------------------------------------------------------------------------------|
| places  | HTTP 200, `{"status": {"message": "the daily limit of 20000 credits for carto-qa has been exceeded. Please throttle your requests or use the commercial service.", "value": 18}}` |
| address | HTTP 200, `{"status": {"message": "user account not enabled to use the free webservice. Please enable it on your account page: https://www.geonames.org/manageaccount ", "value": 10}}` |
| places  | the request fails: no answer, the connection is aborted                                                    |
| address | HTTP 503, an empty body                                                                                    |

## place-search-availability 2: the status 15 means that GeoNames found nothing

Both searches answer HTTP 200,
`{"status": {"message": "no result found", "value": 15}}`.

1. Open the application. Click the search field, type "Gre" and pause.
2. Expect "Aucun résultat" right under the search field, and no "Recherche
   indisponible".

## place-search-availability 3: a later search that GeoNames answers shows its suggestions

The searches for "Gre" fail: the connections are aborted. The searches for
"Gren" get the usual answers: Grenoble, and no address.

1. Open the application. Click the search field, type "Gre" and pause.
2. Expect "Recherche indisponible".
3. Type "n" and pause.
4. Expect the suggestion list to show only "Grenoble", and no "Recherche
   indisponible".
