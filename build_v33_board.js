#!/usr/bin/env node
// =====================================================================
// Pink Oregon Trail — v3.3 board generator
// =====================================================================
// Emits 16 self-contained HTML files for the v3.3 board redesign:
//   board_extended_tile_{A..F}_{decorated,paintable}.html  (12 files)
//   board_short_tile_A_{decorated,paintable}.html          (2 files)
//   board_poster_{decorated,paintable}.html                (2 files)
//
// Per spec item 16: 3-5 vignettes per tile, 2-3 wildlife illustrations,
// 1 DYK parchment-scroll callout, 3 easter eggs, decorative borders,
// corner vignettes, exact 11-color palette. Pure SVG, <800KB per tile,
// no rasters/fonts/external resources. Offline-first.
//
// Per spec fallback path: "If pure-SVG watercolor texture proves too
// heavy for the 800KB budget, fall back to simpler line-art with flat
// color fills." We take the fallback explicitly — line art with flat
// color fills, layered SVG primitives, kid-readable at 8.5x11 print.
//
// Each component takes a `paintable` flag — when true, fills become
// 'none' so paint shows through, strokes stay visible as guides.
// =====================================================================

'use strict';
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'docs');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// v3.3 exact palette (11 colors per spec)
const C = {
  parchment:    '#F4E8D8',
  deep_brown:   '#5C4A36',
  tan:          '#A89070',
  trail_pink:   '#B85770',
  soft_pink:    '#F4D3DA',
  cream:        '#FBF6F0',
  river_blue:   '#7A9DBE',
  forest_green: '#5F7A5F',
  mountain_purple: '#8B7A95',
  desert_tan:   '#C8956D',
  gold_accent:  '#D4AF37'
};

// Tile metadata per spec — tile_a through tile_f for Extended, tile_a for Short.
const EXTENDED_TILES = [
  {
    id: 'A', title: 'Independence to Fort Kearny',
    spaces: [{ n: 1, name: 'Independence',  type: 'start' },
             { n: 2, name: 'Big Blue River', type: 'river' },
             { n: 3, name: 'Alcove Spring',  type: 'landmark' },
             { n: 4, name: 'Fort Kearny',    type: 'fort' }],
    region: 'Eastern prairie',
    cornerVignette: 'compass_rose',
    vignettes: ['Prairie schooner being outfitted', 'Family\'s last meal in Independence', 'Oxen being broken to yoke', 'Fiddler at evening camp'],
    wildlife: ['Buffalo on plains', 'Prairie dogs', 'Eagle in tree'],
    dykText: 'The 2,000-mile journey began here. Most pioneers walked the entire way.'
  },
  {
    id: 'B', title: 'Fort Kearny to Chimney Rock',
    spaces: [{ n: 5, name: 'Platte River',     type: 'river' },
             { n: 6, name: 'Ash Hollow',       type: 'landmark' },
             { n: 7, name: 'Courthouse Rock',  type: 'landmark' },
             { n: 8, name: 'Chimney Rock',     type: 'landmark' }],
    region: 'High plains',
    cornerVignette: 'quill_and_ink',
    vignettes: ['Kids picking buffalo chips for fires', 'Buffalo herd in the distance', 'Violent prairie thunderstorm at horizon', 'Pawnee hunter passing in foreground'],
    wildlife: ['Buffalo herd', 'Antelope', 'Hawk'],
    dykText: 'Pioneer children gathered buffalo chips — dried droppings — for cooking fires on the treeless prairie.'
  },
  {
    id: 'C', title: 'Scotts Bluff to Independence Rock',
    spaces: [{ n: 9,  name: 'Scotts Bluff',    type: 'landmark' },
             { n: 10, name: 'Fort Laramie',    type: 'fort' },
             { n: 11, name: 'North Platte',    type: 'river' },
             { n: 12, name: 'Independence Rock', type: 'landmark' }],
    region: 'Wyoming Territory',
    cornerVignette: 'campfire',
    vignettes: ['Women writing letters home', 'Wagon train circled for the night', 'Names being carved into Independence Rock', 'Wedding on the trail'],
    wildlife: ['Pronghorn', 'Coyote', 'Magpie'],
    dykText: 'Reaching Independence Rock by July 4th meant you were on schedule. More than 5,000 pioneer names are still carved there.'
  },
  {
    id: 'D', title: 'South Pass to Fort Bridger',
    spaces: [{ n: 13, name: 'Sweetwater',     type: 'river' },
             { n: 14, name: 'South Pass',     type: 'landmark' },
             { n: 15, name: 'Fort Bridger',   type: 'fort' },
             { n: 16, name: 'Green River',    type: 'river' }],
    region: 'Continental Divide',
    cornerVignette: 'oxen_yoked',
    vignettes: ['Mountain pass with snow on peaks', 'Trappers trading furs', 'Shoshone family at trading post', 'Wagon being lashed for steep descent'],
    wildlife: ['Mountain goat', 'Elk', 'Beaver'],
    dykText: 'South Pass crosses the Continental Divide so gently that pioneers often topped it without noticing.'
  },
  {
    id: 'E', title: 'Soda Springs to Fort Boise',
    spaces: [{ n: 17, name: 'Soda Springs',   type: 'landmark' },
             { n: 18, name: 'Fort Hall',      type: 'fort' },
             { n: 19, name: 'Snake River',    type: 'river' },
             { n: 20, name: 'Fort Boise',     type: 'fort' }],
    region: 'Snake River country',
    cornerVignette: 'salmon',
    vignettes: ['Soda Springs with kids drinking natural carbonated water', 'Salmon being caught at Snake River tributary', 'Missionaries at Whitman station'],
    wildlife: ['Salmon', 'Heron', 'Bighorn sheep'],
    dykText: 'The water at Soda Springs bubbled like cider straight from the rock. The children would not stop drinking it.'
  },
  {
    id: 'F', title: 'The Dalles to Oregon City',
    spaces: [{ n: 21, name: 'Blue Mountains', type: 'landmark' },
             { n: 22, name: 'The Dalles',     type: 'landmark' },
             { n: 23, name: 'Columbia River', type: 'river' },
             { n: 24, name: 'Mount Hood',     type: 'landmark' },
             { n: 25, name: 'Oregon City',    type: 'finish' }],
    region: 'Willamette Valley approach',
    cornerVignette: 'mount_hood',
    vignettes: ['Columbia River raft journey', 'Mount Hood looming', 'First farms of Willamette Valley', 'Families embracing in Oregon City'],
    wildlife: ['Deer', 'Salmon', 'Eagle'],
    dykText: 'Oregon City was the trail\'s end. Families wept openly when they came down the last hill into the valley.'
  }
];

