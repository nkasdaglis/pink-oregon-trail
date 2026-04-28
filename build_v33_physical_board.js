#!/usr/bin/env node
// =====================================================================
// Pink Oregon Trail — v3.3 PHYSICAL BOARD generator
// =====================================================================
// Emits 6 letter-landscape HTML files that abut to form a single
// physical game board of 33" × 17" (3 columns × 2 rows of letter-
// landscape sheets, no margins, edge-to-edge alignment).
//
// Design:
// - 1840s cartographic style — parchment, period serif typography,
//   hand-drawn shaded relief, italic place names, decorative compass
//   rose, scale bar, decorative cartouche
// - Real Oregon Trail geography — Missouri, Kansas, Platte, North
//   Platte, Sweetwater, Green, Bear, Snake, Columbia rivers; Rocky
//   Mountains, South Pass, Wasatch / Bear River Range, Snake River
//   Plain, Blue Mountains, Cascade Range; state/territory borders
// - 25 Short-trail spaces rendered as 1.6-inch decorated roundels
//   (each large enough to hold 4 game pieces side by side)
// - 25 Extended-only spaces (50 total - 25 short shared = 25 extra)
//   rendered as smaller alternate markers between the primary stops
// - Each tile clips a 1056×816 px slice of a 3168×1632 px master
// =====================================================================

'use strict';
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'docs');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const DPI = 96;
const TILE_W = 11 * DPI;   // 1056
const TILE_H = 8.5 * DPI;  // 816
// v3.3.1 round 3 — bumped from 6-tile (3x2 = 33"x17", ~2.75x1.4 ft) to
// 9-tile (3x3 = 33"x25.5", ~2.75x2.125 ft). Closest practical match to
// the user's 3x2 ft target using standard letter paper. Roundels also
// enlarged so 4 game pieces fit comfortably (1.6" diameter vs 1.17").
const COLS = 3, ROWS = 3;
const BOARD_W = TILE_W * COLS;   // 3168
const BOARD_H = TILE_H * ROWS;   // 2448

// 1840s cartographic palette
const C = {
  parchment_lo:  '#E8D9B5',
  parchment:     '#F0E1B8',
  parchment_hi:  '#F5EBC9',
  ink_dark:      '#3D2817',
  ink:           '#5C4A36',
  ink_light:     '#7A6B5C',
  river_blue:    '#6B8FB0',
  river_dark:    '#3F5F87',
  mountain:      '#8B7A6B',
  mountain_dark: '#5C4D40',
  mountain_snow: '#F5EFE3',
  forest:        '#5F7A5F',
  forest_dark:   '#3D5A3D',
  desert:        '#C8956D',
  desert_pale:   '#DDB48E',
  prairie:       '#D4C594',
  trail_pink:    '#B85770',
  trail_pink_lo: '#D49AAD',
  state_line:    '#9C7E5C',
  gold:          '#B8923D',
  cream:         '#FBF6F0'
};

// =====================================================================
// LAT/LONG → CANVAS PROJECTION
// =====================================================================
// Map covers ~33°N to ~50°N (south-north) and ~94°W to ~125°W (east-west).
// Equirectangular projection — accurate enough for map purposes at this scale.
const LAT_N = 49.5, LAT_S = 32.0;
const LON_W_EAST = 92.5, LON_W_WEST = 125.5;  // values are degrees-west (positive)

function project(lat, lonW) {
  const x = ((LON_W_EAST - lonW) / (LON_W_EAST - LON_W_WEST)) * BOARD_W;
  const y = ((LAT_N - lat) / (LAT_N - LAT_S)) * BOARD_H;
  return { x, y };
}

// =====================================================================
// TRAIL SPACES (real lat/long for the Short-trail's 25 stops)
// =====================================================================
const SHORT_TRAIL = [
  { n: 1,  name: 'Independence',         type: 'start',    lat: 39.09, lon: 94.41 },
  { n: 2,  name: 'Kansas Prairie',       type: 'travel',   lat: 39.20, lon: 95.50 },
  { n: 3,  name: 'Kansas River',         type: 'river',    lat: 39.30, lon: 96.30 },
  { n: 4,  name: 'Big Blue River',       type: 'river',    lat: 39.78, lon: 96.95 },
  { n: 5,  name: 'Fort Kearney',         type: 'fort',     lat: 40.65, lon: 99.00 },
  { n: 6,  name: 'Platte River Valley',  type: 'travel',   lat: 41.10, lon: 100.50 },
  { n: 7,  name: 'The Great Plains',     type: 'travel',   lat: 41.50, lon: 102.20 },
  { n: 8,  name: 'Chimney Rock',         type: 'landmark', lat: 41.70, lon: 103.34 },
  { n: 9,  name: 'Scotts Bluff',         type: 'landmark', lat: 41.83, lon: 103.71 },
  { n: 10, name: 'Fort Laramie',         type: 'fort',     lat: 42.21, lon: 104.55 },
  { n: 11, name: 'Mountain Foothills',   type: 'travel',   lat: 42.45, lon: 106.00 },
  { n: 12, name: 'Independence Rock',    type: 'landmark', lat: 42.49, lon: 107.14 },
  { n: 13, name: "Devil's Gate",         type: 'landmark', lat: 42.49, lon: 107.30 },
  { n: 14, name: 'South Pass',           type: 'landmark', lat: 42.36, lon: 108.91 },
  { n: 15, name: 'Green River',          type: 'river',    lat: 41.52, lon: 109.46 },
  { n: 16, name: 'Soda Springs',         type: 'landmark', lat: 42.66, lon: 111.60 },
  { n: 17, name: 'Fort Hall',            type: 'fort',     lat: 43.04, lon: 112.43 },
  { n: 18, name: 'Snake River Crossing', type: 'river',    lat: 42.94, lon: 114.50 },
  { n: 19, name: 'Snake River Plain',    type: 'travel',   lat: 43.45, lon: 116.00 },
  { n: 20, name: 'Fort Boise',           type: 'fort',     lat: 43.82, lon: 117.00 },
  { n: 21, name: 'Blue Mountains',       type: 'travel',   lat: 45.30, lon: 118.10 },
  { n: 22, name: 'Whitman Mission',      type: 'landmark', lat: 46.04, lon: 118.46 },
  { n: 23, name: 'The Dalles',           type: 'landmark', lat: 45.60, lon: 121.18 },
  { n: 24, name: 'Columbia River',       type: 'river',    lat: 45.55, lon: 122.10 },
  { n: 25, name: 'Oregon City',          type: 'finish',   lat: 45.36, lon: 122.61 }
];

