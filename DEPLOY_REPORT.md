# Pink Oregon Trail — Deployment Report

**Deployed:** 2026-04-27.

## What was set up

Created a `docs/` folder at the repo root and copied the public-facing
files into it. GitHub Pages will serve this folder.

**Files placed in `docs/`:**
- `index.html` — copy of the latest `pink_oregon_trail.html` (renamed
  so GitHub Pages serves it at the URL root with no path needed). Game
  is currently at the v2.5 build state (Stage 5 included; Monte Carlo
  median 99 days; 50/50 headless tests passing).
- `rules.html` — copy of `pink_oregon_trail_rules.html` (printable
  rules booklet).
- `board_short_tile_A_blank.html`, `board_short_tile_A_decorated.html`
  — Short trail tile, both variants.
- `board_extended_tile_A_blank.html` … `_F_decorated.html` — six
  Extended trail tiles, blank and decorated variants each.
- `README.md` — explains what the folder hosts and how to update on
  the next release.

**Repo `.gitignore` updated** to keep dev artifacts (`docs/.claude/`,
`docs/NOTES_v*.md`, `docs/BUILD_REPORT_v*.md`) out of the public docs
folder by convention.

**Commit:** `deploy: GitHub Pages setup serving docs/ folder`. Pushed
to `main`.

## Manual step still required (Nicholas)

GitHub Pages won't activate automatically — you need to flip the
switch in the repo settings:

1. Visit <https://github.com/nkasdaglis/pink-oregon-trail/settings/pages>
2. Under **Source**, select **Deploy from a branch**
3. Under **Branch**, pick `main` and folder `/docs`
4. Click **Save**
5. Wait 60-90 seconds for the first build

After the build completes, the URL will be:

> **<https://nkasdaglis.github.io/pink-oregon-trail/>**

That's Gabby's URL. Bookmark it on her devices, share it with her
class, etc. The game runs offline once loaded — no network needed
during play.

## Updating after future releases

```sh
cp pink_oregon_trail.html docs/index.html
git add docs
git commit -m "Deploy v2.6 to GitHub Pages"
git push origin main
```

GitHub Pages rebuilds within a minute. Players refresh their tab.

## Privacy notes

The deployment is on a public repo, so anyone with the URL can play.
The game itself has zero analytics, zero cookies, zero accounts —
all save data lives in the player's browser localStorage on their
own device. No information leaves the player's machine.
