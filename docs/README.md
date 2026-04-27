# Pink Oregon Trail — public files

This folder is what GitHub Pages serves at the project URL. Visit the
URL with no path and the game opens directly in the browser.

## What's here

- **`index.html`** — the game itself. A single self-contained file. Once
  it loads in your browser, the game runs offline. Save data (Trail
  Journals, leaderboard scores, persistent graves) lives in your
  browser's local storage, on your device, never sent anywhere.
- **`rules.html`** — the printable rules booklet. Pair it with the
  physical board for tabletop play; useful for explaining mechanics
  to a teacher or visiting friend.
- **`board_short_tile_*.html` / `board_extended_tile_*.html`** —
  printable board tiles. The Short trail uses one tile, the Extended
  trail uses six (A through F, decorated and blank variants). Print
  on letter paper, tape together, play in person.

## What this folder does NOT contain

- Source JSON, NOTES, BUILD_REPORTs, test scripts, or amendment
  specifications — those live at the repo root for the development
  workflow. They're not needed to play the game and are gitignored
  out of `docs/` to keep the public URL tidy.

## Updating the deployment

Whenever a new version of the game ships at the repo root,
`docs/index.html` is refreshed by copying the latest
`pink_oregon_trail.html` over it and pushing the commit. GitHub Pages
rebuilds within a minute. Players refresh their browser tab and get
the new version.

The game is by Gabby Kasdaglis (designer) and Nicholas Kasdaglis
(engineer). The trail journal voice draws from real 1840s pioneer
diaries. The historical content is grounded in academic sources,
designed for sixth-grade Westward Expansion units.