// Extended-only stops (the 25 Extended spaces that aren't in Short)
const EXTENDED_EXTRA = [
  { name: 'Westport Landing',     lat: 39.11, lon: 94.59 },
  { name: 'Shawnee Mission',      lat: 39.02, lon: 94.71 },
  { name: 'Wakarusa River',       lat: 38.93, lon: 95.40 },
  { name: 'Alcove Spring',        lat: 39.78, lon: 96.66 },
  { name: 'Rock Creek Station',   lat: 40.14, lon: 97.10 },
  { name: 'Little Blue Valley',   lat: 40.30, lon: 97.80 },
  { name: 'South Platte Crossing',lat: 41.09, lon: 102.65 },
  { name: 'Ash Hollow',           lat: 41.30, lon: 102.62 },
  { name: 'Courthouse Rock',      lat: 41.73, lon: 103.10 },
  { name: 'Register Cliff',       lat: 42.16, lon: 104.86 },
  { name: 'North Platte Valley',  lat: 42.30, lon: 105.40 },
  { name: 'Casper',               lat: 42.85, lon: 106.32 },
  { name: 'Sweetwater River',     lat: 42.50, lon: 107.85 },
  { name: 'Ice Slough',           lat: 42.50, lon: 108.20 },
  { name: 'Pacific Springs',      lat: 42.34, lon: 109.06 },
  { name: 'Big Sandy Creek',      lat: 42.05, lon: 109.45 },
  { name: 'Fort Bridger',         lat: 41.32, lon: 110.39 },
  { name: 'Bear River Valley',    lat: 41.95, lon: 111.32 },
  { name: 'American Falls',       lat: 42.78, lon: 112.85 },
  { name: 'Massacre Rocks',       lat: 42.67, lon: 113.05 },
  { name: 'Three Island Crossing',lat: 42.93, lon: 115.32 },
  { name: 'Hot Springs',          lat: 43.05, lon: 116.05 },
  { name: 'Burnt River Canyon',   lat: 44.55, lon: 117.50 },
  { name: 'Powder River',         lat: 44.78, lon: 117.81 },
  { name: 'Grande Ronde Valley',  lat: 45.32, lon: 117.92 },
  { name: 'Walla Walla Valley',   lat: 46.07, lon: 118.34 },
  { name: 'Umatilla River',       lat: 45.92, lon: 119.30 }
];

// =====================================================================
// GEOGRAPHIC FEATURES (lat/long-defined, projected at render time)
// =====================================================================

// State / territory polygons (simplified for cartographic feel, not exact)
const STATES = [
  { name: 'Oregon Country',    poly: [[49.0,124.5],[49.0,117.0],[42.0,117.0],[42.0,124.5]] },
  { name: 'Idaho Territory',   poly: [[49.0,117.0],[49.0,111.0],[42.0,111.0],[42.0,117.0]] },
  { name: 'Wyoming',           poly: [[45.0,111.0],[45.0,104.0],[41.0,104.0],[41.0,111.0]] },
  { name: 'Utah Territory',    poly: [[42.0,114.0],[42.0,109.0],[37.0,109.0],[37.0,114.0]] },
  { name: 'Nebraska',          poly: [[43.0,104.0],[43.0,95.5],[40.0,95.5],[40.0,102.0],[41.0,103.0]] },
  { name: 'Kansas',            poly: [[40.0,102.0],[40.0,95.5],[37.0,95.5],[37.0,102.0]] },
  { name: 'Missouri',          poly: [[40.6,95.5],[40.6,89.5],[36.0,89.5],[36.0,94.5]] },
  { name: 'California',        poly: [[42.0,124.0],[42.0,114.5],[35.0,114.5],[35.0,121.0]] },
  { name: 'Colorado',          poly: [[41.0,109.0],[41.0,102.0],[37.0,102.0],[37.0,109.0]] },
  { name: 'Washington Terr.',  poly: [[49.5,124.5],[49.5,117.0],[46.0,117.0],[46.0,124.5]] }
];

// Rivers — array of waypoints (lat, lon). Drawn as smooth curves.
const RIVERS = [
  { name: 'Missouri River',  width: 3.5, points: [[42.5,96.4],[40.5,95.7],[39.1,94.4],[39.0,94.6],[38.6,90.2]] },
  { name: 'Kansas River',    width: 2.5, points: [[39.05,94.7],[39.07,95.4],[39.12,96.0],[39.30,96.3],[39.06,96.55]] },
  { name: 'Big Blue River',  width: 2.0, points: [[40.4,96.7],[40.0,96.85],[39.78,96.95],[39.40,96.85],[39.05,96.5]] },
  { name: 'North Platte',    width: 3.0, points: [[42.85,106.3],[42.0,104.8],[41.83,103.7],[41.7,102.0],[41.10,100.5],[40.65,99.0]] },
  { name: 'South Platte',    width: 2.5, points: [[41.09,102.65],[40.5,103.5],[39.95,105.10]] },
  { name: 'Platte River',    width: 3.0, points: [[40.65,99.0],[40.78,97.0],[41.04,95.86]] },
  { name: 'Sweetwater',      width: 2.0, points: [[42.50,108.50],[42.50,107.85],[42.49,107.30],[42.49,107.14],[42.45,106.00],[42.50,105.5]] },
  { name: 'Green River',     width: 2.5, points: [[42.5,109.5],[42.0,109.46],[41.52,109.46],[41.32,110.39],[40.0,109.5]] },
  { name: 'Bear River',      width: 2.0, points: [[42.66,111.60],[42.0,111.5],[41.95,111.32],[41.5,112.0]] },
  { name: 'Snake River',     width: 3.0, points: [[44.0,110.5],[43.5,111.5],[43.04,112.43],[42.78,112.85],[42.94,114.5],[43.45,116.0],[43.82,117.0],[45.5,116.5],[46.4,116.9],[46.2,118.0]] },
  { name: 'Columbia River',  width: 4.0, points: [[49.0,117.6],[48.5,118.5],[47.5,120.0],[46.2,119.5],[45.6,121.18],[45.55,122.1],[46.2,124.0]] },
  { name: 'Willamette',      width: 2.0, points: [[44.0,123.0],[45.36,122.61],[45.55,122.7]] }
];