// Short tile is a single sheet covering all 25 stops (compressed).
const SHORT_TILE = {
  id: 'A', title: 'The Whole Trail (Short Journey)',
  spaces: [
    { n: 1,  name: 'Independence',     type: 'start' },
    { n: 5,  name: 'Fort Kearny',      type: 'fort' },
    { n: 9,  name: 'Chimney Rock',     type: 'landmark' },
    { n: 12, name: 'Fort Laramie',     type: 'fort' },
    { n: 14, name: 'Independence Rock', type: 'landmark' },
    { n: 16, name: 'Fort Bridger',     type: 'fort' },
    { n: 18, name: 'Fort Hall',        type: 'fort' },
    { n: 21, name: 'The Dalles',       type: 'landmark' },
    { n: 25, name: 'Oregon City',      type: 'finish' }
  ],
  region: 'Across America',
  cornerVignette: 'compass_rose',
  vignettes: ['Wagon train at dawn on the prairie', 'Family standing at Independence Rock', 'Wagons rafting the Columbia', 'Oregon City in the valley'],
  wildlife: ['Buffalo', 'Salmon', 'Elk', 'Eagle'],
  dykText: 'The Oregon Trail was about 2,000 miles long — roughly the same as walking from New York to Denver.'
};

// =====================================================================
// SVG COMPONENTS
// =====================================================================

function decorativeBorder(w, h, paintable) {
  // Outer + inner border; corner motifs alternating wagons / fleurs / oxen
  const outerStroke = paintable ? C.deep_brown : C.tan;
  const innerStroke = paintable ? C.deep_brown : C.gold_accent;
  let s = '';
  s += `<rect x="20" y="20" width="${w-40}" height="${h-40}" fill="none" stroke="${outerStroke}" stroke-width="3" rx="8"/>`;
  s += `<rect x="32" y="32" width="${w-64}" height="${h-64}" fill="none" stroke="${innerStroke}" stroke-width="1" rx="4"/>`;
  // Repeating motif marks along borders (every 60px)
  const motifColor = paintable ? C.deep_brown : C.tan;
  for (let x = 50; x < w - 50; x += 60) {
    // Top
    s += `<circle cx="${x}" cy="26" r="3" fill="${paintable ? 'none' : motifColor}" stroke="${motifColor}" stroke-width="0.8"/>`;
    // Bottom
    s += `<circle cx="${x}" cy="${h - 26}" r="3" fill="${paintable ? 'none' : motifColor}" stroke="${motifColor}" stroke-width="0.8"/>`;
  }
  for (let y = 70; y < h - 50; y += 60) {
    s += `<circle cx="26" cy="${y}" r="3" fill="${paintable ? 'none' : motifColor}" stroke="${motifColor}" stroke-width="0.8"/>`;
    s += `<circle cx="${w - 26}" cy="${y}" r="3" fill="${paintable ? 'none' : motifColor}" stroke="${motifColor}" stroke-width="0.8"/>`;
  }
  return s;
}

