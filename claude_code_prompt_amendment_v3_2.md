# Claude Code Prompt — Pink Oregon Trail v3.2

**Theme of this amendment:** Real economy with strategic tradeoffs, period units (lbs/gallons/dollars), gendered language fixed, photos for many more landmarks/events, day/night actually working.

This amendment is **large**. It has SEVEN stages. Treat each stage as discrete — finish stage N and verify before starting N+1. **No git commits during the build**; append "git work pending" to the build report. Nicholas commits manually.

---

## Standing instructions (re-confirm before starting)

- Single self-contained `pink_oregon_trail.html`. Vanilla HTML/CSS/JS only. No frameworks.
- Period 1840s voice for narration. No words "AI", "Claude", "GPT", "LLM", "model", "agent", "chatbot" anywhere user-facing.
- Works offline from USB drive (no external requests). Tested target: a school Chromebook on a flaky network.
- After all stages complete: deploy to `docs/play.html` and `docs/index.html` references unchanged.

---

# Stage 0 — Diagnose what currently exists

Before writing any code, do this audit:

1. `grep -n "data-time\|setTimeOfDayFromWagon" pink_oregon_trail.html` — list line numbers.
2. `grep -n 'class="region-backdrop"\|class="scene-backdrop"' pink_oregon_trail.html` — list line numbers.
3. `grep -n "outerHTML.*scene-backdrop\|sceneryFor.*scene-backdrop" pink_oregon_trail.html` — list line numbers.

You should find this code path in `paintScenery`:
```js
bg.outerHTML = sceneryFor(region).replace('<svg ', '<svg id="scene-backdrop" class="scene-backdrop" data-region="..." data-winter="..." ');
```

**Confirmed bug**: `_bgFrame()` returns `<svg class="region-backdrop" ...>`. The `.replace()` call replaces `class="region-backdrop"` with `class="scene-backdrop"` — destroying the `region-backdrop` class. All CSS rules of the form `:root[data-time="X"] .region-backdrop .atmosphere` then fail to match. Result: the atmosphere `<rect>` has no fill and renders as black/transparent above the silhouettes.

Report the line numbers found in your build report so Nicholas can verify.

---

# Stage 1 — Fix sky / day-night cycle

In `paintScenery` (find by `function paintScenery(w)`), change the outerHTML replacement so it adds `scene-backdrop` as an additional class instead of replacing `region-backdrop`:

**Before:**
```js
if (bg) bg.outerHTML = sceneryFor(region).replace('<svg ', '<svg id="scene-backdrop" class="scene-backdrop" data-region="' + region.toLowerCase().replace(/\s+/g, '_') + '" data-winter="' + winterFlag + '" ');
```

**After:**
```js
if (bg) bg.outerHTML = sceneryFor(region).replace(
  /<svg class="region-backdrop"/,
  '<svg id="scene-backdrop" class="region-backdrop scene-backdrop" data-region="' + region.toLowerCase().replace(/\s+/g, '_') + '" data-winter="' + winterFlag + '"'
);
```

The other call site (line ~9065 in v3.1.1) similarly replaces `<svg `; update it the same way.

**Acceptance**: Open the game, select Short trail, push on a few times. Confirm sky transitions between morning (warm cream), midday (blue), afternoon (golden), and dusk (pink) over the journey. The atmosphere should be visibly above the silhouetted ground in every region.

---

# Stage 2 — Letters home: gender-neutral language

Find every dispatch/letter narrative template. Search:
```
grep -nE 'Your son|your son|My son|Dear son|Dearest son' pink_oregon_trail.html
```

Replace with neutral alternatives:

| Replace | With |
|---|---|
| `Your loving son` | `Yours always` |
| `Your son,` | `With love,` |
| `My dear son` | `My dear one` |
| `your son` | `your child` |
| `Dear Mother` | (unchanged — neutral) |
| `Dear Father` | (unchanged — neutral) |
| `your boy` | `your child` |
| `our boy` | `our child` |

Also search for other gendered terms in narrative copy: `he is`, `his hat`, `the boys`, `our lad`. Where the player's avatar is referenced (the lead pioneer), use neutral phrasing: "the captain", "your wagon-master", "the lead". Where bystanders/historical figures are referenced (Marcus Whitman, Ezra Meeker, etc.), keep their actual gender — those are real people.