// Mountain ranges — drawn as a series of triangle peaks along a ridge line
const MOUNTAINS = [
  { name: 'Rocky Mountains',  ridge: [[44.5,108.5],[44.0,107.5],[43.5,108.0],[43.0,108.5],[42.7,109.0],[42.0,109.0],[41.5,108.5],[41.0,108.0],[40.5,107.0]], h: 22 },
  { name: 'Big Horn Mtns',    ridge: [[45.0,107.0],[44.5,107.5],[44.0,107.8]], h: 16 },
  { name: 'Wind River Range', ridge: [[43.5,109.5],[43.0,109.8],[42.7,109.5]], h: 18 },
  { name: 'Wasatch Range',    ridge: [[41.5,111.5],[41.0,111.8],[40.5,111.6]], h: 18 },
  { name: 'Bear River Range', ridge: [[42.4,111.7],[42.0,111.6]], h: 14 },
  { name: 'Sawtooth Range',   ridge: [[44.5,115.0],[44.0,115.2],[43.6,115.0]], h: 16 },
  { name: 'Blue Mountains',   ridge: [[45.5,118.5],[45.0,118.2],[44.7,118.0]], h: 16 },
  { name: 'Cascade Range',    ridge: [[48.0,121.0],[47.5,121.5],[46.85,121.75],[46.2,121.5],[45.4,121.7],[44.3,122.0],[43.0,122.2],[42.0,122.3]], h: 22 },
  { name: 'Sierra Nevada',    ridge: [[40.5,121.0],[39.5,120.5],[38.5,120.0],[37.5,119.0],[36.5,118.5]], h: 22 }
];

// Notable peaks — single triangles with names
const PEAKS = [
  { name: "Pikes Peak",       lat: 38.84, lon: 105.04, h: 22 },
  { name: 'Mount Hood',       lat: 45.37, lon: 121.69, h: 28 },
  { name: 'Mount Rainier',    lat: 46.85, lon: 121.75, h: 30 },
  { name: 'Mount Shasta',     lat: 41.41, lon: 122.19, h: 26 },
  { name: 'Long\'s Peak',     lat: 40.25, lon: 105.62, h: 22 },
  { name: 'Fremont Peak',     lat: 43.12, lon: 109.62, h: 22 },
  { name: 'Mount St. Helens', lat: 46.20, lon: 122.18, h: 24 }
];

// Geographic regions — labeled background tints
const REGIONS = [
  { name: 'GREAT PLAINS',         center: [40.5,100.0], font: 28 },
  { name: 'GREAT BASIN',          center: [39.5,116.5], font: 28 },
  { name: 'GREAT SALT LAKE DESERT',center: [40.7,113.0],font: 16 },
  { name: 'GREAT SALT LAKE',      center: [41.1,112.5], font: 14 },
  { name: 'COLUMBIA PLATEAU',     center: [46.0,119.5], font: 18 },
  { name: 'WILLAMETTE VALLEY',    center: [44.5,123.0], font: 12 },
  { name: 'SNAKE RIVER PLAIN',    center: [42.7,114.5], font: 14 },
  { name: 'TERRA INCOGNITA',      center: [37.0,107.0], font: 18, italic: true },
  { name: 'TERRITORIES OF THE PAIUTE',center: [38.0,118.5],font: 12, italic: true },
  { name: 'LAND OF THE LAKOTA',   center: [44.5,102.5], font: 14, italic: true },
  { name: 'LANDS OF THE NEZ PERCE',center: [45.5,117.0],font: 12, italic: true },
  { name: 'CHEYENNE COUNTRY',     center: [40.0,103.5], font: 12, italic: true }
];

