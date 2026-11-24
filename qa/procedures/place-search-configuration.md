# QA procedure: place search configuration

Feature: the application searches GeoNames with the username given by
`VITE_GEONAMES_USERNAME` when it is built. Without it, the search field is
disabled and shows "Recherche non configurée". The username is never
committed.

Controls and recorded answers: see `place-search-query.md`. To type and to
pause are defined there. This procedure builds the application itself, as
each step says.

## place-search-configuration 1: without a GeoNames username, the search is disabled

Run the steps once with `VITE_GEONAMES_USERNAME` unset, and once with it set to
the empty string.

1. Build and serve the application with `VITE_GEONAMES_USERNAME` as the run
   says. Open it in a 1280 × 720 window.
2. Expect the search field, named "Rechercher un lieu ou une adresse", to be
   disabled and to show "Recherche non configurée".
3. Click the search field and type "Gre". Pause.
4. Expect the search field to still be empty, and no request to
   `secure.geonames.org`.
5. Drag on the map from C to C+(100,0), as `bbox-drawing-mode.md` defines it.
   Expect the view indicator to change. In the "Fonds de plan" panel, choose
   "World Imagery". Expect it to be the only checked basemap.

## place-search-configuration 2: GeoNames is searched with the configured username

1. Build and serve the application with `VITE_GEONAMES_USERNAME=carto-qa`.
   Open it in a 1280 × 720 window.
2. Click the search field, type "Gre" and pause.
3. Expect every request to `secure.geonames.org` to carry `username=carto-qa`.

## place-search-configuration 3: the username is kept out of the repository

This procedure has no Gherkin scenario: it checks the repository, not the
application.

1. In the project directory, run `git check-ignore -q .env.local`. Expect it to
   succeed: `.env.local`, where a developer writes their username, is ignored.
2. Run `git ls-files .env .env.local`. Expect it to print nothing.
3. Run `git grep -n "VITE_GEONAMES_USERNAME="`. Expect it to print nothing:
   no username is assigned in a committed file.