Build a list of every change made and include in the build report under "Letter Pronoun Audit".

---

# Stage 3 — Real economy with units (lbs, gallons, dollars, doses)

This is the big stage. The simulation values below are NOT suggestions — they are **calibrated parameters from a Monte Carlo of 800 runs per scenario**. Use them exactly.

## 3a. Resource model changes

Currently resources are unit-less integers: `food`, `water`, `supplies`, `money`, `morale`, `health`, `move`. Add semantic units to the display only — internally keep them as numbers but treat them as:

| Resource | Internal unit | UI display | Per-unit cost (Medium fort) |
|---|---|---|---|
| money | dollars | `$X.XX` (2 decimals if has cents, else integer) | — |
| food | pounds | `X lbs` | $0.12/lb |
| water | gallons | `X gal` | $0.10/gal |
| supplies | kit-units | `X` (no unit suffix) | $1.20/unit |
| medicine | doses | `X dose` (singular if 1) | $3.50/dose |
| morale | 0-10 | `X / 10` | — |
| health | 0-10 | `X / 10` | — |
| move | 0-3 | `X` | — |

**NEW resource: medicine.** Add it to:
1. `RESOURCES` config alongside food/water/supplies (max=10, min=0)
2. `RESOURCES_BY_NAME.medicine = { max: 10, ... }`
3. The header bar (between supplies and money)
4. The HUD/team strip
5. `wagonState.medicine` initialization
6. The simulation/calibration tests

## 3b. Starting resources (replace existing in difficulty presets)

| | EASY | MEDIUM | HARD |
|---|---|---|---|
| money | $35 | $18 | $12 |
| food | 200 lbs | 140 lbs | 110 lbs |
| water | 30 gal | 22 gal | 16 gal |
| supplies | 8 | 5 | 3 |
| medicine | 3 doses | 1 dose | 0 doses |
| wagon HP | 100 | 100 | 85 |

These replace `starting_money`, `starting_food_bonus`, etc. in the difficulty preset modifiers. Wagon HP becomes a NEW tracked resource (range 0-100; track damage from events).

## 3c. Profession starting bonuses (apply ONCE at game start, AFTER difficulty)

```js
// After applying difficulty modifiers, apply per-profession starting bonuses:
team.forEach(member => {
  switch (member.profession) {
    case 'Banker':  wagon.money += 12; break;
    case 'Doctor':  wagon.medicine += 1; break;
    case 'Hunter':  wagon.food += 25; break;
    case 'Cook':    wagon.food += 15; break;
  }
});
```

Multiple stacks (two Doctors = +2 medicine). Cap at the resource max.

## 3d. Daily consumption (replace whatever is currently happening on Push On)

```js
// Each Push On day:
const aliveCount = wagonState.team.filter(m => !m.lost).length;
const cookOnTeam = wagonState.team.some(m => m.profession === 'Cook' && !m.lost);
const foodMultiplier = cookOnTeam ? 0.78 : 1.0;
const foodNeeded = aliveCount * 2.0 * foodMultiplier;  // 2.0 lbs/person/day
const waterNeeded = aliveCount * 0.5;                  // 0.5 gal/person/day

const foodShort = Math.max(0, foodNeeded - wagonState.food);
const waterShort = Math.max(0, waterNeeded - wagonState.water);

wagonState.food = Math.max(0, wagonState.food - foodNeeded);
wagonState.water = Math.max(0, wagonState.water - waterNeeded);

// Cumulative starvation/dehydration
if (foodShort > 0 && Math.random() < (0.05 + 0.08 * (foodShort / foodNeeded))) {
  loseRandomMember(wagonState, 'starvation');
}
if (waterShort > 0 && Math.random() < (0.07 + 0.10 * (waterShort / waterNeeded))) {
  loseRandomMember(wagonState, 'dehydration');
}
```

## 3e. Unexpected costs / shocks (per Push On day)

After daily consumption, roll for shocks. Add a `rollShocks(wagonState)` function called once per Push On day (BEFORE the existing event/space machinery — these are background attrition):