// =====================================================================
// SVG COMPONENT BUILDERS
// =====================================================================

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Smooth curve through points (catmull-rom-like with quadratic Bezier)
function smoothPath(latLngs) {
  const pts = latLngs.map(([la, lo]) => project(la, lo));
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    if (i < pts.length - 1) {
      const cx = (pts[i].x + pts[i+1].x) / 2;
      const cy = (pts[i].y + pts[i+1].y) / 2;
      d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    } else {
      d += ` T ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
  }
  return d;
}

function buildBackground() {
  // Subtle parchment with vignette
  let s = '';
  s += `<defs>
    <radialGradient id="parch-grad" cx="0.5" cy="0.5" r="0.7">
      <stop offset="0%" stop-color="${C.parchment_hi}"/>
      <stop offset="60%" stop-color="${C.parchment}"/>
      <stop offset="100%" stop-color="${C.parchment_lo}"/>
    </radialGradient>
    <pattern id="hatch-mtn" patternUnits="userSpaceOnUse" width="6" height="6">
      <path d="M 0 6 L 6 0" stroke="${C.mountain_dark}" stroke-width="0.4" opacity="0.3"/>
    </pattern>
    <pattern id="dots-desert" patternUnits="userSpaceOnUse" width="10" height="10">
      <circle cx="2" cy="2" r="0.6" fill="${C.desert}" opacity="0.4"/>
      <circle cx="7" cy="7" r="0.5" fill="${C.desert}" opacity="0.4"/>
    </pattern>
    <pattern id="grass-prairie" patternUnits="userSpaceOnUse" width="14" height="14">
      <path d="M 3 12 L 3 8 M 7 12 L 7 7 M 11 12 L 11 9" stroke="${C.forest}" stroke-width="0.4" opacity="0.35"/>
    </pattern>
  </defs>`;
  s += `<rect x="0" y="0" width="${BOARD_W}" height="${BOARD_H}" fill="url(#parch-grad)"/>`;
  // Subtle parchment crackle texture (sparse random short lines)
  for (let i = 0; i < 200; i++) {
    const x = Math.floor((i * 137.5) % BOARD_W);
    const y = Math.floor((i * 89.3) % BOARD_H);
    const len = 4 + (i % 6);
    s += `<line x1="${x}" y1="${y}" x2="${x + len}" y2="${y + (i % 3)}" stroke="${C.ink_light}" stroke-width="0.3" opacity="0.12"/>`;
  }
  return s;
}

function buildRegionTints() {
  // Soft regional color tints — desert SW, prairie central, forest NW
  let s = '';
  // Great Plains (light prairie tint)
  const plains = project(40.5, 99.0), plainsW = project(40.5, 104.0);
  s += `<rect x="${plainsW.x}" y="${plains.y - 200}" width="${plains.x - plainsW.x}" height="400" fill="url(#grass-prairie)" opacity="0.6"/>`;
  // Great Basin desert tint
  const gb_nw = project(42.5, 117.0), gb_se = project(37.5, 113.0);
  s += `<rect x="${gb_nw.x}" y="${gb_nw.y}" width="${gb_se.x - gb_nw.x}" height="${gb_se.y - gb_nw.y}" fill="url(#dots-desert)" opacity="0.55"/>`;
  // Forested Pacific NW
  const pnw_nw = project(49.0, 124.5), pnw_se = project(42.0, 121.5);
  s += `<rect x="${pnw_nw.x}" y="${pnw_nw.y}" width="${pnw_se.x - pnw_nw.x}" height="${pnw_se.y - pnw_nw.y}" fill="${C.forest}" opacity="0.10"/>`;
  return s;
}

function buildStates() {
  let s = '';
  STATES.forEach(st => {
    const pts = st.poly.map(([la, lo]) => { const p = project(la, lo); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
    s += `<polygon points="${pts}" fill="none" stroke="${C.state_line}" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.6"/>`;
    // Label inside polygon
    const cx = st.poly.reduce((sm, p) => sm + p[1], 0) / st.poly.length;
    const cy = st.poly.reduce((sm, p) => sm + p[0], 0) / st.poly.length;
    const lp = project(cy, cx);
    s += `<text x="${lp.x.toFixed(1)}" y="${lp.y.toFixed(1)}" font-family="Georgia, serif" font-size="20" font-style="italic" font-weight="bold" fill="${C.ink}" text-anchor="middle" opacity="0.45" letter-spacing="3">${escapeXml(st.name.toUpperCase())}</text>`;
  });
  return s;
}

function buildRegionLabels() {
  let s = '';
  REGIONS.forEach(r => {
    const p = project(r.center[0], r.center[1]);
    const fst = r.italic ? 'italic' : 'normal';
    const fw = r.italic ? '400' : '600';
    s += `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" font-family="Georgia, serif" font-size="${r.font}" font-style="${fst}" font-weight="${fw}" fill="${r.italic ? C.ink_light : C.ink}" text-anchor="middle" opacity="0.55" letter-spacing="${r.italic ? 1 : 4}">${escapeXml(r.name)}</text>`;
  });
  return s;
}

function buildRivers() {
  let s = '';
  RIVERS.forEach(r => {
    const d = smoothPath(r.points);
    s += `<path d="${d}" fill="none" stroke="${C.river_blue}" stroke-width="${r.width + 1.5}" opacity="0.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${d}" fill="none" stroke="${C.river_dark}" stroke-width="${r.width}" opacity="0.85" stroke-linecap="round" stroke-linejoin="round"/>`;
    // Label at midpoint
    if (r.name) {
      const mid = r.points[Math.floor(r.points.length / 2)];
      const p = project(mid[0], mid[1]);
      s += `<text x="${(p.x + 8).toFixed(1)}" y="${(p.y - 6).toFixed(1)}" font-family="Georgia, serif" font-size="13" font-style="italic" fill="${C.river_dark}" opacity="0.85">${escapeXml(r.name)}</text>`;
    }
  });
  return s;
}

