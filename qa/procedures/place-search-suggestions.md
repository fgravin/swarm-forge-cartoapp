# QA procedure: place search suggestions

Feature: the suggestion list shows the address GeoNames found, then the
places, 8 suggestions at most. Each suggestion gives a name, a type and a
context. When GeoNames finds nothing, the search says "Aucun résultat".

Settings, controls and recorded answers: see `place-search-query.md`. To type
and to pause are defined there.

## place-search-suggestions 1: a place suggestion gives the place's name, type and context

Run the steps once for each row of the table. The places search for the
text typed finds only the place of the row, at latitude 45, longitude 5, with
the `name`, `toponymName`, `fcl`, `fcode`, `adminName1` and `countryName` of
the row. An empty region means that the answer has an empty `adminName1`.

1. Open the application. Click the search field.
2. Type the text of the row and pause.
3. Expect the suggestion list to show one suggestion. Expect it to read the
   name, the type and the context of the row, in that order, and no other
   region or country. When the context of the row is empty, expect it to
   read only the name and the type.

| Text | name                 | toponymName          | fcl | fcode | adminName1           | countryName        | Name                 | Type   | Context                      |
|------|----------------------|----------------------|-----|-------|----------------------|--------------------|----------------------|--------|------------------------------|
| Gre  | Grenoble             | Grenoble             | P   | PPLA3 | Auvergne-Rhône-Alpes | France             | Grenoble             | Ville  | Auvergne-Rhône-Alpes, France |
| Isè  | Isère                | Isère                | A   | ADM2  | Auvergne-Rhône-Alpes | France             | Isère                | Région | Auvergne-Rhône-Alpes, France |
| Auv  | Auvergne-Rhône-Alpes | Auvergne-Rhône-Alpes | A   | ADM1  | Auvergne-Rhône-Alpes | France             | Auvergne-Rhône-Alpes | Région | France                       |
| Grè  | Grèce                | Hellenic Republic    | A   | PCLI  |                      | Grèce              | Grèce                | Pays   |                              |
| Nou  | Nouvelle-Calédonie   | New Caledonia        | A   | PCLD  |                      | Nouvelle-Calédonie | Nouvelle-Calédonie   | Pays   |                              |
| Mon  | Mont Blanc           | Mont Blanc           | T   | MT    | Auvergne-Rhône-Alpes | France             | Mont Blanc           | Lieu   | Auvergne-Rhône-Alpes, France |
| Lac  | Lac Léman            | Lake Geneva          | H   | LK    | Genève               | Suisse             | Lac Léman            | Lieu   | Genève, Suisse               |
| Lon  | Londres              | London               | P   | PPLC  | England              | Royaume-Uni        | Londres              | Ville  | England, Royaume-Uni         |

The last row has no Gherkin row. It shows that a suggestion takes the name
GeoNames gives in French (`name`), not its main name (`toponymName`).

## place-search-suggestions 2: an address suggestion gives the address, its type and its context

The places search finds nothing (`{"totalResultsCount": 0, "geonames": []}`).
The address search finds the address of the recorded answer in
`place-search-query.md`: 4 Place Saint-André, Grenoble.

1. Open the application. Click the search field.
2. Type "4 place Saint-André Grenoble" and pause.
3. Expect the suggestion list to show one suggestion, reading
   "4 Place Saint-André, Grenoble", then "Adresse", then
   "Auvergne-Rhône-Alpes, France".

## place-search-suggestions 3: the address comes first, within 8 suggestions

The places search for "Gre" finds these 8 places, in this order, all of
class P and code PPL: Grenoble, Grésy-sur-Aix, Gréoux-les-Bains, Grenade,
Greenwich, Grenchen, Gresse-en-Vercors, Grez-Doiceau. The address search
finds 4 Place Saint-André, Grenoble.

1. Open the application. Click the search field.
2. Type "Gre" and pause.
3. Expect 8 suggestions: first "4 Place Saint-André, Grenoble", of type
   "Adresse", then the first 7 places above, in their order. Expect no
   "Grez-Doiceau".

## place-search-suggestions 4: the list shows 8 places at most

The places search for "Gre" finds the 8 places of place-search-suggestions 3,
then a ninth place, Grézieu-la-Varenne. GeoNames does not answer more rows than
`maxRows`; this made-up answer checks that the list stops at 8 anyway. The
address search finds no address.

1. Open the application. Click the search field.
2. Type "Gre" and pause.
3. Expect 8 suggestions: the 8 places of place-search-suggestions 3, in their
   order. Expect no "Grézieu-la-Varenne".

## place-search-suggestions 5: the search says so when GeoNames finds nothing

The places search finds nothing (`{"totalResultsCount": 0, "geonames": []}`),
and the address search answers `{}`.

1. Open the application. Click the search field.
2. Type "Gre" and pause.
3. Expect "Aucun résultat" right under the search field, as a status, and
   no option on the page.