```js
const SHOCKS = {
  food_spoil:     { p: 0.16, impact: () => { let l = rand(25, 50); if (hasProf('Cook')) l *= 0.55; return { food: -l, narrative: `${l|0} pounds of flour found weevils. Discarded.` }; } },
  water_spill:    { p: 0.16, impact: () => { let l = rand(5, 14); return { water: -l, narrative: `A water barrel split a stave. ${l.toFixed(1)} gallons lost.` }; } },
  supplies_lost:  { p: 0.10, impact: () => { let l = randInt(1, 3); return { supplies: -l, narrative: `${l} kit pack${l>1?'s':''} fell from the wagon and were not recovered.` }; } },
  wagon_damage:   { p: 0.18, impact: () => { let l = rand(15, 35); if (hasProf('Blacksmith')) l *= 0.65; return { wagon_hp: -l, narrative: `Wheel rim cracked on rough ground. ${l|0} HP lost.` }; } },
  broken_axle:    { p: 0.04, impact: () => brokenAxleHandler() },  // see below
  sickness_minor: { p: 0.12, impact: () => sicknessMinorHandler() },
  sickness_severe:{ p: 0.06, impact: () => sicknessSevereHandler() },
  bandit_demand:  { p: 0.06, impact: () => banditHandler() },
  cholera:        { p: 0.025, impact: () => choleraHandler() },
  lost_trail:     { p: 0.05, impact: () => lostTrailHandler() },
  theft:          { p: 0.03, impact: () => { let l = rand(4, 12); return { money: -l, narrative: `Coins missing from the strongbox. $${l.toFixed(2)} gone.` }; } },
};

function rollShocks(w) {
  // Guide and Scout grant avoidance
  let avoid = 0;
  if (anyAlive(w, 'Guide'))  avoid += 0.30;
  if (anyAlive(w, 'Scout'))  avoid += 0.10;
  if (Math.random() < avoid) return null;
  
  const triggered = [];
  for (const [name, def] of Object.entries(SHOCKS)) {
    if (Math.random() < def.p) triggered.push(name);
  }
  if (triggered.length === 0) return null;
  
  const chosen = triggered[Math.floor(Math.random() * triggered.length)];
  return SHOCKS[chosen].impact();
}
```

**Handler details:**

```js
function brokenAxleHandler() {
  const w = wagonState;
  const damage = rand(50, 75);
  w.wagon_hp = Math.max(0, w.wagon_hp - damage);
  
  if (anyAlive(w, 'Carpenter')) {
    w.wagon_hp = Math.min(100, w.wagon_hp + 50);
    return { narrative: `The axle splintered. Your Carpenter rebuilt it overnight. The wagon rolls on.` };
  }
  if (w.money >= 10) {
    w.money -= 10;
    w.wagon_hp = Math.min(100, w.wagon_hp + 50);
    return { narrative: `The axle splintered. A passing wainwright fixed it for $10.00.` };
  }
  // Stranded
  w.food = Math.max(0, w.food - 30);
  w.water = Math.max(0, w.water - 6);
  return { narrative: `The axle splintered. Without funds or skilled hands, you waited two days for help. Provisions dwindled.` };
}

function sicknessMinorHandler() {
  const w = wagonState;
  if (w.medicine > 0) {
    w.medicine -= 1;
    return { narrative: `A camp fever passed. One dose of medicine was used.` };
  }
  if (Math.random() < 0.20) {
    const member = loseRandomMember(w, 'untreated illness');
    return { narrative: `Without medicine, ${member.name} took ill and did not recover.` };
  }
  return { narrative: `A camp fever passed. The afflicted recovered without aid — luck, this time.` };
}

function sicknessSevereHandler() {
  const w = wagonState;
  const dosesNeeded = anyAlive(w, 'Doctor') ? 1 : 2;
  if (w.medicine >= dosesNeeded) {
    w.medicine -= dosesNeeded;
    return { narrative: `A grave illness struck the camp. Used ${dosesNeeded} dose${dosesNeeded>1?'s':''} of medicine.` };
  }
  const deathChance = anyAlive(w, 'Doctor') ? 0.32 : 0.60;
  if (Math.random() < deathChance) {
    const member = loseRandomMember(w, 'severe illness');
    return { narrative: `${member.name} fell gravely ill. Without enough medicine, they were lost.` };
  }
  return { narrative: `A grave illness struck. By providence and care, the afflicted survived.` };
}

function banditHandler() {
  const w = wagonState;
  const demand = rand(8, 22);
  if (w.money >= demand) {
    w.money -= demand;
    return { narrative: `Highwaymen demanded $${demand.toFixed(2)}. Paid to avoid bloodshed.` };
  }
  w.supplies = Math.max(0, w.supplies - 2);
  return { narrative: `Highwaymen took 2 supply units when you couldn't pay coin.` };
}