function buildMountains() {
  let s = '';
  MOUNTAINS.forEach(m => {
    // Draw triangles along the ridge — overlapping for shaded relief feel
    for (let i = 0; i < m.ridge.length; i++) {
      const p = project(m.ridge[i][0], m.ridge[i][1]);
      const h = m.h;
      // Three overlapping peaks
      for (let dx = -h; dx <= h; dx += h) {
        const cx = p.x + dx;
        s += `<polygon points="${cx},${p.y - h * 1.2} ${cx - h * 0.7},${p.y + h * 0.5} ${cx + h * 0.7},${p.y + h * 0.5}" fill="${C.mountain}" stroke="${C.mountain_dark}" stroke-width="0.6"/>`;
        // Snow cap
        s += `<polygon points="${cx},${p.y - h * 1.2} ${(cx - h * 0.3).toFixed(1)},${(p.y - h * 0.5).toFixed(1)} ${(cx + h * 0.3).toFixed(1)},${(p.y - h * 0.5).toFixed(1)}" fill="${C.mountain_snow}" opacity="0.85"/>`;
        // Shading (right side darker)
        s += `<polygon points="${cx},${p.y - h * 1.2} ${cx + h * 0.7},${p.y + h * 0.5} ${cx},${p.y + h * 0.5}" fill="${C.mountain_dark}" opacity="0.30"/>`;
      }
    }
    // Range label at midpoint
    if (m.name) {
      const mid = m.ridge[Math.floor(m.ridge.length / 2)];
      const p = project(mid[0], mid[1]);
      s += `<text x="${p.x.toFixed(1)}" y="${(p.y + m.h + 12).toFixed(1)}" font-family="Georgia, serif" font-size="11" font-style="italic" fill="${C.mountain_dark}" text-anchor="middle">${escapeXml(m.name)}</text>`;
    }
  });
  // Notable named peaks
  PEAKS.forEach(pk => {
    const p = project(pk.lat, pk.lon);
    const h = pk.h;
    s += `<polygon points="${p.x},${p.y - h * 1.3} ${p.x - h * 0.7},${p.y + h * 0.5} ${p.x + h * 0.7},${p.y + h * 0.5}" fill="${C.mountain}" stroke="${C.mountain_dark}" stroke-width="0.7"/>`;
    s += `<polygon points="${p.x},${p.y - h * 1.3} ${(p.x - h * 0.4).toFixed(1)},${(p.y - h * 0.4).toFixed(1)} ${(p.x + h * 0.4).toFixed(1)},${(p.y - h * 0.4).toFixed(1)}" fill="${C.mountain_snow}"/>`;
    s += `<polygon points="${p.x},${p.y - h * 1.3} ${p.x + h * 0.7},${p.y + h * 0.5} ${p.x},${p.y + h * 0.5}" fill="${C.mountain_dark}" opacity="0.35"/>`;
    s += `<text x="${p.x.toFixed(1)}" y="${(p.y + h * 0.5 + 12).toFixed(1)}" font-family="Georgia, serif" font-size="10" font-style="italic" font-weight="bold" fill="${C.mountain_dark}" text-anchor="middle">${escapeXml(pk.name)}</text>`;
  });
  return s;
}

function buildTrailPath() {
  // Compute trail polyline through all 25 short stops (smooth Bezier)
  const pts = SHORT_TRAIL.map(s => project(s.lat, s.lon));
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    // Slight curve outward toward the south to differentiate from straight line
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2 + 8;
    d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  let s = '';
  // Wide pink shadow
  s += `<path d="${d}" fill="none" stroke="${C.trail_pink_lo}" stroke-width="14" opacity="0.55" stroke-linecap="round"/>`;
  // Main trail dashed
  s += `<path d="${d}" fill="none" stroke="${C.trail_pink}" stroke-width="5" stroke-dasharray="14 8" stroke-linecap="round" opacity="0.95"/>`;
  return s;
}

function buildExtendedMarkers() {
  // Small alternate-stop markers between primary roundels
  let s = '';
  EXTENDED_EXTRA.forEach(e => {
    const p = project(e.lat, e.lon);
    s += `<g>`;
    s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="${C.cream}" stroke="${C.ink}" stroke-width="0.8" opacity="0.85"/>`;
    s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${C.trail_pink}" opacity="0.9"/>`;
    s += `<text x="${(p.x + 9).toFixed(1)}" y="${(p.y - 4).toFixed(1)}" font-family="Georgia, serif" font-size="8" font-style="italic" fill="${C.ink}" opacity="0.85">${escapeXml(e.name)}</text>`;
    s += `</g>`;
  });
  return s;
}

function buildSpaces() {
  // Primary roundels — 80px radius (1.6 inch diameter) so 4 game pieces fit
  const RAD = 80;  // 1.67 inch diameter — fits 4 game pieces comfortably (v3.3.1 round 3)
  let s = '';
  SHORT_TRAIL.forEach(sp => {
    const p = project(sp.lat, sp.lon);
    let typeColor = C.cream, accentColor = C.gold, ringStroke = C.ink;
    if (sp.type === 'fort')     { typeColor = '#E8C28A'; accentColor = C.gold;       }
    else if (sp.type === 'river'){ typeColor = '#C8DCE8'; accentColor = C.river_dark; }
    else if (sp.type === 'landmark'){ typeColor = '#E5C8D2'; accentColor = C.trail_pink; }
    else if (sp.type === 'finish'){ typeColor = '#F5E5A0'; accentColor = C.gold;     ringStroke = C.gold; }
    else if (sp.type === 'start'){ typeColor = '#C8DCC8'; accentColor = C.forest_dark; ringStroke = C.forest_dark; }
    s += `<g>`;
    // Outer halo (helps roundel pop against terrain)
    s += `<circle cx="${p.x}" cy="${p.y}" r="${RAD + 3}" fill="${C.cream}" stroke="${C.ink_dark}" stroke-width="1.2" opacity="0.95"/>`;
    // Outer ring
    s += `<circle cx="${p.x}" cy="${p.y}" r="${RAD}" fill="${typeColor}" stroke="${ringStroke}" stroke-width="2"/>`;
    // Inner gold trim
    s += `<circle cx="${p.x}" cy="${p.y}" r="${RAD - 4}" fill="none" stroke="${accentColor}" stroke-width="1"/>`;
    // Number
    s += `<text x="${p.x}" y="${p.y - 8}" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="${C.ink_dark}" text-anchor="middle">${sp.n}</text>`;
    // Type icon glyph
    let glyph = '';
    if (sp.type === 'fort')     glyph = '⌂';   // house / fort
    else if (sp.type === 'river') glyph = '≈';
    else if (sp.type === 'landmark') glyph = '▲';
    else if (sp.type === 'finish') glyph = '★';
    else if (sp.type === 'start') glyph = '◉';
    else glyph = '•';
    s += `<text x="${p.x}" y="${p.y + 18}" font-family="Georgia, serif" font-size="20" fill="${C.ink_dark}" text-anchor="middle" opacity="0.85">${glyph}</text>`;
    // Place name beneath
    s += `<rect x="${p.x - 70}" y="${p.y + RAD + 4}" width="140" height="20" fill="${C.cream}" stroke="${C.ink_dark}" stroke-width="0.6" opacity="0.92" rx="3"/>`;
    s += `<text x="${p.x}" y="${p.y + RAD + 18}" font-family="Georgia, serif" font-size="13" font-weight="600" fill="${C.ink_dark}" text-anchor="middle">${escapeXml(sp.name)}</text>`;
    s += `</g>`;
  });
  return s;
}

