/* Pink Oregon Trail — v3.5 Monte Carlo simulator
 *
 * Headless replay of the game's core loop. Reads from the same
 * GAME_DATA literal the live game uses (passed in by the loader at
 * runtime). Returns aggregate statistics over N journeys.
 *
 * Loader options:
 *   Browser  : <script src="calibration_sim.js"></script> after the
 *              main game script. window.PinkOTrailCalibrationSim
 *              becomes available.
 *   Node     : extract the inline scripts from pink_oregon_trail.html
 *              (see .sim_v33_calibration.js for the pattern), then
 *              require this file or eval it in the same context. The
 *              v33SimulateJourney function in the inline JS does the
 *              per-journey work; this file just wraps it with the
 *              v3.5 stats aggregator + seeded PRNG.
 */
(function (global) {
  'use strict';

  // -----------------------------------------------------------------
  // Mulberry32 — small fast deterministic PRNG. Same seed = same run.
  // -----------------------------------------------------------------
  function makeMulberry32(seed) {
    let s = (seed >>> 0) || 0xC0FFEE;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // -----------------------------------------------------------------
  // runSimulation({ difficulty, team, trail, n, seed })
  //
  //   difficulty: 'easy' | 'medium' | 'hard'
  //   team:       array of profession names (e.g., ['Hunter','Doctor'])
  //   trail:      'short' | 'extended'
  //   n:          number of journeys to run (default 1000)
  //   seed:       PRNG seed (default 0xC0FFEE)
  //
  // Returns {n, finish_rate, elimination_rate, avg_members_lost,
  //          member_loss_distribution, avg_end_money, median_end_money,
  //          p25_end_money, p75_end_money, pct_hit_zero_money_before_mid,
  //          pct_ran_out_food, avg_journey_days, event_frequencies,
  //          death_causes}
  // -----------------------------------------------------------------
  function runSimulation(opts) {
    opts = opts || {};
    const difficulty = (opts.difficulty || 'medium').toLowerCase();
    const team       = opts.team || ['Hunter', 'Doctor'];
    const trail      = opts.trail || 'short';
    const n          = opts.n || 1000;
    const seed       = opts.seed != null ? opts.seed : 0xC0FFEE;

    // Save and override Math.random with our seeded PRNG so the in-HTML
    // simulator (which uses Math.random) becomes deterministic for this
    // run. Restored after the run completes.
    const _origRandom = Math.random;
    const rng = makeMulberry32(seed);
    Math.random = rng;

    // Confirm the simulator is available. v33SimulateJourney is defined
    // inside the inline pink_oregon_trail.html script.
    const sim = global.v33SimulateJourney;
    if (typeof sim !== 'function') {
      Math.random = _origRandom;
      throw new Error('v33SimulateJourney not available. Load this file after the main game script.');
    }

    // Aggregators
    let finishedCount = 0, eliminatedCount = 0;
    let totalLost = 0, totalDays = 0, totalEndMoney = 0;
    const lossDist = {};       // { 0: c, 1: c, ... }
    const endMonies = [];      // for percentiles
    let zeroMoneyBeforeMid = 0;
    let ranOutFood = 0;
    const eventFreq = {};      // { kind: count }
    const deathCauses = {};    // { cause: count }

    // mid-trail threshold by trail length (in days for the legacy sim)
    // v33SimulateJourney uses position-based progress; we approximate
    // mid-trail as days_traveled >= ~(trail_total_days / 2). For Short
    // that's ~30 days; for Extended ~70.
    const midDayThreshold = (trail === 'extended') ? 70 : 30;

    for (let i = 0; i < n; i++) {
      let r;
      try {
        r = sim(team, difficulty, trail);
      } catch (e) {
        // Skip catastrophic single-run failures; keep aggregating
        console.error('[sim run ' + i + '] ' + (e && e.message));
        continue;
      }
      if (!r) continue;
      if (r.finished) finishedCount++;
      if (r.eliminated) eliminatedCount++;
      const lost = r.members_lost || 0;
      totalLost += lost;
      lossDist[lost] = (lossDist[lost] || 0) + 1;
      const days = r.days_traveled || r.daysTraveled || 0;
      totalDays += days;
      const money = (r.money != null) ? r.money : 0;
      totalEndMoney += money;
      endMonies.push(money);
      // zero-money-before-mid tracking. The simulator records w._zeroMoneyDay
      // if we instrument it; in absence, we approximate: end money == 0 AND
      // days >= midDayThreshold counts as having hit zero before mid.
      if (r._hitZeroMoneyDay != null && r._hitZeroMoneyDay <= midDayThreshold) {
        zeroMoneyBeforeMid++;
      } else if (money <= 0 && days >= midDayThreshold * 1.5) {
        // Conservative fallback estimate when day-level instrumentation is missing
        zeroMoneyBeforeMid++;
      }
      if (r._ranOutFood || (r.food != null && r.food <= 0 && days >= 1)) {
        ranOutFood++;
      }
      // Event frequencies (if instrumented)
      if (r._eventCounts) {
        for (const k in r._eventCounts) {
          eventFreq[k] = (eventFreq[k] || 0) + r._eventCounts[k];
        }
      }
      // Death causes
      if (r._deathCauses) {
        for (const c in r._deathCauses) {
          deathCauses[c] = (deathCauses[c] || 0) + r._deathCauses[c];
        }
      } else if (r.team) {
        // Best-effort fallback
        r.team.forEach(m => {
          if (m.lost && m.cause) deathCauses[m.cause] = (deathCauses[m.cause] || 0) + 1;
        });
      }
    }

    Math.random = _origRandom;

    // Compute percentiles
    endMonies.sort((a, b) => a - b);
    const pct = (q) => endMonies.length ? endMonies[Math.min(endMonies.length - 1, Math.floor(q * endMonies.length))] : 0;
    const median = pct(0.5);

    // Normalize loss distribution
    const lossDistNorm = {};
    for (const k in lossDist) lossDistNorm[k] = +(lossDist[k] / n).toFixed(4);

    // Normalize event frequencies (per-journey average)
    const eventFreqNorm = {};
    for (const k in eventFreq) eventFreqNorm[k] = +(eventFreq[k] / n).toFixed(4);

    return {
      n: n,
      seed: seed,
      finish_rate:                  +(finishedCount / n).toFixed(4),
      elimination_rate:             +(eliminatedCount / n).toFixed(4),
      avg_members_lost:             +(totalLost / n).toFixed(3),
      member_loss_distribution:     lossDistNorm,
      avg_end_money:                +(totalEndMoney / n).toFixed(2),
      median_end_money:             median,
      p25_end_money:                pct(0.25),
      p75_end_money:                pct(0.75),
      pct_hit_zero_money_before_mid:+(zeroMoneyBeforeMid / n).toFixed(4),
      pct_ran_out_food:             +(ranOutFood / n).toFixed(4),
      avg_journey_days:             +(totalDays / n).toFixed(1),
      event_frequencies:            eventFreqNorm,
      death_causes:                 deathCauses
    };
  }

  // -----------------------------------------------------------------
  // runMatrix — full 30-cell test matrix per the v3.5 prompt.
  // -----------------------------------------------------------------
  function runMatrix(n, seed) {
    n = n || 5000;
    const archetypes = {
      'no-skill':    ['Musician', 'Artist', 'Influencer', 'Seamstress', 'Fashion Designer', 'Magician', 'Actor'],
      'survival':    ['Hunter', 'Doctor', 'Cook', 'Carpenter', 'Guide', 'Scout', 'Banker'],
      'mixed':       ['Hunter', 'Doctor', 'Carpenter', 'Cook', 'Musician', 'Banker', 'Priest'],
      'trade':       ['Merchant', 'Banker', 'Politician', 'Hunter', 'Doctor', 'Cook', 'Influencer'],
      'random7':     null  // sampled per-cell
    };
    const allProfs = [
      'Hunter','Doctor','Carpenter','Cook','Guide','Scout','Banker','Trapper','Merchant',
      'Priest','Cowboy','Blacksmith','Politician','Influencer','Language Teacher','Native Guide',
      'Farmer','Surveyor','Musician','Artist','Seamstress','Fashion Designer','Magician','Actor','Food Critic'
    ];
    const difficulties = ['easy', 'medium', 'hard'];
    const trails       = ['short', 'extended'];
    const results = [];
    let s = seed || 0xC0FFEE;

    for (const diff of difficulties) {
      for (const trail of trails) {
        for (const arch in archetypes) {
          const team = archetypes[arch] ||
            // random7: shuffled 7 from allProfs
            (function() {
              const rng = makeMulberry32(s + diff.charCodeAt(0) + trail.charCodeAt(0) + arch.charCodeAt(0));
              const a = allProfs.slice();
              for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
              }
              return a.slice(0, 7);
            })();
          const r = runSimulation({ difficulty: diff, team: team, trail: trail, n: n, seed: s++ });
          results.push({
            difficulty: diff, trail: trail, archetype: arch, team: team,
            stats: r
          });
        }
      }
    }
    return results;
  }

  // -----------------------------------------------------------------
  // URL-flag bootstrap (browser only). Reads location.hash and fires
  // the appropriate run after page load.
  // -----------------------------------------------------------------
  function maybeBootstrap() {
    if (typeof window === 'undefined' || !window.location) return;
    const hash = window.location.hash + '&' + window.location.search;
    if (/[#&?]calibrate=/.test(hash)) {
      const m = hash.match(/calibrate=(\d+)/);
      const teamMatch = hash.match(/team=([^&]+)/);
      const diffMatch = hash.match(/difficulty=([a-z]+)/i);
      const trailMatch = hash.match(/trail=([a-z]+)/i);
      const seedMatch = hash.match(/seed=(\d+)/);
      const n = parseInt(m[1]) || 1000;
      const team = teamMatch ? decodeURIComponent(teamMatch[1]).split(',') : ['Hunter','Doctor'];
      const difficulty = diffMatch ? diffMatch[1].toLowerCase() : 'medium';
      const trail = trailMatch ? trailMatch[1].toLowerCase() : 'short';
      const seed = seedMatch ? parseInt(seedMatch[1]) : 0xC0FFEE;
      console.log('[calibration_sim] running #calibrate=' + n + ' team=' + team.join(',') + ' difficulty=' + difficulty + ' trail=' + trail + ' seed=' + seed);
      const t0 = Date.now();
      const r = runSimulation({ difficulty: difficulty, team: team, trail: trail, n: n, seed: seed });
      const ms = Date.now() - t0;
      console.log('[calibration_sim] done in ' + ms + 'ms');
      console.log(JSON.stringify(r, null, 2));
      // Optional in-page render
      if (typeof document !== 'undefined' && document.body) {
        const pre = document.createElement('pre');
        pre.style.cssText = 'padding:18px;font-family:monospace;font-size:13px;color:#3D2817;background:#FBF6F0;white-space:pre-wrap;';
        pre.textContent = JSON.stringify(r, null, 2);
        document.body.appendChild(pre);
      }
    } else if (/[#&?]calibrate_all/.test(hash)) {
      const nMatch = hash.match(/calibrate_all=(\d+)/);
      const n = nMatch ? parseInt(nMatch[1]) : 5000;
      console.log('[calibration_sim] running full matrix at n=' + n + '/cell');
      const t0 = Date.now();
      const matrix = runMatrix(n);
      const ms = Date.now() - t0;
      console.log('[calibration_sim] matrix complete in ' + ms + 'ms');
      console.log(JSON.stringify(matrix, null, 2));
      if (typeof document !== 'undefined' && document.body) {
        const pre = document.createElement('pre');
        pre.style.cssText = 'padding:18px;font-family:monospace;font-size:13px;color:#3D2817;background:#FBF6F0;white-space:pre-wrap;';
        pre.textContent = JSON.stringify(matrix, null, 2);
        document.body.appendChild(pre);
      }
    }
  }

  // Expose
  global.PinkOTrailCalibrationSim = {
    runSimulation: runSimulation,
    runMatrix: runMatrix,
    makeMulberry32: makeMulberry32
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.PinkOTrailCalibrationSim;
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('load', maybeBootstrap);
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