function choleraHandler() {
  const w = wagonState;
  const chance = anyAlive(w, 'Doctor') ? 0.10 : 0.30;
  let deaths = 0;
  for (const m of w.team) {
    if (m.lost) continue;
    if (Math.random() < chance) {
      m.lost = true; deaths++;
      if (alive(w) <= 1) break;  // never kill the last
    }
  }
  if (deaths === 0) return { narrative: `Cholera passed through the camp. By providence, none were lost.` };
  return { narrative: `Cholera struck. ${deaths} member${deaths>1?'s':''} of the team perished within the day.` };
}

function lostTrailHandler() {
  const w = wagonState;
  if (anyAlive(w, 'Guide') || anyAlive(w, 'Scout') || anyAlive(w, 'Surveyor')) {
    return null;  // immune
  }
  w.food = Math.max(0, w.food - 25);
  w.water = Math.max(0, w.water - 4);
  return { narrative: `The trail forked unexpectedly. A wasted day cost 25 lbs of food and 4 gallons of water.` };
}
```

**Helpers** (add if not present):
```js
const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const anyAlive = (w, prof) => w.team.some(m => !m.lost && m.profession === prof);
const alive = (w) => w.team.filter(m => !m.lost).length;
function loseRandomMember(w, cause) {
  const candidates = w.team.filter(m => !m.lost);
  if (candidates.length <= 1) return null;  // never kill last
  const idx = Math.floor(Math.random() * candidates.length);
  candidates[idx].lost = true;
  candidates[idx].cause = cause;
  return candidates[idx];
}
```

## 3f. Income events (per Push On day, AFTER shocks)

```js
function rollIncome(w) {
  const events = [];
  
  if (anyAlive(w, 'Hunter') && Math.random() < 0.32) {
    const food = 22; w.food = Math.min(MAX_FOOD, w.food + food);
    w.hides = (w.hides || 0) + 1;
    events.push(`Your Hunter brought down game. +${food} lbs food, +1 hide.`);
  }
  if (anyAlive(w, 'Trapper') && Math.random() < 0.28) {
    const food = 12; w.food = Math.min(MAX_FOOD, w.food + food);
    w.hides = (w.hides || 0) + 2;
    events.push(`Your Trapper checked the snares. +${food} lbs food, +2 hides.`);
  }
  if (anyAlive(w, 'Farmer') && Math.random() < 0.20) {
    const food = 10; w.food = Math.min(MAX_FOOD, w.food + food);
    events.push(`Your Farmer foraged greens and roots. +${food} lbs food.`);
  }
  
  return events;
}
```

Hides accumulate on the wagon and are sold at forts (see 3g).

## 3g. Fort actions (replace existing fort menu)

When wagon is at a fort space, present a menu with these options. **Show prices in the buttons** so kids learn the economy:

```
At Fort Laramie. You may:

[ Buy food at $0.12/lb ]            (you have $X.XX)
[ Buy water at $0.10/gal ]
[ Buy medicine at $3.50/dose ]
[ Buy supplies at $1.20/unit ]
[ Repair wagon - $4.00 (+30 HP) ]   (only if HP < 100)
[ Major repair - $10.00 (+50 HP) ]  (only if HP < 50)
[ Sell hides at $3.00 each ]        (you have X hides)
[ Sell extra food at $0.05/lb ]
[ Hire local guide - $4.00 ]        (avoids next "lost trail" shock)
[ Visit fort doctor - $5.00 ]       (only if a member is dying; +50% revival chance)
[ Rest 1 day - free ]               (heals team, +1 morale, eats 1 day food)
[ Send letter home - $1.00 ]        (+2 morale)
[ Move on ]
```

Merchant profession: **buy at -15%, sell at +40%**. Apply to all fort prices.

When user selects "Buy food", prompt: "How many pounds? (you have $X to spend)" — open a number input or +/- selector. Don't auto-purchase. Same for water/medicine/supplies/hides.

## 3h. Money display

Anywhere the player sees money:
- Use `$X` if integer (e.g., `$18`)
- Use `$X.XX` if has cents (e.g., `$3.50`, `$18.00` should still show `$18`)
- The header should always show `$XX.XX` for consistency on cents-tracked totals

Helper:
```js
function formatMoney(amount) {
  if (Math.round(amount) === amount) return `$${amount}`;
  return `$${amount.toFixed(2)}`;
}
```

## 3i. Wagon HP display

Add to header bar between supplies and money:
- 100 HP → green wagon icon, "Wagon: 100/100"
- 50-99 HP → yellow, "Wagon: X/100"
- <50 HP → red, "Wagon: X/100 — needs repair"
- 0 HP → display "WAGON DESTROYED" and force the next event to be a forced major repair or game over

## 3j. Calibration self-test

Add a hidden URL flag `#calibrate=N` that runs N silent journeys with a default Hunter+Doctor team on Medium and reports stats in console:

```js
if (location.hash.includes('calibrate=')) {
  const n = parseInt(location.hash.match(/calibrate=(\d+)/)[1]);
  runCalibrationSim(n);
}

function runCalibrationSim(n) {
  let finished = 0, eliminated = 0, totalLost = 0;
  let lostAt1 = 0, lostAt3 = 0;
  for (let i = 0; i < n; i++) {
    const result = simulateJourney(['Hunter', 'Doctor'], 'medium');
    if (result.finished) finished++;
    if (result.eliminated) eliminated++;
    totalLost += result.membersLost;
    if (result.membersLost >= 1) lostAt1++;
    if (result.membersLost >= 3) lostAt3++;
  }
  console.log(`Calibration: n=${n} | finish=${finished/n*100|0}% | elim=${eliminated/n*100|0}% | avg loss=${(totalLost/n).toFixed(2)} | ≥1=${lostAt1/n*100|0}% | ≥3=${lostAt3/n*100|0}%`);
}
```

Targets for Hunter+Doctor on Medium:
- finish: 95-100%
- eliminations: 0-2%
- avg loss: 0.6-0.9
- ≥1 lost: 40-55%
- ≥3 lost: 5-10%

Targets for no-skill (Musician+Artist) on Medium:
- finish: 92-98%
- eliminations: 2-5%
- avg loss: 2.5-3.5
- ≥1 lost: 90-99%
- ≥3 lost: 50-65%

If the calibration is wildly off, post the results in your build report and STOP. Do not proceed to Stage 4. We'll re-tune parameters.

---

# Stage 4 — Photo override expansion

A new override block has been generated and saved to `historical_photos_override_v3_2.html` in `/mnt/user-data/uploads/` (Nicholas will provide). It contains **46 photos** indexed by semantic ID, all sized to 600px long-edge JPEG q72.

## 4a. Replace the existing override block

Find `<script id="historical-photos-override">...</script>` near end of `pink_oregon_trail.html`. **Replace it entirely** with the contents of `historical_photos_override_v3_2.html`.

## 4b. Extend the landmark mapping

Update `historicalLocationIdFor(name)` to include all the new landmarks:

```js
function historicalLocationIdFor(name) {
  const map = {
    // Forts (existing)
    'Fort Kearney':       'fort_kearny',
    'Fort Kearny':        'fort_kearny',
    'Fort Laramie':       'fort_laramie',
    'Fort Hall':          'fort_hall',
    'Fort Boise':         'fort_boise',
    'Fort Bridger':       'fort_bridger',
    
    // Landmarks (existing + expanded)
    'Ash Hollow':         'ash_hollow',
    'Courthouse Rock':    'courthouse_rock',
    'Courthouse and Jail Rocks': 'courthouse_rock',
    'Chimney Rock':       'chimney_rock',
    'Scotts Bluff':       'scotts_bluff',
    'Independence Rock':  'independence_rock',
    'Soda Springs':       'soda_springs',
    'South Pass':         'south_pass',
    'Whitman Mission':    'whitman_mission',
    'The Dalles':         'the_dalles',
    'Oregon City':        'oregon_city',
    
    // NEW: rivers and crossings
    'Snake River Country':    'snake_river',
    'Snake River Crossing':   'snake_river',
    'Snake River Plain':      'snake_river',
    'Columbia River':         'columbia_river',
    'Platte River Valley':    'platte_river',
    'North Platte Valley':    'platte_river',
    'South Platte Crossing':  'platte_river',
    'Big Blue River':         'kansas_river',
    'Big Sandy Creek':        'green_river',
    
    // NEW: trail features
    'Register Cliff':         'register_cliff',
    'Massacre Rocks':         'massacre_rocks',
    'Burnt River Canyon':     'farewell_bend',
    'Blue Mountains':         'blue_mountains',
    'Bear River Valley':      'farewell_bend',
    'Devils Gate':            'south_pass',
    "Devil's Gate":           'south_pass',
    'Pacific Springs':        'south_pass',
  };
  return map[name] || null;
}
```