function buildCompassRose() {
  // Decorative compass rose in the bottom-right area (over Texas/Mexico region — empty space)
  const cx = BOARD_W - 200, cy = BOARD_H - 200;
  let s = `<g transform="translate(${cx}, ${cy})">`;
  s += `<circle cx="0" cy="0" r="68" fill="${C.cream}" stroke="${C.ink_dark}" stroke-width="2" opacity="0.95"/>`;
  s += `<circle cx="0" cy="0" r="56" fill="none" stroke="${C.gold}" stroke-width="1"/>`;
  s += `<circle cx="0" cy="0" r="44" fill="none" stroke="${C.ink_light}" stroke-width="0.6"/>`;
  // Cardinal points (4 long arrows + 4 short)
  const longH = 60, shortH = 36;
  s += `<polygon points="0,${-longH} 9,0 0,18 -9,0" fill="${C.ink_dark}" stroke="${C.ink_dark}" stroke-width="0.6"/>`;
  s += `<polygon points="0,${longH} -9,0 0,-18 9,0" fill="${C.ink}" opacity="0.5" stroke="${C.ink_dark}" stroke-width="0.6"/>`;
  s += `<polygon points="${longH},0 0,9 -18,0 0,-9" fill="${C.gold}" stroke="${C.ink_dark}" stroke-width="0.6"/>`;
  s += `<polygon points="${-longH},0 0,-9 18,0 0,9" fill="${C.gold}" opacity="0.6" stroke="${C.ink_dark}" stroke-width="0.6"/>`;
  // Diagonals
  for (const ang of [45, 135, 225, 315]) {
    const r = ang * Math.PI / 180;
    const x1 = Math.cos(r) * shortH, y1 = Math.sin(r) * shortH;
    const x2 = Math.cos(r + Math.PI/180*8) * 12, y2 = Math.sin(r + Math.PI/180*8) * 12;
    const x3 = Math.cos(r - Math.PI/180*8) * 12, y3 = Math.sin(r - Math.PI/180*8) * 12;
    s += `<polygon points="${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x3.toFixed(1)},${y3.toFixed(1)}" fill="${C.ink_light}" opacity="0.7"/>`;
  }
  // Labels
  s += `<text x="0" y="${-longH - 10}" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="${C.ink_dark}" text-anchor="middle">N</text>`;
  s += `<text x="0" y="${longH + 24}" font-family="Georgia, serif" font-size="18" fill="${C.ink}" text-anchor="middle">S</text>`;
  s += `<text x="${longH + 14}" y="6" font-family="Georgia, serif" font-size="18" fill="${C.ink}" text-anchor="middle">E</text>`;
  s += `<text x="${-longH - 14}" y="6" font-family="Georgia, serif" font-size="18" fill="${C.ink}" text-anchor="middle">W</text>`;
  s += `</g>`;
  return s;
}

function buildScaleBar() {
  // Decorative scale bar in bottom area (over Texas/Mexico — empty)
  const x0 = BOARD_W - 480, y0 = BOARD_H - 100;
  let s = `<g>`;
  s += `<text x="${x0 + 100}" y="${y0 - 14}" font-family="Georgia, serif" font-style="italic" font-size="13" fill="${C.ink}" text-anchor="middle">Scale of Miles</text>`;
  // 5 segments × 100 miles each = 500 miles total. At ~98 px per degree-W and ~50 mi per degree, that's ~196 px per 100 mi
  const segWidth = 50;  // visual segment, not scale-accurate
  for (let i = 0; i < 5; i++) {
    const fill = (i % 2 === 0) ? C.ink_dark : C.cream;
    s += `<rect x="${x0 + i * segWidth}" y="${y0}" width="${segWidth}" height="10" fill="${fill}" stroke="${C.ink_dark}" stroke-width="0.6"/>`;
    s += `<text x="${x0 + i * segWidth}" y="${y0 + 24}" font-family="Georgia, serif" font-size="9" fill="${C.ink}" text-anchor="middle">${i * 100}</text>`;
  }
  s += `<text x="${x0 + 5 * segWidth}" y="${y0 + 24}" font-family="Georgia, serif" font-size="9" fill="${C.ink}" text-anchor="middle">500 mi</text>`;
  s += `</g>`;
  return s;
}

