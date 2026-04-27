# Deploy Pink Oregon Trail to a URL — for Nicholas

This guide gets Pink Oregon Trail hosted at a real URL so Gabby (and anyone she shares the link with) can play in any browser without setup. The USB drive keeps working as a backup for the school's offline Chromebook.

You don't need Gabby to know anything about git or developer tools. She just types a URL, the game opens, she plays. Updates you push from your machine appear at the URL within a minute.

---

## Recommended option — GitHub Pages (free, 5 minutes)

You already have a GitHub repo at `nkasdaglis/pink-oregon-trail`. GitHub Pages turns it into a website. Anyone with the URL can play.

### Step 1 — Restructure the repo so the public-facing files are isolated

Right now the repo root has a mix of dev artifacts (NOTES files, JSON, test scripts, board tile HTMLs, amendment markdowns) and the game itself (`pink_oregon_trail.html`). If GitHub Pages serves the root, visitors see the file listing — which is fine but messy.

Cleaner structure: move public-facing files to a `docs/` folder. The dev artifacts stay at the repo root.

In PowerShell, from your project folder:

```powershell
$proj = "$HOME\pink-oregon-trail"
Set-Location $proj

# Make a docs folder
New-Item -ItemType Directory -Force -Path docs

# The game's public-facing assets — copy to docs (keep originals at root for dev workflow)
Copy-Item "pink_oregon_trail.html" "docs\index.html" -Force

# Optional: also publish the rules booklet and board tiles for sharing
if (Test-Path "pink_oregon_trail_rules.html") {
  Copy-Item "pink_oregon_trail_rules.html" "docs\rules.html" -Force
}
if (Test-Path "board_short_tile_*.html") {
  Copy-Item "board_short_tile_*.html" "docs\" -Force
  Copy-Item "board_extended_tile_*.html" "docs\" -Force
}

# If you've added historical photos via fetch_historical_photos.py,
# they're already inlined in pink_oregon_trail.html — nothing extra to copy.
```

Renaming `pink_oregon_trail.html` to `index.html` inside the docs folder is intentional — when someone visits the URL with no path, GitHub Pages serves `index.html` automatically. So the URL `gabbystrail.example.com` opens the game directly.

### Step 2 — Enable GitHub Pages

In your browser:

1. Go to https://github.com/nkasdaglis/pink-oregon-trail/settings/pages
2. Under "Source," select **Deploy from a branch**
3. Under "Branch," pick **main** and folder **/docs**
4. Click **Save**

GitHub will start building the site. Wait 60-90 seconds.

### Step 3 — Get Gabby's URL

After the first build, GitHub Pages settings shows a green check and a URL like:

```
https://nkasdaglis.github.io/pink-oregon-trail/
```

That's Gabby's URL. She types it in any browser (Safari, Chrome, Edge, Firefox), the game loads, she plays. No login. No setup. No internet required AFTER the page loads — once the HTML is in her browser, the game runs offline (the trail journals, leaderboard scores, etc. all live in browser storage on her device).

You can write the URL on a sticky note for her, save it as a bookmark, or set it as her browser homepage.

### Step 4 — Updating the game

When you ship a new version (v2.5, v2.6, etc.):

```powershell
$proj = "$HOME\pink-oregon-trail"
Set-Location $proj

# Refresh the public file from the dev workspace
Copy-Item "pink_oregon_trail.html" "docs\index.html" -Force

# Commit and push
git add docs
git commit -m "Deploy v2.6 to GitHub Pages"
git push origin main
```

GitHub Pages rebuilds within 60 seconds. Gabby refreshes her browser tab and gets the new version.

If you want to automate this so it happens on every commit, you can add a GitHub Actions workflow — but the manual copy-and-push is fine for now.

---

## What about a memorable URL?

`nkasdaglis.github.io/pink-oregon-trail/` is fine but not memorable. If you want something like `gabbystrail.com` or `pinkoregontrail.com`:

1. Buy the domain (Namecheap, Cloudflare, Porkbun — about $10-12/year)
2. In GitHub Pages settings, add the custom domain
3. Add a CNAME record at your domain registrar pointing to `nkasdaglis.github.io`
4. Wait 10-15 minutes for DNS propagation
5. Done — `gabbystrail.com` now serves your game

This is optional. The github.io URL works perfectly fine. Save the custom domain idea for if Gabby wants to share the game with friends and a clean name matters.

---

## Privacy and what kids see

GitHub Pages with a public repo means anyone who finds the URL can play. The game itself collects nothing — no accounts, no analytics, no cookies. Save data lives in the player's own browser via localStorage. No information leaves their device.

If you want to keep the URL private (only people you share with can find it), you'd need a private repo with GitHub Pro (about $4/month per account). For most Gabby-and-her-friends use cases, the free public URL is fine — random people don't browse for niche fan-made Oregon Trail games.

There are NO ads. There is no monetization. There is no tracking. The game is the same one Gabby plays from a USB drive — just delivered over the web instead of from a flash drive.

---

## What if the school WiFi blocks GitHub?

Some school networks block github.io domains as a category. If that happens at Gabby's school:

- The USB-drive deployment still works — the school can't block a file on a flash drive
- Or you can host on Cloudflare Pages instead (different domain, often not in school blocklists), which is also free and works the same way
- Or your own domain (`gabbystrail.com`) is much harder for school networks to block category-wise since it's a unique domain not associated with any "user content host"

This is probably not an issue but worth knowing the fallbacks.

---

## Alternative — Cloudflare Pages

If you'd rather use Cloudflare than GitHub for hosting (some people prefer it):

1. Go to https://pages.cloudflare.com
2. Sign in (free account)
3. Connect your GitHub repo
4. Build settings: framework "None", build command empty, output directory `docs`
5. Save and deploy

Cloudflare gives you a URL like `pink-oregon-trail.pages.dev`. Same workflow — push to main, deploys automatically. Free. Often faster than GitHub Pages.

You can use BOTH simultaneously if you want — same code, two URLs. Doesn't cost anything extra.

---

## Recommended Gabby workflow

1. **Home:** Gabby uses the URL on the family iPad / her laptop / your phone. Save data persists across sessions on each device.
2. **School:** Gabby brings the USB stick. Same game, just delivered locally because school WiFi may be locked. Save data is separate (each device has its own localStorage), but the game is identical.
3. **Friend's house:** Gabby texts the URL. Friend opens in any browser. Plays. Easy.
4. **Showing teacher:** URL or USB, whichever is easier. Print the rules booklet (the v2.3 deliverable) to put alongside the physical board.

---

## Setup checklist

- [ ] Run the PowerShell snippet in Step 1 (create docs/, copy index.html)
- [ ] Commit and push the docs folder: `git add docs && git commit -m "Set up GitHub Pages deployment" && git push origin main`
- [ ] Visit github.com/nkasdaglis/pink-oregon-trail/settings/pages
- [ ] Set source to main branch, /docs folder
- [ ] Wait 60-90 seconds for the first build
- [ ] Visit the URL shown (https://nkasdaglis.github.io/pink-oregon-trail/) and verify the game loads
- [ ] Save the URL as a bookmark on Gabby's devices
- [ ] (Optional) Set up custom domain if you want a memorable URL

That's it. Total setup time: 5-10 minutes. Total cost: free.