function cornerVignette(kind, x, y, paintable) {
  const stroke = C.deep_brown;
  const fill = paintable ? 'none' : C.tan;
  const accent = paintable ? 'none' : C.gold_accent;
  let s = `<g transform="translate(${x}, ${y})" opacity="0.9">`;
  if (kind === 'compass_rose') {
    s += `<circle cx="0" cy="0" r="20" fill="${paintable ? 'none' : C.cream}" stroke="${stroke}" stroke-width="1.2"/>`;
    s += `<polygon points="0,-18 5,0 0,18 -5,0" fill="${fill}" stroke="${stroke}" stroke-width="0.8"/>`;
    s += `<polygon points="-18,0 0,5 18,0 0,-5" fill="${accent}" stroke="${stroke}" stroke-width="0.8"/>`;
    s += `<text x="0" y="-22" font-family="Georgia, serif" font-size="10" fill="${stroke}" text-anchor="middle">N</text>`;
  } else if (kind === 'quill_and_ink') {
    s += `<rect x="-10" y="-2" width="14" height="14" fill="${paintable ? 'none' : C.deep_brown}" stroke="${stroke}" stroke-width="0.8" rx="1"/>`;
    s += `<path d="M 4 -2 Q 12 -10 18 -18" fill="none" stroke="${stroke}" stroke-width="2"/>`;
    s += `<path d="M 4 -2 Q 8 -8 16 -16 L 14 -10 L 12 -8 L 10 -6 L 8 -4 Z" fill="${fill}" stroke="${stroke}" stroke-width="0.6"/>`;
  } else if (kind === 'campfire') {
    s += `<polygon points="-12,12 0,-14 12,12" fill="${paintable ? 'none' : C.trail_pink}" stroke="${stroke}" stroke-width="1"/>`;
    s += `<polygon points="-7,12 0,-6 7,12" fill="${paintable ? 'none' : C.gold_accent}" stroke="${stroke}" stroke-width="0.8"/>`;
    s += `<line x1="-15" y1="14" x2="15" y2="14" stroke="${stroke}" stroke-width="1.5"/>`;
    s += `<line x1="-12" y1="14" x2="-8" y2="18" stroke="${stroke}" stroke-width="1.2"/>`;
    s += `<line x1="12" y1="14" x2="8" y2="18" stroke="${stroke}" stroke-width="1.2"/>`;
  } else if (kind === 'oxen_yoked') {
    s += `<ellipse cx="-8" cy="0" rx="6" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
    s += `<ellipse cx="8" cy="0" rx="6" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
    s += `<rect x="-10" y="-12" width="20" height="3" fill="${paintable ? 'none' : C.deep_brown}" stroke="${stroke}" stroke-width="0.6"/>`;
    s += `<polygon points="-12,-2 -8,-6 -4,-2" fill="${stroke}"/>`;
    s += `<polygon points="4,-2 8,-6 12,-2" fill="${stroke}"/>`;
  } else if (kind === 'salmon') {
    s += `<path d="M -18 0 Q -10 -10 8 -8 Q 18 -4 18 0 Q 18 4 8 8 Q -10 10 -18 0 Z" fill="${paintable ? 'none' : C.river_blue}" stroke="${stroke}" stroke-width="1"/>`;
    s += `<polygon points="-18,0 -22,-6 -22,6" fill="${stroke}"/>`;
    s += `<circle cx="6" cy="-2" r="1.4" fill="${stroke}"/>`;
  } else if (kind === 'mount_hood') {
    s += `<polygon points="-20,15 -8,-15 0,-2 8,-15 20,15" fill="${paintable ? 'none' : C.mountain_purple}" stroke="${stroke}" stroke-width="1"/>`;
    s += `<polygon points="-14,-2 -8,-15 -2,-2" fill="${paintable ? 'none' : C.cream}" stroke="${stroke}" stroke-width="0.8"/>`;
    s += `<polygon points="2,-2 8,-15 14,-2" fill="${paintable ? 'none' : C.cream}" stroke="${stroke}" stroke-width="0.8"/>`;
  }
  s += '</g>';
  return s;
}