function buildCartouche() {
  // Decorative title cartouche — bottom-left, near California coast (mostly empty)
  const x0 = 40, y0 = BOARD_H - 270;
  let s = `<g>`;
  s += `<rect x="${x0}" y="${y0}" width="380" height="180" fill="${C.cream}" stroke="${C.ink_dark}" stroke-width="2" opacity="0.95" rx="6"/>`;
  s += `<rect x="${x0 + 8}" y="${y0 + 8}" width="364" height="164" fill="none" stroke="${C.gold}" stroke-width="1" rx="4"/>`;
  s += `<text x="${x0 + 190}" y="${y0 + 50}" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="${C.ink_dark}" text-anchor="middle">A MAP of the</text>`;
  s += `<text x="${x0 + 190}" y="${y0 + 90}" font-family="Georgia, serif" font-size="40" font-weight="bold" fill="${C.trail_pink}" text-anchor="middle" letter-spacing="2">OREGON TRAIL</text>`;
  s += `<text x="${x0 + 190}" y="${y0 + 118}" font-family="Georgia, serif" font-style="italic" font-size="14" fill="${C.ink}" text-anchor="middle">From the Town of Independence in Missouri</text>`;
  s += `<text x="${x0 + 190}" y="${y0 + 136}" font-family="Georgia, serif" font-style="italic" font-size="14" fill="${C.ink}" text-anchor="middle">to the Willamette Valley in the Oregon Country</text>`;
  s += `<text x="${x0 + 190}" y="${y0 + 162}" font-family="Georgia, serif" font-style="italic" font-size="11" fill="${C.ink_light}" text-anchor="middle">Two thousand miles · Drawn for Pink Oregon Trail · 1848</text>`;
  // Tiny decorative oxen flanking the title
  s += `<g transform="translate(${x0 + 32}, ${y0 + 80})"><ellipse cx="0" cy="0" rx="14" ry="8" fill="${C.mountain_dark}"/><circle cx="-12" cy="-3" r="5" fill="${C.mountain_dark}"/><polygon points="-15,-6 -19,-12 -13,-9" fill="${C.ink_dark}"/></g>`;
  s += `<g transform="translate(${x0 + 348}, ${y0 + 80}) scale(-1,1)"><ellipse cx="0" cy="0" rx="14" ry="8" fill="${C.mountain_dark}"/><circle cx="-12" cy="-3" r="5" fill="${C.mountain_dark}"/><polygon points="-15,-6 -19,-12 -13,-9" fill="${C.ink_dark}"/></g>`;
  s += `</g>`;
  return s;
}

function buildLegend() {
  // Legend explaining roundel types (placed center-bottom, between cartouche and scale bar)
  const x0 = BOARD_W / 2 - 240, y0 = BOARD_H - 160;
  let s = `<g>`;
  s += `<rect x="${x0}" y="${y0}" width="480" height="120" fill="${C.cream}" stroke="${C.ink_dark}" stroke-width="1.4" opacity="0.95" rx="4"/>`;
  s += `<text x="${x0 + 240}" y="${y0 + 22}" font-family="Georgia, serif" font-size="14" font-weight="bold" fill="${C.ink_dark}" text-anchor="middle">Trail Spaces</text>`;
  // 5 swatches
  const items = [
    { color: '#C8DCC8', label: 'Start (Independence)', glyph: '◉' },
    { color: '#E8C28A', label: 'Fort',                 glyph: '⌂' },
    { color: '#C8DCE8', label: 'River Crossing',       glyph: '≈' },
    { color: '#E5C8D2', label: 'Landmark',             glyph: '▲' },
    { color: '#F5E5A0', label: 'Finish (Oregon City)', glyph: '★' }
  ];
  items.forEach((it, i) => {
    const cy = y0 + 50 + i * 14;
    s += `<circle cx="${x0 + 28}" cy="${cy}" r="9" fill="${it.color}" stroke="${C.ink_dark}" stroke-width="1"/>`;
    s += `<text x="${x0 + 28}" y="${cy + 4}" font-family="Georgia, serif" font-size="10" fill="${C.ink_dark}" text-anchor="middle">${it.glyph}</text>`;
    s += `<text x="${x0 + 46}" y="${cy + 4}" font-family="Georgia, serif" font-size="11" fill="${C.ink_dark}">${escapeXml(it.label)}</text>`;
  });
  // Right column — extended marker explanation
  s += `<circle cx="${x0 + 280}" cy="${y0 + 50}" r="6" fill="${C.cream}" stroke="${C.ink}" stroke-width="0.8"/>`;
  s += `<circle cx="${x0 + 280}" cy="${y0 + 50}" r="2.5" fill="${C.trail_pink}"/>`;
  s += `<text x="${x0 + 295}" y="${y0 + 54}" font-family="Georgia, serif" font-size="11" fill="${C.ink}">Alternate stop (Extended trail only)</text>`;
  // Trail line sample
  s += `<line x1="${x0 + 270}" y1="${y0 + 80}" x2="${x0 + 460}" y2="${y0 + 80}" stroke="${C.trail_pink_lo}" stroke-width="8" stroke-linecap="round"/>`;
  s += `<line x1="${x0 + 270}" y1="${y0 + 80}" x2="${x0 + 460}" y2="${y0 + 80}" stroke="${C.trail_pink}" stroke-width="3" stroke-dasharray="8 4" stroke-linecap="round"/>`;
  s += `<text x="${x0 + 295}" y="${y0 + 100}" font-family="Georgia, serif" font-style="italic" font-size="11" fill="${C.ink}">The Trail Itself — about 2,000 miles</text>`;
  s += `</g>`;
  return s;
}

// =====================================================================
// FULL MASTER MAP (single SVG composite, used as the source for all 6 tiles)
// =====================================================================
function buildMasterMap() {
  let s = '';
  s += buildBackground();
  s += buildRegionTints();
  s += buildStates();
  s += buildRegionLabels();
  s += buildRivers();
  s += buildMountains();
  s += buildTrailPath();
  s += buildExtendedMarkers();
  s += buildSpaces();
  s += buildCompassRose();
  s += buildScaleBar();
  s += buildCartouche();
  s += buildLegend();
  return s;
}

// =====================================================================
// TILE EMITTER
// =====================================================================

