// v3.5 matrix runner — extracts inline GAME_DATA + sim modules from
// pink_oregon_trail.html, loads docs/calibration_sim.js on top, and
// runs the full Stage 5 / Stage 6 matrix.
//
// Usage: node .run_v3_5_matrix.js <n_per_cell> [seed]

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('pink_oregon_trail.html', 'utf8');

// Pull the GAME_DATA literal so V33_CFG can reference it.
const gdMarker = 'const GAME_DATA = ';
const gdStart = html.indexOf(gdMarker);
let i = gdStart + gdMarker.length, depth = 0, end = -1;
while (i < html.length) {
  const c = html[i];
  if (c === '"') {
    i++;
    while (i < html.length) { if (html[i] === '\\') { i += 2; continue; } if (html[i] === '"') break; i++; }
    i++; continue;
  }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  i++;
}
const gdLit = html.slice(gdStart + gdMarker.length, end + 1);

// Find V32 module start through the v33RunFullBattery declaration end.
const v32Start = html.indexOf('const V32_STARTING');
const v33End   = html.indexOf('function init() {', v32Start);
const simBlock = html.slice(v32Start, v33End);

// Pull the calibration_sim.js source
const calibrationSimSrc = fs.readFileSync(path.join('docs', 'calibration_sim.js'), 'utf8');

// Build a sandboxed harness.
const harnessSrc = `
'use strict';
const GAME_DATA = ${gdLit};
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
const RESOURCES_BY_NAME = {};
GAME_DATA.resources.forEach(r => RESOURCES_BY_NAME[r.name.toLowerCase()] = r);
${simBlock}
// Now the v32/v33 simulation functions are in scope. Expose them on
// global so calibration_sim.js can find v33SimulateJourney.
global.v33SimulateJourney = v33SimulateJourney;
global.GAME_DATA = GAME_DATA;
${calibrationSimSrc}
return {
  runSimulation: global.PinkOTrailCalibrationSim.runSimulation,
  runMatrix:     global.PinkOTrailCalibrationSim.runMatrix
};
`;

const factory = new Function('global', harnessSrc);
const sim = factory(global);

const n = parseInt(process.argv[2]) || 1000;
const seed = process.argv[3] ? parseInt(process.argv[3]) : 0xC0FFEE;

console.log('=== v3.5 matrix run ===');
console.log('n per cell: ' + n);
console.log('seed:       ' + seed);
const t0 = Date.now();
const matrix = sim.runMatrix(n, seed);
const ms = Date.now() - t0;
console.log('elapsed:    ' + (ms / 1000).toFixed(1) + 's');

// Compact tabular output
console.log('\nCell                                    | finish | elim | avg loss | avg days | avg $   | p25 $ | p75 $ | %0$mid | %nofood');
console.log('----------------------------------------+--------+------+----------+----------+---------+-------+-------+--------+--------');
for (const row of matrix) {
  const tag = (row.difficulty + '_' + row.trail + '_' + row.archetype).padEnd(40);
  const s = row.stats;
  const line =
    tag + '| ' +
    (s.finish_rate * 100).toFixed(1).padStart(5) + '% | ' +
    (s.elimination_rate * 100).toFixed(1).padStart(4) + ' | ' +
    s.avg_members_lost.toFixed(2).padStart(8) + ' | ' +
    s.avg_journey_days.toFixed(0).padStart(8) + ' | ' +
    s.avg_end_money.toFixed(2).padStart(7) + ' | ' +
    String(s.p25_end_money).padStart(5) + ' | ' +
    String(s.p75_end_money).padStart(5) + ' | ' +
    (s.pct_hit_zero_money_before_mid * 100).toFixed(1).padStart(5) + '% | ' +
    (s.pct_ran_out_food * 100).toFixed(1).padStart(5) + '%';
  console.log(line);
}

// Save to file
const outFile = process.env.OUT || 'CALIBRATION_RESULTS_v3_5.json';
fs.writeFileSync(outFile, JSON.stringify(matrix, null, 2));
console.log('\nFull results: ' + outFile);