function trailLine(spaces, paintable, w, h) {
  // Curving line connecting all spaces. Trail_pink, slightly thicker than v3.1.
  const margin = 80;
  const usableW = w - 2 * margin;
  const ys = h * 0.55;
  const points = spaces.map((sp, i) => ({
    x: margin + (spaces.length === 1 ? usableW / 2 : (i / (spaces.length - 1)) * usableW),
    y: ys + Math.sin(i * 0.9) * 30
  }));
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2 - 12;
    path += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
  }
  const fade = paintable ? C.deep_brown : C.soft_pink;
  const main = paintable ? C.deep_brown : C.trail_pink;
  let s = '';
  s += `<path d="${path}" fill="none" stroke="${fade}" stroke-width="9" opacity="0.35" stroke-linecap="round"/>`;
  s += `<path d="${path}" fill="none" stroke="${main}" stroke-width="3.5" stroke-linecap="round"${paintable ? ' stroke-dasharray="6 4"' : ''}/>`;
  return { svg: s, points };
}

function spaceRoundel(sp, x, y, paintable) {
  // Decorative roundel — 1.2 inch diameter ≈ 50px at 96dpi rendered scale
  const radius = 26;
  const ringFill = paintable ? 'none' : C.cream;
  const goldRing = paintable ? 'none' : C.gold_accent;
  const tanOuter = paintable ? 'none' : C.tan;
  let typeColor = C.tan;
  let typeIcon = '';
  if (sp.type === 'fort')     { typeColor = C.tan;          typeIcon = `<path d="M ${x-12} ${y+8} L ${x-12} ${y-2} L ${x-6} ${y-8} L ${x+6} ${y-8} L ${x+12} ${y-2} L ${x+12} ${y+8} Z M ${x-3} ${y+8} L ${x-3} ${y} L ${x+3} ${y} L ${x+3} ${y+8}" fill="none" stroke="${C.deep_brown}" stroke-width="1.2"/>`; }
  else if (sp.type === 'river'){ typeColor = C.river_blue;  typeIcon = `<path d="M ${x-10} ${y} Q ${x-5} ${y-6} ${x} ${y} T ${x+10} ${y}" fill="none" stroke="${C.river_blue}" stroke-width="2"/><path d="M ${x-10} ${y+4} Q ${x-5} ${y-2} ${x} ${y+4} T ${x+10} ${y+4}" fill="none" stroke="${C.river_blue}" stroke-width="1.4"/>`; }
  else if (sp.type === 'landmark'){ typeColor = C.mountain_purple; typeIcon = `<polygon points="${x-10},${y+8} ${x},${y-8} ${x+10},${y+8}" fill="${paintable ? 'none' : C.mountain_purple}" stroke="${C.deep_brown}" stroke-width="0.8"/>`; }
  else if (sp.type === 'finish'){ typeColor = C.gold_accent; typeIcon = `<polygon points="${x},${y-10} ${x+3},${y-3} ${x+10},${y-3} ${x+5},${y+2} ${x+7},${y+9} ${x},${y+5} ${x-7},${y+9} ${x-5},${y+2} ${x-10},${y-3} ${x-3},${y-3}" fill="${paintable ? 'none' : C.gold_accent}" stroke="${C.deep_brown}" stroke-width="0.8"/>`; }
  else if (sp.type === 'start'){ typeColor = C.forest_green; typeIcon = `<polygon points="${x-8},${y+6} ${x+8},${y} ${x-8},${y-6}" fill="${paintable ? 'none' : C.forest_green}" stroke="${C.deep_brown}" stroke-width="0.8"/>`; }
  else { typeIcon = `<line x1="${x-8}" y1="${y}" x2="${x+8}" y2="${y}" stroke="${C.deep_brown}" stroke-width="1.2" marker-end="url(#arrow)"/>`; }

  let s = '';
  s += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${ringFill}" stroke="${tanOuter}" stroke-width="2"/>`;
  s += `<circle cx="${x}" cy="${y}" r="${radius - 4}" fill="none" stroke="${goldRing}" stroke-width="1"/>`;
  // Number (period serif)
  s += `<text x="${x}" y="${y - 14}" font-family="Georgia, serif" font-size="11" font-weight="bold" fill="${C.deep_brown}" text-anchor="middle">${sp.n}</text>`;
  // Icon
  s += typeIcon;
  // Place name (italic serif beneath roundel)
  s += `<text x="${x}" y="${y + radius + 14}" font-family="Georgia, serif" font-style="italic" font-size="11" fill="${C.deep_brown}" text-anchor="middle">${escapeXml(sp.name)}</text>`;
  return s;
}