function buildTileSvg(col, row, masterContent) {
  // The trick: we build ONE master SVG with full viewBox 0 0 BOARD_W BOARD_H,
  // and on each tile we set the viewBox to that tile's slice. This way every
  // geographic feature is rendered identically across tiles and they line up
  // exactly when laid edge-to-edge.
  const vbX = col * TILE_W;
  const vbY = row * TILE_H;
  // Tile alignment marks at corners (helps when assembling — small crosshairs
  // at the four corners of the slice indicate where adjacent tiles meet)
  let alignMarks = '';
  const tickSize = 8;
  // Top-left, top-right, bottom-left, bottom-right
  const corners = [
    [vbX,           vbY],
    [vbX + TILE_W,  vbY],
    [vbX,           vbY + TILE_H],
    [vbX + TILE_W,  vbY + TILE_H]
  ];
  corners.forEach(([cx, cy]) => {
    alignMarks += `<line x1="${cx - tickSize}" y1="${cy}" x2="${cx + tickSize}" y2="${cy}" stroke="${C.ink_dark}" stroke-width="0.5" opacity="0.4"/>`;
    alignMarks += `<line x1="${cx}" y1="${cy - tickSize}" x2="${cx}" y2="${cy + tickSize}" stroke="${C.ink_dark}" stroke-width="0.5" opacity="0.4"/>`;
  });
  // Tile letter badge — discreet, top-right corner of the tile (within visible area)
  const tileLetters = [['A','B','C'],['D','E','F'],['G','H','I']];
  const letter = tileLetters[row][col];
  const badgeX = vbX + TILE_W - 36, badgeY = vbY + 36;
  alignMarks += `<g opacity="0.55"><circle cx="${badgeX}" cy="${badgeY}" r="14" fill="${C.cream}" stroke="${C.ink_dark}" stroke-width="0.8"/><text x="${badgeX}" y="${badgeY + 5}" font-family="Georgia, serif" font-size="14" font-weight="bold" fill="${C.ink_dark}" text-anchor="middle">${letter}</text></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${TILE_W} ${TILE_H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
${masterContent}
${alignMarks}
</svg>`;
}

function buildTileHtml(col, row, masterContent) {
  const tileLetters = [['A','B','C'],['D','E','F'],['G','H','I']];
  const letter = tileLetters[row][col];
  const positionDesc = ['top','bottom'][row] + '-' + ['left','center','right'][col];
  const svg = buildTileSvg(col, row, masterContent);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Pink Oregon Trail — Physical Board Tile ${letter} (${positionDesc})</title>
<style>
@page { size: 11in 8.5in; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 11in; height: 8.5in; background: #FFF; overflow: hidden; }
svg { width: 11in; height: 8.5in; display: block; }
@media screen {
  body { padding: 18px; background: #1f1a12; min-height: 100vh; }
  svg { box-shadow: 0 6px 28px rgba(0,0,0,0.6); }
  .assembly-note {
    position: fixed; top: 8px; left: 8px;
    background: rgba(245,235,201,0.9); color: #3D2817;
    padding: 6px 12px; font-family: Georgia, serif; font-size: 12px;
    border: 1px solid #5C4A36; border-radius: 4px; z-index: 100;
  }
}
@media print { .assembly-note { display: none; } }
</style></head><body>
<div class="assembly-note">Tile ${letter} (${positionDesc}) — print at 100%, no scaling, no margins. Tape edges to ${{
  A: 'Tile B (right) and Tile D (below)',
  B: 'Tile A (left), Tile C (right), Tile E (below)',
  C: 'Tile B (left) and Tile F (below)',
  D: 'Tile A (above), Tile E (right), Tile G (below)',
  E: 'Tile B (above), Tile D (left), Tile F (right), Tile H (below)',
  F: 'Tile C (above), Tile E (left), Tile I (below)',
  G: 'Tile D (above) and Tile H (right)',
  H: 'Tile E (above), Tile G (left), Tile I (right)',
  I: 'Tile F (above) and Tile H (left)'
}[letter]}.</div>
${svg}
</body></html>`;
}

// =====================================================================
// EMIT
// =====================================================================

console.log('=== v3.3 PHYSICAL BOARD generator ===');
console.log(`Board: ${BOARD_W} × ${BOARD_H} px = ${(BOARD_W/DPI).toFixed(1)}" × ${(BOARD_H/DPI).toFixed(1)}" (${COLS}×${ROWS} tiles)`);
console.log(`Per tile: ${TILE_W} × ${TILE_H} px = ${(TILE_W/DPI).toFixed(1)}" × ${(TILE_H/DPI).toFixed(1)}" letter-landscape`);
console.log('');

console.log(`Building master map composite (the same content rendered ${COLS*ROWS} times, viewBoxed differently per tile)...`);
const masterContent = buildMasterMap();
console.log(`Master content: ${(masterContent.length / 1024).toFixed(1)} KB SVG fragment`);
console.log('');

const tileLetters = [['A','B','C'],['D','E','F'],['G','H','I']];
let totalBytes = 0, fileCount = 0;
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const letter = tileLetters[row][col];
    const filename = `board_v33_physical_tile_${letter}.html`;
    const html = buildTileHtml(col, row, masterContent);
    fs.writeFileSync(path.join(OUT_DIR, filename), html, 'utf8');
    const size = Buffer.byteLength(html, 'utf8');
    totalBytes += size;
    fileCount++;
    console.log(`  wrote ${filename.padEnd(40)} ${(size / 1024).toFixed(1).padStart(7)} KB`);
  }
}

console.log('');
console.log(`=== Done. ${fileCount} files, ${(totalBytes / 1024).toFixed(1)} KB total. ===`);
console.log('');
console.log(`Layout (${COLS} cols × ${ROWS} rows, letter-landscape, ${(BOARD_W/DPI).toFixed(1)}" × ${(BOARD_H/DPI).toFixed(1)}" total — ~${(BOARD_W/DPI/12).toFixed(2)} ft × ${(BOARD_H/DPI/12).toFixed(2)} ft):`);
console.log('  Top row (sky):    A (Pacific NW)  | B (Idaho/Snake)   | C (Northern Plains)');
console.log('  Middle row:       D (Calif/Basin) | E (Wyoming/Utah)  | F (Kansas/Missouri)');
console.log('  Bottom row:       G (S Cal/Mexico)| H (Colorado)      | I (Arkansas/Texas)');
console.log('');
console.log(`Print all ${fileCount} at 100% (no scaling, no margins) on letter sheets in landscape.`);
console.log('Trim to edge if needed; tape together by tile letter on the assembly note.');