## 4c. Use photos for events too (not just landmarks)

Currently `eventIllustration(category)` returns generic SVG icons. Add a category-to-photo fallback so SOME events show real photos:

```js
function eventIllustration(cat) {
  // NEW: try photo override first for select categories
  const PHOTO_BY_CATEGORY = {
    weather:      'snowstorm',
    river:        'wagon_lashed',
    water:        'wagon_lashed',
    trail:        'trail_ruts',
    fort:         'wagon_at_camp',
    campfire:     'wagon_at_camp',
    mountain:     'blue_mountains',
    plains:       'great_plains',
    sunset:       'sunset_sage',
    historical:   'covered_wagon',
  };
  
  const photoId = PHOTO_BY_CATEGORY[cat];
  if (photoId && window.HISTORICAL_PHOTOS_OVERRIDE && window.HISTORICAL_PHOTOS_OVERRIDE[photoId]) {
    const b64 = window.HISTORICAL_PHOTOS_OVERRIDE[photoId];
    return '<img class="event-illustration-photo" src="data:image/jpeg;base64,' + b64 + '" alt="" style="width:100%;max-width:200px;height:auto;border-radius:6px;filter:sepia(0.3) contrast(1.05);"/>';
  }
  
  // EXISTING: fallback to SVG icons
  // ... (keep all existing case statements)
}
```

## 4d. Add photos to historical-figure events

Several events reference real people. When the event narrative mentions a name, prefer the historical-figure photo:

```js
const FIGURE_PHOTOS = {
  'Jim Bridger':       'jim_bridger',
  'James Bridger':     'jim_bridger',
  'Ezra Meeker':       'ezra_meeker',
  'Tabitha Brown':     'tabitha_brown',
  'George Washington Bush': 'george_bush',
  'Marcus Whitman':    'whitman_mission',  // mission photo as proxy
  'Narcissa Whitman':  'whitman_mission',
};

// In renderEventNarrative, check ch.name or narrative text against FIGURE_PHOTOS
// and prepend the photo if matched.
```

## 4e. Caption every photo

Each photo display should include a small period-style caption. The data is already in `GAME_DATA.historical_illustrations.locations[].caption`. For new IDs (snake_river, columbia_river, etc.), add caption entries to that JSON section. Suggested captions for new entries:

```json
{
  "id": "snake_river",
  "name": "Snake River",
  "caption": "The Snake River, the most punishing stretch of the trail.",
  "year_referenced": "1845"
},
{
  "id": "columbia_river",
  "name": "Columbia River",
  "caption": "The Columbia. Last great river before Oregon City.",
  "year_referenced": "1850"
},
{
  "id": "platte_river",
  "name": "Platte River",
  "caption": "Wide as a mile, an inch deep — a flood of muddy water.",
  "year_referenced": "1849"
},
{
  "id": "register_cliff",
  "name": "Register Cliff",
  "caption": "Pioneers carved their names into the soft sandstone.",
  "year_referenced": "1851"
},
{
  "id": "trail_ruts",
  "name": "Trail Ruts",
  "caption": "Wagon ruts cut deep into the rock, still visible today.",
  "year_referenced": "1860"
},
{
  "id": "blue_mountains",
  "name": "Blue Mountains",
  "caption": "The last great barrier before the Columbia River country.",
  "year_referenced": "1850"
},
{
  "id": "kansas_river",
  "name": "Kansas River Crossing",
  "caption": "The first major river crossing east of Independence.",
  "year_referenced": "1847"
}
```

(Add similar caption stubs for green_river, massacre_rocks, farewell_bend, etc.)

---

# Stage 5 — Multiplayer setup screen instructions

Add a small section to the SETUP SCREEN (when starting a new game) that explains multiplayer is OPTIONAL and how to use it. Even though full multiplayer (PeerJS) is deferred to v3.3, the text should be there now so kids know to expect it:

After the difficulty selection, add a panel:

```
┌────────────────────────────────────────────┐
│ Playing solo? Just press START.            │
│                                            │
│ Playing with friends? Multiplayer is       │
│ coming soon. For now, take turns at the    │
│ keyboard — each player creates their own   │
│ wagon. The first to reach Oregon City      │
│ wins, but losing fewer family members      │
│ matters too!                               │
└────────────────────────────────────────────┘
```

Style as a parchment note matching the existing UI.

---

# Stage 6 — Update rules HTML

Open `pink_oregon_trail_rules.html`. Update the resources section:

**Old:**
```
- Money: ...
- Food: ...
- Water: ...
- Supplies: ...
```

**New:**
```
RESOURCES (with units to feel real)
  $ Money    — your savings, in dollars and cents
  ★ Food     — measured in pounds (lbs). Each team member eats about 2 lbs/day.
  ◊ Water    — measured in gallons (gal). Each member drinks 0.5 gal/day.
  ⚙ Supplies — generic gear: rope, oil, tools. Used in repair events.
  ✚ Medicine — doses to cure sickness. Doctors use less per cure.
  🛞 Wagon HP — wagon condition (0-100). Damage reduces. Repairs cost money.

PRICES at FORTS (Medium difficulty, before Merchant discount)
  Food         $0.12 per pound
  Water        $0.10 per gallon
  Medicine     $3.50 per dose
  Supplies     $1.20 per unit
  Wagon repair $4.00  (restores 30 HP)
  Major repair $10.00 (restores 50 HP, broken axle)
  Ferry        $6.00
  Local guide  $4.00 (avoids "lost trail")

UNEXPECTED COSTS
  - Food spoils. Water spills. Wheels crack.
  - About 1 unexpected event per 4-5 days of travel.
  - Strong professions (Cook, Carpenter, Blacksmith, Guide) reduce these.
  - Without medicine, sickness kills.
```

Also update the "When members are dying" section to reference the new "Visit fort doctor - $5.00" option.

---

# Stage 7 — Build report and deployment

After all stages pass:

1. Append to BUILD_REPORT_v3_2.md (create this file). Include:
   - Stage 0 audit results (line numbers found)
   - Stage 1 sky fix verification (manual sanity)
   - Stage 2 letter pronoun audit (list of changes made)
   - Stage 3 calibration sim results (numbers from `#calibrate=500`)
   - Stage 4 photo override file size and count
   - Any deviations from spec

2. **DEPLOYMENT** (this amendment is allowed to commit at the end):
   ```bash
   git add pink_oregon_trail.html docs/play.html historical_photos_override_v3_2.html docs/historical_photos_override_v3_2.html pink_oregon_trail_rules.html
   git commit -m "v3.2: real economy with units, fixed sky, gender-neutral letters, expanded photos"
   git push origin main
   ```

3. Append "git work pending: none — v3.2 deployed" to the build report.

---

## Final acceptance test checklist

Before declaring v3.2 done, manually run this 5-minute test:

1. Open the game. Setup: 7 members including a Hunter and a Doctor. Medium difficulty.
2. Verify header shows: `$18 | 140 lbs food | 22 gal water | 5 sup | 1 dose med | 100 HP`
3. Push On 5 times. Sky should change at least once. At least one shock should fire (food spoil, water spill, wheel damage, etc.) with period-voice narration mentioning specific quantities.
4. At first fort: confirm prices are visible in dollars/cents, confirm "Buy food" prompts for pounds, confirm "Buy water" prompts for gallons, confirm Medicine appears as buy option.
5. Send a letter home. Confirm signoff is gender-neutral ("Yours always" or similar).
6. Reach Snake River event. Confirm a real photograph appears (not the daguerreotype SVG).
7. Run `#calibrate=200` in the URL bar and check console: average loss ≤ 1.0 for Hunter+Doctor on Medium.

If any of those 7 fail, that's the bug to fix before merge.

---

## What is NOT in this amendment (deferred)

- PeerJS multiplayer (v3.3)
- Audio overhaul (v3.3 or later)
- Pioneer Voices DYK cards (v3.3)
- Extended trail tile printables (v3.4)
- Wagon-wheel translation sync animation polish

These are mentioned in the journal but not part of v3.2.