function vignetteIllustration(text, x, y, paintable) {
  // 1.5 inch illustrated scene placeholder — line-art frame with caption
  // (per spec fallback path: line-art rather than full watercolor texture)
  const w = 110, h = 60;
  let s = '';
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${paintable ? 'none' : C.cream}" stroke="${C.deep_brown}" stroke-width="0.8" rx="3"/>`;
  // Simple horizon line + sun motif as visual anchor
  s += `<line x1="${x+6}" y1="${y+38}" x2="${x+w-6}" y2="${y+38}" stroke="${C.tan}" stroke-width="0.8"/>`;
  s += `<circle cx="${x+w-18}" cy="${y+18}" r="6" fill="${paintable ? 'none' : C.gold_accent}" stroke="${C.deep_brown}" stroke-width="0.5"/>`;
  // Wrap text to ~16 chars per line
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 18) { lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((l, i) => {
    s += `<text x="${x + w/2}" y="${y + 48 + i * 8}" font-family="Georgia, serif" font-size="6.5" fill="${C.deep_brown}" text-anchor="middle">${escapeXml(l)}</text>`;
  });
  return s;
}

function dykScroll(text, x, y, paintable) {
  // Parchment-scroll-style decorative element with single historical fact
  const w = 180, h = 84;
  let s = '';
  // Scroll body
  s += `<rect x="${x}" y="${y+8}" width="${w}" height="${h-16}" fill="${paintable ? 'none' : C.parchment}" stroke="${C.deep_brown}" stroke-width="1" rx="2"/>`;
  // Curled top and bottom
  s += `<path d="M ${x} ${y+8} Q ${x+10} ${y} ${x+w} ${y+8}" fill="${paintable ? 'none' : C.parchment}" stroke="${C.deep_brown}" stroke-width="1"/>`;
  s += `<path d="M ${x} ${y+h-8} Q ${x+10} ${y+h} ${x+w} ${y+h-8}" fill="${paintable ? 'none' : C.parchment}" stroke="${C.deep_brown}" stroke-width="1"/>`;
  // Header
  s += `<text x="${x + w/2}" y="${y + 20}" font-family="Georgia, serif" font-size="9" font-weight="bold" font-style="italic" fill="${C.trail_pink}" text-anchor="middle">Did You Know?</text>`;
  // Body text — wrap
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 36) { lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  lines.slice(0, 5).forEach((l, i) => {
    s += `<text x="${x + w/2}" y="${y + 32 + i * 9}" font-family="Georgia, serif" font-size="7" fill="${C.deep_brown}" text-anchor="middle">${escapeXml(l)}</text>`;
  });
  return s;
}

function easterEgg(kind, x, y, paintable) {
  // 3 categories per spec: Hidden critter, Period object, Fellow traveler
  let s = `<g transform="translate(${x}, ${y})" opacity="0.85">`;
  if (kind === 'critter') {
    // Tiny fox face
    s += `<polygon points="-6,3 0,-7 6,3" fill="${paintable ? 'none' : C.desert_tan}" stroke="${C.deep_brown}" stroke-width="0.5"/>`;
    s += `<circle cx="-2" cy="-1" r="0.6" fill="${C.deep_brown}"/>`;
    s += `<circle cx="2" cy="-1" r="0.6" fill="${C.deep_brown}"/>`;
    s += `<polygon points="-6,3 -8,0 -5,1" fill="${paintable ? 'none' : C.desert_tan}" stroke="${C.deep_brown}" stroke-width="0.4"/>`;
    s += `<polygon points="6,3 8,0 5,1" fill="${paintable ? 'none' : C.desert_tan}" stroke="${C.deep_brown}" stroke-width="0.4"/>`;
  } else if (kind === 'object') {
    // Silver dollar
    s += `<circle cx="0" cy="0" r="5" fill="${paintable ? 'none' : C.cream}" stroke="${C.deep_brown}" stroke-width="0.8"/>`;
    s += `<text x="0" y="2" font-family="Georgia, serif" font-size="5" font-weight="bold" fill="${C.deep_brown}" text-anchor="middle">$</text>`;
  } else if (kind === 'flower') {
    // Prairie flower
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const px = Math.cos(ang) * 4, py = Math.sin(ang) * 4;
      s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.5" fill="${paintable ? 'none' : C.soft_pink}" stroke="${C.deep_brown}" stroke-width="0.4"/>`;
    }
    s += `<circle cx="0" cy="0" r="1.5" fill="${paintable ? 'none' : C.gold_accent}" stroke="${C.deep_brown}" stroke-width="0.4"/>`;
  } else if (kind === 'traveler') {
    // Tiny silhouette of figure on horseback
    s += `<line x1="-4" y1="6" x2="-4" y2="0" stroke="${C.deep_brown}" stroke-width="1"/>`;
    s += `<line x1="4" y1="6" x2="4" y2="0" stroke="${C.deep_brown}" stroke-width="1"/>`;
    s += `<rect x="-5" y="-2" width="10" height="4" fill="${paintable ? 'none' : C.tan}" stroke="${C.deep_brown}" stroke-width="0.5"/>`;
    s += `<circle cx="3" cy="-5" r="2" fill="${paintable ? 'none' : C.tan}" stroke="${C.deep_brown}" stroke-width="0.5"/>`;
  }
  s += '</g>';
  return s;
}

function wildlifeIllustration(kind, x, y, paintable) {
  let s = `<g transform="translate(${x}, ${y})" opacity="0.7">`;
  if (kind === 'Buffalo' || kind === 'Buffalo herd' || kind === 'Buffalo on plains') {
    s += `<ellipse cx="0" cy="0" rx="14" ry="6" fill="${paintable ? 'none' : C.deep_brown}" stroke="${C.deep_brown}" stroke-width="0.7"/>`;
    s += `<circle cx="-12" cy="-2" r="4" fill="${paintable ? 'none' : C.deep_brown}" stroke="${C.deep_brown}" stroke-width="0.6"/>`;
    s += `<line x1="-4" y1="6" x2="-4" y2="10" stroke="${C.deep_brown}" stroke-width="1"/>`;
    s += `<line x1="4" y1="6" x2="4" y2="10" stroke="${C.deep_brown}" stroke-width="1"/>`;
  } else if (kind.indexOf('Salmon') !== -1) {
    s += `<path d="M -10 0 Q -5 -5 6 -3 Q 12 -1 12 0 Q 12 1 6 3 Q -5 5 -10 0 Z" fill="${paintable ? 'none' : C.river_blue}" stroke="${C.deep_brown}" stroke-width="0.6"/>`;
    s += `<polygon points="-10,0 -13,-3 -13,3" fill="${C.deep_brown}"/>`;
  } else if (kind.indexOf('Elk') !== -1 || kind.indexOf('Deer') !== -1 || kind.indexOf('Antelope') !== -1) {
    s += `<rect x="-7" y="0" width="14" height="6" fill="${paintable ? 'none' : C.tan}" stroke="${C.deep_brown}" stroke-width="0.5"/>`;
    s += `<rect x="5" y="-3" width="3" height="6" fill="${paintable ? 'none' : C.tan}" stroke="${C.deep_brown}" stroke-width="0.5"/>`;
    s += `<line x1="6" y1="-3" x2="4" y2="-9" stroke="${C.deep_brown}" stroke-width="0.6"/>`;
    s += `<line x1="7" y1="-3" x2="10" y2="-8" stroke="${C.deep_brown}" stroke-width="0.6"/>`;
    s += `<line x1="-5" y1="6" x2="-5" y2="10" stroke="${C.deep_brown}" stroke-width="0.7"/>`;
    s += `<line x1="5" y1="6" x2="5" y2="10" stroke="${C.deep_brown}" stroke-width="0.7"/>`;
  } else if (kind.indexOf('Eagle') !== -1 || kind.indexOf('Hawk') !== -1) {
    s += `<path d="M -12 0 Q -6 -4 0 0 Q 6 -4 12 0" fill="none" stroke="${C.deep_brown}" stroke-width="1.2"/>`;
    s += `<circle cx="0" cy="-1" r="1.5" fill="${C.deep_brown}"/>`;
  } else {
    // Generic small animal
    s += `<ellipse cx="0" cy="0" rx="6" ry="3" fill="${paintable ? 'none' : C.tan}" stroke="${C.deep_brown}" stroke-width="0.5"/>`;
    s += `<circle cx="-5" cy="-1" r="1.8" fill="${paintable ? 'none' : C.tan}" stroke="${C.deep_brown}" stroke-width="0.5"/>`;
  }
  s += '</g>';
  return s;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =====================================================================
// TILE COMPOSITION
// =====================================================================

function buildTile(tile, paintable) {
  const w = 816, h = 1056; // letter portrait at 96dpi (8.5x11 inches)
  let s = '';
  s += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
  // Background
  s += `<rect width="${w}" height="${h}" fill="${paintable ? '#FFF' : C.parchment}"/>`;
  // Decorative borders
  s += decorativeBorder(w, h, paintable);
  // Title — period newspaper-masthead style
  s += `<text x="${w/2}" y="80" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="${C.deep_brown}" text-anchor="middle" letter-spacing="2">${escapeXml(tile.title)}</text>`;
  s += `<text x="${w/2}" y="105" font-family="Georgia, serif" font-style="italic" font-size="14" fill="${C.tan}" text-anchor="middle">${escapeXml(tile.region)}</text>`;
  // Corner vignette top-left
  s += cornerVignette(tile.cornerVignette, 70, 80, paintable);
  // Corner vignette top-right (mirror)
  s += cornerVignette(tile.cornerVignette, w - 70, 80, paintable);
  // Vignettes — arranged in a row above the trail
  const vCount = Math.min(4, tile.vignettes.length);
  const vSpacing = (w - 160) / vCount;
  for (let i = 0; i < vCount; i++) {
    const vx = 80 + i * vSpacing + (vSpacing - 110) / 2;
    s += vignetteIllustration(tile.vignettes[i], vx, 150, paintable);
  }
  // Trail line + spaces
  const trailObj = trailLine(tile.spaces, paintable, w, h - 200);
  s += trailObj.svg;
  tile.spaces.forEach((sp, i) => {
    const p = trailObj.points[i];
    s += spaceRoundel(sp, p.x, p.y, paintable);
  });
  // Wildlife illustrations — scattered around the trail
  const wildlifeCount = Math.min(3, tile.wildlife.length);
  const wPositions = [
    { x: 130, y: 700 },
    { x: w / 2, y: 770 },
    { x: w - 130, y: 700 }
  ];
  for (let i = 0; i < wildlifeCount; i++) {
    s += wildlifeIllustration(tile.wildlife[i], wPositions[i].x, wPositions[i].y, paintable);
  }
  // DYK scroll — bottom-center
  s += dykScroll(tile.dykText, (w - 180) / 2, 850, paintable);
  // Easter eggs — 3 hidden in different locations per tile
  const eePositions = [
    { kind: 'critter',  x: 100, y: 350 },
    { kind: 'flower',   x: w - 90, y: 540 },
    { kind: 'object',   x: w / 2 + 100, y: 980 }
  ];
  eePositions.forEach(ee => { s += easterEgg(ee.kind, ee.x, ee.y, paintable); });
  // Tile letter (corner badge bottom-right)
  s += `<g transform="translate(${w - 60}, ${h - 60})">`;
  s += `<circle cx="0" cy="0" r="20" fill="${paintable ? 'none' : C.trail_pink}" stroke="${C.deep_brown}" stroke-width="1.5"/>`;
  s += `<text x="0" y="6" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="${paintable ? C.deep_brown : C.cream}" text-anchor="middle">${escapeXml(tile.id)}</text>`;
  s += '</g>';
  // Footer
  s += `<text x="${w/2}" y="${h - 26}" font-family="Georgia, serif" font-size="9" font-style="italic" fill="${C.tan}" text-anchor="middle">Pink Oregon Trail · v3.3 · Designed by Gabriella Kasdaglis</text>`;
  s += '</svg>';
  return s;
}

function buildPoster(paintable) {
  // 36x24 inch landscape — combine all 6 Extended tiles into one panorama
  const w = 3456, h = 2304; // 36x24 at 96dpi
  let s = '';
  s += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
  s += `<rect width="${w}" height="${h}" fill="${paintable ? '#FFF' : C.parchment}"/>`;
  s += decorativeBorder(w, h, paintable);
  // Big title across the top
  s += `<text x="${w/2}" y="160" font-family="Georgia, serif" font-size="80" font-weight="bold" fill="${C.deep_brown}" text-anchor="middle" letter-spacing="6">PINK OREGON TRAIL</text>`;
  s += `<text x="${w/2}" y="220" font-family="Georgia, serif" font-style="italic" font-size="32" fill="${C.tan}" text-anchor="middle">Independence, Missouri to Oregon City — about 2,000 miles</text>`;
  // Combine all spaces from all tiles into one trail
  const allSpaces = [];
  EXTENDED_TILES.forEach(t => t.spaces.forEach(sp => allSpaces.push(sp)));
  const trailObj = trailLine(allSpaces, paintable, w, h);
  s += trailObj.svg;
  allSpaces.forEach((sp, i) => {
    const p = trailObj.points[i];
    s += spaceRoundel(sp, p.x, p.y, paintable);
  });
  // Wildlife scattered across the panorama
  const wildlife = [
    { k: 'Buffalo', x: w * 0.20, y: h * 0.40 },
    { k: 'Antelope', x: w * 0.32, y: h * 0.62 },
    { k: 'Eagle', x: w * 0.45, y: h * 0.30 },
    { k: 'Elk', x: w * 0.60, y: h * 0.65 },
    { k: 'Salmon', x: w * 0.75, y: h * 0.50 },
    { k: 'Deer', x: w * 0.85, y: h * 0.40 }
  ];
  wildlife.forEach(wd => { s += wildlifeIllustration(wd.k, wd.x, wd.y, paintable); });
  // Decorative scroll across the bottom-center
  s += dykScroll('The Oregon Trail was the longest emigrant route in 19th-century North America. Most pioneers walked the entire 2,000 miles.', (w - 180) / 2, h - 250, paintable);
  // Compass rose top-right
  s += cornerVignette('compass_rose', w - 200, 200, paintable);
  s += '</svg>';
  return s;
}

function pageHtml(title, svg) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${escapeXml(title)}</title>
<style>
@page { size: letter portrait; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; width: 8.5in; height: 11in; background: #FFF; }
body { display: flex; align-items: center; justify-content: center; }
svg { width: 8.5in; height: 11in; display: block; }
@media screen { body { padding: 20px; background: #2a2418; } svg { box-shadow: 0 4px 24px rgba(0,0,0,0.5); } }
</style></head><body>
${svg}
</body></html>`;
}

function posterPageHtml(title, svg) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${escapeXml(title)}</title>
<style>
@page { size: 36in 24in landscape; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #FFF; }
body { display: flex; align-items: center; justify-content: center; }
svg { width: 100%; height: 100%; max-width: 36in; max-height: 24in; display: block; }
@media screen { body { padding: 20px; background: #2a2418; min-height: 100vh; } svg { box-shadow: 0 4px 24px rgba(0,0,0,0.5); } }
</style></head><body>
${svg}
</body></html>`;
}

// =====================================================================
// EMIT FILES
// =====================================================================

let totalBytes = 0;
let fileCount = 0;

function writeFile(filename, content) {
  const fullPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(fullPath, content, 'utf8');
  const size = Buffer.byteLength(content, 'utf8');
  totalBytes += size;
  fileCount++;
  const okLabel = size < 800 * 1024 ? 'OK' : 'OVER';
  console.log(`  wrote ${filename.padEnd(48)} ${(size / 1024).toFixed(1).padStart(7)} KB ${okLabel}`);
}

console.log('=== v3.3 board generator ===');
console.log('Output: ' + OUT_DIR);
console.log('');

console.log('Extended tiles (12 files):');
EXTENDED_TILES.forEach(t => {
  writeFile(`board_extended_tile_${t.id}_decorated.html`, pageHtml(`Tile ${t.id}: ${t.title} (decorated)`, buildTile(t, false)));
  writeFile(`board_extended_tile_${t.id}_paintable.html`, pageHtml(`Tile ${t.id}: ${t.title} (paintable)`, buildTile(t, true)));
});

console.log('');
console.log('Short tile (2 files):');
writeFile(`board_short_tile_A_decorated.html`, pageHtml(`Short Tile: ${SHORT_TILE.title} (decorated)`, buildTile(SHORT_TILE, false)));
writeFile(`board_short_tile_A_paintable.html`, pageHtml(`Short Tile: ${SHORT_TILE.title} (paintable)`, buildTile(SHORT_TILE, true)));

console.log('');
console.log('Poster (2 files):');
writeFile(`board_poster_decorated.html`, posterPageHtml('Pink Oregon Trail — Wall Poster (decorated)', buildPoster(false)));
writeFile(`board_poster_paintable.html`, posterPageHtml('Pink Oregon Trail — Wall Poster (paintable)', buildPoster(true)));

console.log('');
console.log(`=== Done. ${fileCount} files, ${(totalBytes / 1024).toFixed(1)} KB total. ===`);
