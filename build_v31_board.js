#!/usr/bin/env node
// =====================================================================
// Pink Oregon Trail — v3.1 board generator
// =====================================================================
// Emits 15 self-contained HTML files into docs/ for the redesigned
// physical board:
//   board_short_tile_{A,B,C,D,E,F}_decorated.html  (6 files)
//   board_short_tile_{A,B,C,D,E,F}_paintable.html  (6 files)
//   board_poster_decorated.html
//   board_poster_paintable.html
//   PRINTING_AND_PAINTING_GUIDE.html
//
// Stage 0 (shared SVG library) is the bulk of this file. Each
// component function returns an SVG fragment string. Tile compositions
// arrange components into letter-sized portrait pages; the poster
// arranges them on a 36×24" landscape sheet.
//
// Each component takes a `paintable` flag — when true, fills become
// 'none' so paint shows through, strokes stay visible as guides.
// =====================================================================

'use strict';
const fs = require('fs');
const path = require('path');

// =====================================================================
// CONSTANTS
// =====================================================================
const PALETTE = {
  parchment:   '#F4E8D8',
  parchmentLo: '#E5D2A8',
  parchmentHi: '#FBF1D9',
  trail:       '#B85770',
  trailFaint:  '#D49AAD',
  mtn:         '#8B7A95',
  mtnDark:     '#5C4D6B',
  mtnSnow:     '#F5F1EC',
  forest:      '#5F7A5F',
  forestDark:  '#3D5A3D',
  river:       '#7A9DBE',
  riverDark:   '#5B7FA8',
  desert:      '#C8956D',
  desertDark:  '#A87850',
  sepia:       '#5C4A36',
  sepiaLi:     '#8B7558',
  sepiaXli:    '#B8A380',
  gold:        '#D4AF37',
  brick:       '#A24B3F',
  brickDark:   '#702E2A',
  clapboard:   '#FBF6F0',
  ink:         '#3D2817'
};

const TILE_W = 850;
const TILE_H = 1100;
const POSTER_W = 2592;
const POSTER_H = 1728;

// Tile letter → human-readable title + neighbor map
const TILES = {
  A: { title: 'Missouri & Eastern Kansas', subtitle: 'The Trail Begins',         neighbors: { right: 'B', below: null } },
  B: { title: 'Nebraska — Platte Country',  subtitle: 'Buffalo Plains',          neighbors: { left: 'A', right: 'C', below: 'E' } },
  C: { title: 'Wyoming Territory',          subtitle: 'Forts & Granite',         neighbors: { left: 'B', below: 'F' } },
  D: { title: 'Oregon Territory',           subtitle: "Journey's End",            neighbors: { right: 'E', above: null } },
  E: { title: 'Idaho — Snake River',        subtitle: 'Sagebrush & Hot Springs', neighbors: { left: 'D', right: 'F', above: 'B' } },
  F: { title: 'Idaho High Country',         subtitle: 'South Pass & Forts',      neighbors: { left: 'E', above: 'C' } }
};

const TILE_ORDER = ['A','B','C','D','E','F'];

// =====================================================================
// SMALL UTILITIES
// =====================================================================
function attr(o) {
  return Object.entries(o).map(([k,v]) => k + '="' + v + '"').join(' ');
}
function fillFor(p, paintable) { return paintable ? 'none' : p; }
function strokeFor(p, paintable) { return paintable ? PALETTE.sepiaLi : p; }

// =====================================================================
// STAGE 0 — SHARED SVG LIBRARY
// =====================================================================

// --- decorative / framing ---

function buildPaperGrain(width, height, opacity) {
  opacity = opacity == null ? 0.06 : opacity;
  return '<filter id="paperGrain" x="0" y="0" width="100%" height="100%">' +
           '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3"/>' +
           '<feColorMatrix values="0 0 0 0 0.36   0 0 0 0 0.29   0 0 0 0 0.21   0 0 0 ' + opacity + ' 0"/>' +
         '</filter>' +
         '<rect x="0" y="0" width="' + width + '" height="' + height + '" filter="url(#paperGrain)" opacity="0.9"/>';
}

function buildVignetteEdges(width, height) {
  return '<defs>' +
           '<radialGradient id="vignette" cx="0.5" cy="0.5" r="0.7">' +
             '<stop offset="0%" stop-color="' + PALETTE.parchmentHi + '" stop-opacity="0"/>' +
             '<stop offset="60%" stop-color="' + PALETTE.parchmentLo + '" stop-opacity="0"/>' +
             '<stop offset="100%" stop-color="' + PALETTE.sepia + '" stop-opacity="0.32"/>' +
           '</radialGradient>' +
         '</defs>' +
         '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="url(#vignette)" pointer-events="none"/>';
}

function buildDecorativeBorder(width, height, paintable) {
  const pad = 28;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  let g = '<g class="decorative-border">';
  // Outer + inner rectangles
  g += '<rect x="' + pad + '" y="' + pad + '" width="' + (width - pad*2) + '" height="' + (height - pad*2) + '" fill="none" stroke="' + stroke + '" stroke-width="2.5"/>';
  g += '<rect x="' + (pad+8) + '" y="' + (pad+8) + '" width="' + (width - (pad+8)*2) + '" height="' + (height - (pad+8)*2) + '" fill="none" stroke="' + stroke + '" stroke-width="0.8" opacity="0.7"/>';
  // Period motif: small wagon/star/fleur every 60 units along each edge
  const motifGap = 60;
  const motifs = ['★','✦','✣']; // triangle/star/fleur stand-ins; rendered as small text glyphs
  for (let x = pad + motifGap; x < width - pad - 20; x += motifGap) {
    const m = motifs[Math.floor(x / motifGap) % motifs.length];
    g += '<text x="' + x + '" y="' + (pad + 4) + '" text-anchor="middle" font-size="11" fill="' + stroke + '" opacity="0.7" font-family="Georgia, serif">' + m + '</text>';
    g += '<text x="' + x + '" y="' + (height - pad + 11) + '" text-anchor="middle" font-size="11" fill="' + stroke + '" opacity="0.7" font-family="Georgia, serif">' + m + '</text>';
  }
  for (let y = pad + motifGap; y < height - pad - 20; y += motifGap) {
    const m = motifs[Math.floor(y / motifGap) % motifs.length];
    g += '<text x="' + (pad - 4) + '" y="' + (y + 4) + '" text-anchor="middle" font-size="11" fill="' + stroke + '" opacity="0.7" font-family="Georgia, serif">' + m + '</text>';
    g += '<text x="' + (width - pad + 4) + '" y="' + (y + 4) + '" text-anchor="middle" font-size="11" fill="' + stroke + '" opacity="0.7" font-family="Georgia, serif">' + m + '</text>';
  }
  g += '</g>';
  return g;
}

function buildAlignmentDots(width, height) {
  // Pink registration dots at corners — small enough to not distract,
  // large enough that kids can align two tiles by stacking them.
  const r = 5;
  const inset = 14;
  let g = '<g class="alignment-dots">';
  [[inset, inset], [width-inset, inset], [inset, height-inset], [width-inset, height-inset]].forEach(([x,y]) => {
    g += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + PALETTE.trail + '" stroke="' + PALETTE.sepia + '" stroke-width="0.6" opacity="0.85"/>';
    g += '<circle cx="' + x + '" cy="' + y + '" r="1.2" fill="' + PALETTE.sepia + '"/>';
  });
  g += '</g>';
  return g;
}

function buildTileAssemblyLabel(width, height, tileLetter, neighbors) {
  // Lower-right corner — "Tile A of 6" with arrows showing neighbors
  const x = width - 200;
  const y = height - 56;
  let g = '<g class="tile-assembly-label" font-family="Georgia, serif" fill="' + PALETTE.sepia + '">';
  g += '<rect x="' + (x - 8) + '" y="' + (y - 16) + '" width="180" height="42" fill="' + PALETTE.parchmentHi + '" stroke="' + PALETTE.sepiaLi + '" stroke-width="0.8" rx="3" opacity="0.85"/>';
  g += '<text x="' + (x + 4) + '" y="' + y + '" font-size="13" font-weight="700">Tile ' + tileLetter + ' of 6</text>';
  // Neighbor arrows
  let nx = x + 76, ny = y - 4;
  if (neighbors.left)  g += '<text x="' + nx + '" y="' + ny + '" font-size="10" opacity="0.75">← ' + neighbors.left + '</text>', nx += 30;
  if (neighbors.right) g += '<text x="' + nx + '" y="' + ny + '" font-size="10" opacity="0.75">' + neighbors.right + ' →</text>', nx += 30;
  if (neighbors.above) g += '<text x="' + (x + 4) + '" y="' + (y + 14) + '" font-size="10" opacity="0.75">↑ ' + neighbors.above + '</text>';
  if (neighbors.below) g += '<text x="' + (x + 50) + '" y="' + (y + 14) + '" font-size="10" opacity="0.75">↓ ' + neighbors.below + '</text>';
  g += '</g>';
  return g;
}

function buildCartouche(x, y, w, h, title, subtitle, paintable) {
  const fill = paintable ? 'none' : PALETTE.parchmentHi;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  let g = '<g class="cartouche" transform="translate(' + x + ' ' + y + ')">';
  // Scroll body
  g += '<path d="M 16 8 L ' + (w-16) + ' 8 Q ' + (w-4) + ' 8 ' + (w-4) + ' ' + (h/2) + ' Q ' + (w-4) + ' ' + (h-8) + ' ' + (w-16) + ' ' + (h-8) + ' L 16 ' + (h-8) + ' Q 4 ' + (h-8) + ' 4 ' + (h/2) + ' Q 4 8 16 8 Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.4"/>';
  // Inner gold/sepia border line
  g += '<rect x="14" y="16" width="' + (w-28) + '" height="' + (h-32) + '" fill="none" stroke="' + (paintable ? stroke : PALETTE.gold) + '" stroke-width="0.7" opacity="0.85"/>';
  // Rolled ends
  g += '<circle cx="6" cy="' + (h/2) + '" r="6" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.2"/>';
  g += '<circle cx="' + (w-6) + '" cy="' + (h/2) + '" r="6" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.2"/>';
  // Title text
  g += '<text x="' + (w/2) + '" y="' + (h/2 - 4) + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + Math.max(10, h*0.32) + '" font-weight="700" fill="' + PALETTE.sepia + '">' + escapeXml(title || '') + '</text>';
  if (subtitle) {
    g += '<text x="' + (w/2) + '" y="' + (h/2 + h*0.27) + '" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="' + Math.max(8, h*0.18) + '" fill="' + PALETTE.sepiaLi + '">' + escapeXml(subtitle) + '</text>';
  }
  g += '</g>';
  return g;
}

function buildCompassRose(cx, cy, radius, ornate, paintable) {
  const fill1 = paintable ? 'none' : PALETTE.parchmentHi;
  const fillN = paintable ? 'none' : PALETTE.sepia;
  const fillE = paintable ? 'none' : PALETTE.parchmentLo;
  const fillG = paintable ? 'none' : PALETTE.gold;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  const r = radius;
  let g = '<g class="compass-rose" transform="translate(' + cx + ' ' + cy + ')">';
  // Outer + inner circles
  g += '<circle cx="0" cy="0" r="' + r + '" fill="' + fill1 + '" stroke="' + stroke + '" stroke-width="1.6"/>';
  g += '<circle cx="0" cy="0" r="' + (r * 0.78) + '" fill="none" stroke="' + stroke + '" stroke-width="0.6" opacity="0.7"/>';
  // 8 points (N/S/E/W full, NE/NW/SE/SW half)
  const big = r * 0.92, small = r * 0.5;
  // Cardinal points (NSEW) — long dark
  g += '<polygon points="0,-' + big + ' ' + (r*0.10) + ',0 0,' + big + ' -' + (r*0.10) + ',0" fill="' + fillN + '" stroke="' + stroke + '" stroke-width="0.6"/>';
  g += '<polygon points="-' + big + ',0 0,' + (r*0.10) + ' ' + big + ',0 0,-' + (r*0.10) + '" fill="' + fillE + '" stroke="' + stroke + '" stroke-width="0.6"/>';
  // Intercardinal points (NE/SE/SW/NW) — shorter, gold
  const c = small / Math.SQRT2;
  g += '<polygon points="' + c + ',-' + c + ' ' + (r*0.07) + ',0 -' + c + ',' + c + ' 0,-' + (r*0.07) + '" fill="' + fillG + '" stroke="' + stroke + '" stroke-width="0.4" opacity="0.85"/>';
  g += '<polygon points="-' + c + ',-' + c + ' 0,-' + (r*0.07) + ' ' + c + ',' + c + ' -' + (r*0.07) + ',0" fill="' + fillG + '" stroke="' + stroke + '" stroke-width="0.4" opacity="0.85"/>';
  // Fleur-de-lis style north tip (ornate variant)
  if (ornate) {
    g += '<path d="M 0 -' + (big + r*0.15) + ' Q ' + (r*0.05) + ' -' + (big + r*0.05) + ' 0 -' + big + ' Q -' + (r*0.05) + ' -' + (big + r*0.05) + ' 0 -' + (big + r*0.15) + ' Z" fill="' + fillN + '"/>';
    g += '<circle cx="0" cy="-' + (big + r*0.1) + '" r="' + (r*0.06) + '" fill="' + fillG + '" stroke="' + stroke + '" stroke-width="0.4"/>';
  }
  // Center hub
  g += '<circle cx="0" cy="0" r="' + (r*0.10) + '" fill="' + fillG + '" stroke="' + stroke + '" stroke-width="0.6"/>';
  // Letters NSEW
  const lr = r * 1.16;
  g += '<text x="0" y="-' + lr + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + (r*0.22) + '" font-weight="700" fill="' + PALETTE.sepia + '">N</text>';
  g += '<text x="0" y="' + (lr + r*0.18) + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + (r*0.22) + '" fill="' + PALETTE.sepia + '">S</text>';
  g += '<text x="' + lr + '" y="' + (r*0.07) + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + (r*0.22) + '" fill="' + PALETTE.sepia + '">E</text>';
  g += '<text x="-' + lr + '" y="' + (r*0.07) + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + (r*0.22) + '" fill="' + PALETTE.sepia + '">W</text>';
  g += '</g>';
  return g;
}

function buildScaleBar(x, y, label, paintable) {
  const w = 220, h = 22;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  let g = '<g class="scale-bar" transform="translate(' + x + ' ' + y + ')" font-family="Georgia, serif" fill="' + PALETTE.sepia + '">';
  g += '<line x1="0" y1="' + (h/2) + '" x2="' + w + '" y2="' + (h/2) + '" stroke="' + stroke + '" stroke-width="1.5"/>';
  for (let i = 0; i <= 4; i++) {
    const xx = (w / 4) * i;
    g += '<line x1="' + xx + '" y1="2" x2="' + xx + '" y2="' + (h-2) + '" stroke="' + stroke + '" stroke-width="1.2"/>';
  }
  g += '<text x="' + (w/2) + '" y="' + (h + 14) + '" text-anchor="middle" font-size="11" font-style="italic" opacity="0.85">' + escapeXml(label || '1 inch ≈ 70 miles') + '</text>';
  g += '</g>';
  return g;
}

// --- trail + spaces ---

function buildTrailLine(pathPoints, opts) {
  opts = opts || {};
  const color = opts.paintable ? PALETTE.trailFaint : (opts.color || PALETTE.trail);
  const width = opts.width || 5;
  if (!pathPoints || pathPoints.length < 2) return '';
  // Build a smoothed path through the waypoints with quadratic curves at midpoints
  let d = 'M ' + pathPoints[0].x.toFixed(1) + ' ' + pathPoints[0].y.toFixed(1);
  for (let i = 1; i < pathPoints.length; i++) {
    const a = pathPoints[i - 1], b = pathPoints[i];
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    d += ' Q ' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1);
    d += ' T ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
  }
  let g = '<g class="trail-line">';
  // Soft underline
  g += '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + (width * 1.8) + '" opacity="0.18" stroke-linecap="round"/>';
  // Main dashed
  g += '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-dasharray="' + (width*1.6) + ' ' + (width*1.2) + '" stroke-linecap="round" opacity="' + (opts.paintable ? 0.55 : 0.92) + '"/>';
  g += '</g>';
  return g;
}

function buildSpaceMarker(x, y, num, type, name, paintable) {
  const colors = {
    start:    paintable ? 'none' : '#4A7C3A',
    fort:     paintable ? 'none' : PALETTE.desertDark,
    river:    paintable ? 'none' : PALETTE.riverDark,
    landmark: paintable ? 'none' : '#F4D3DA',
    finish:   paintable ? 'none' : PALETTE.gold,
    plain:    paintable ? 'none' : PALETTE.parchmentHi
  };
  const radii = { start: 16, fort: 14, river: 13, landmark: 13, finish: 18, plain: 11 };
  const fill = colors[type] || colors.plain;
  const r = radii[type] || radii.plain;
  let g = '<g class="space-marker" data-type="' + type + '">';
  g += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '" stroke="' + PALETTE.sepia + '" stroke-width="1.4"/>';
  g += '<text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + (r * 0.85) + '" font-weight="700" fill="' + (paintable ? PALETTE.sepia : (type === 'start' || type === 'fort' || type === 'finish' ? '#FBF6F0' : PALETTE.sepia)) + '">' + num + '</text>';
  if (name) {
    g += '<text x="' + x + '" y="' + (y - r - 6) + '" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-weight="600" fill="' + PALETTE.sepia + '">' + escapeXml(name) + '</text>';
  }
  g += '</g>';
  return g;
}

// --- landmarks ---

function buildPalisadeFort(x, y, scale, opts) {
  scale = scale || 1;
  opts = opts || {};
  const paintable = opts.paintable;
  const w = 80 * scale, h = 60 * scale;
  const wallFill = paintable ? 'none' : (opts.style === 'british' ? '#A87850' : PALETTE.desertDark);
  const wallStroke = paintable ? PALETTE.sepiaLi : PALETTE.ink;
  const roofFill = paintable ? 'none' : (opts.style === 'british' ? '#7A4D3D' : '#8B5A2B');
  let g = '<g class="palisade-fort" transform="translate(' + x + ' ' + y + ')">';
  // Foundation shadow
  g += '<ellipse cx="' + (w/2) + '" cy="' + (h+3) + '" rx="' + (w*0.55) + '" ry="' + (4*scale) + '" fill="' + PALETTE.sepia + '" opacity="0.18"/>';
  // Palisade walls (back layer)
  g += '<rect x="0" y="' + (h*0.35) + '" width="' + w + '" height="' + (h*0.55) + '" fill="' + wallFill + '" stroke="' + wallStroke + '" stroke-width="' + (1.2*scale) + '"/>';
  // Vertical log lines
  const logs = Math.max(8, Math.floor(w / (5*scale)));
  for (let i = 1; i < logs; i++) {
    const lx = (w / logs) * i;
    g += '<line x1="' + lx + '" y1="' + (h*0.35) + '" x2="' + lx + '" y2="' + (h*0.9) + '" stroke="' + wallStroke + '" stroke-width="0.5" opacity="0.5"/>';
  }
  // Sharpened tops on the palisade — series of triangles
  for (let i = 0; i < logs; i++) {
    const lx = (w / logs) * i, lx2 = lx + w / logs;
    g += '<polygon points="' + lx + ',' + (h*0.35) + ' ' + ((lx+lx2)/2) + ',' + (h*0.22) + ' ' + lx2 + ',' + (h*0.35) + '" fill="' + wallFill + '" stroke="' + wallStroke + '" stroke-width="0.5"/>';
  }
  // Blockhouse / gate in middle
  if (opts.style === 'british') {
    // British: peaked-roof building
    g += '<rect x="' + (w*0.32) + '" y="' + (h*0.20) + '" width="' + (w*0.36) + '" height="' + (h*0.45) + '" fill="' + (paintable ? 'none' : '#8B7558') + '" stroke="' + wallStroke + '" stroke-width="' + (0.9*scale) + '"/>';
    g += '<polygon points="' + (w*0.30) + ',' + (h*0.20) + ' ' + (w*0.50) + ',' + (h*0.05) + ' ' + (w*0.70) + ',' + (h*0.20) + '" fill="' + roofFill + '" stroke="' + wallStroke + '" stroke-width="0.7"/>';
  } else {
    // American: square blockhouse with overhanging roof
    g += '<rect x="' + (w*0.34) + '" y="' + (h*0.18) + '" width="' + (w*0.32) + '" height="' + (h*0.40) + '" fill="' + roofFill + '" stroke="' + wallStroke + '" stroke-width="' + (0.9*scale) + '"/>';
    g += '<rect x="' + (w*0.30) + '" y="' + (h*0.16) + '" width="' + (w*0.40) + '" height="' + (h*0.06) + '" fill="' + roofFill + '" stroke="' + wallStroke + '" stroke-width="0.6"/>';
  }
  // Gate shadow
  g += '<rect x="' + (w*0.46) + '" y="' + (h*0.65) + '" width="' + (w*0.08) + '" height="' + (h*0.25) + '" fill="' + (paintable ? 'none' : PALETTE.ink) + '" opacity="0.65"/>';
  // Optional flag (American or British) — skip for paintable to keep paintable simple
  if (opts.hasFlag !== false && !paintable) {
    g += '<line x1="' + (w*0.50) + '" y1="' + (h*0.20) + '" x2="' + (w*0.50) + '" y2="-' + (h*0.10) + '" stroke="' + PALETTE.ink + '" stroke-width="' + (0.8*scale) + '"/>';
    if (opts.style === 'british') {
      g += '<rect x="' + (w*0.50) + '" y="-' + (h*0.10) + '" width="' + (w*0.18) + '" height="' + (h*0.10) + '" fill="#23408C" stroke="' + PALETTE.ink + '" stroke-width="0.4"/>';
      g += '<line x1="' + (w*0.50) + '" y1="-' + (h*0.10) + '" x2="' + (w*0.68) + '" y2="0" stroke="white" stroke-width="0.6"/>';
      g += '<line x1="' + (w*0.50) + '" y1="0" x2="' + (w*0.68) + '" y2="-' + (h*0.10) + '" stroke="white" stroke-width="0.6"/>';
    } else {
      g += '<rect x="' + (w*0.50) + '" y="-' + (h*0.10) + '" width="' + (w*0.18) + '" height="' + (h*0.10) + '" fill="' + PALETTE.brick + '" stroke="' + PALETTE.ink + '" stroke-width="0.4"/>';
      g += '<rect x="' + (w*0.50) + '" y="-' + (h*0.10) + '" width="' + (w*0.07) + '" height="' + (h*0.04) + '" fill="' + PALETTE.parchmentHi + '" stroke="' + PALETTE.ink + '" stroke-width="0.3"/>';
    }
  }
  g += '</g>';
  return g;
}

function buildChimneyRock(x, y, scale, paintable) {
  scale = scale || 1;
  const w = 90 * scale, h = 130 * scale;
  const fill = paintable ? 'none' : PALETTE.desert;
  const fillDark = paintable ? 'none' : PALETTE.desertDark;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  let g = '<g class="chimney-rock" transform="translate(' + x + ' ' + y + ')">';
  // Conical mound base
  g += '<polygon points="0,' + h + ' ' + (w*0.20) + ',' + (h*0.55) + ' ' + (w*0.80) + ',' + (h*0.55) + ' ' + w + ',' + h + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.2"/>';
  // Spire — narrow conical column
  g += '<polygon points="' + (w*0.42) + ',' + (h*0.55) + ' ' + (w*0.44) + ',0 ' + (w*0.56) + ',0 ' + (w*0.58) + ',' + (h*0.55) + '" fill="' + fillDark + '" stroke="' + stroke + '" stroke-width="1.1"/>';
  // Texture lines on the spire
  for (let i = 1; i < 5; i++) {
    const ty = (h*0.55) * (1 - i/5);
    g += '<line x1="' + (w*0.43) + '" y1="' + ty + '" x2="' + (w*0.57) + '" y2="' + ty + '" stroke="' + stroke + '" stroke-width="0.4" opacity="0.45"/>';
  }
  // Mound shadow
  g += '<path d="M ' + (w*0.20) + ' ' + (h*0.55) + ' L ' + (w*0.42) + ' ' + (h*0.55) + ' L ' + (w*0.42) + ' ' + h + ' Z" fill="' + (paintable ? 'none' : PALETTE.sepia) + '" opacity="0.18"/>';
  // Label tag below
  g += '<text x="' + (w/2) + '" y="' + (h + 14) + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + (10*scale) + '" font-style="italic" fill="' + PALETTE.sepia + '">Chimney Rock</text>';
  g += '</g>';
  return g;
}

function buildIndependenceRock(x, y, scale, paintable) {
  scale = scale || 1;
  const w = 130 * scale, h = 70 * scale;
  const fill = paintable ? 'none' : PALETTE.desert;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  let g = '<g class="independence-rock" transform="translate(' + x + ' ' + y + ')">';
  // Turtle-shell dome
  g += '<ellipse cx="' + (w/2) + '" cy="' + h + '" rx="' + (w*0.5) + '" ry="' + (h*0.7) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.2"/>';
  // Subtle "name carving" cross-hatch (not legible — just texture)
  if (!paintable) {
    for (let i = 0; i < 14; i++) {
      const tx = (w*0.10) + (Math.sin(i*1.7)*0.5 + 0.5) * (w*0.80);
      const ty = h*0.5 + (Math.cos(i*1.9)*0.5 + 0.5) * (h*0.4);
      const tw = 8 + (i%3)*4;
      g += '<line x1="' + tx + '" y1="' + ty + '" x2="' + (tx+tw) + '" y2="' + ty + '" stroke="' + PALETTE.sepia + '" stroke-width="0.3" opacity="0.55"/>';
    }
  }
  // Cracks running down the dome
  g += '<path d="M ' + (w*0.45) + ' ' + (h*0.30) + ' Q ' + (w*0.42) + ' ' + (h*0.55) + ' ' + (w*0.40) + ' ' + (h*0.92) + '" fill="none" stroke="' + stroke + '" stroke-width="0.6" opacity="0.55"/>';
  g += '<path d="M ' + (w*0.62) + ' ' + (h*0.35) + ' Q ' + (w*0.65) + ' ' + (h*0.60) + ' ' + (w*0.66) + ' ' + (h*0.94) + '" fill="none" stroke="' + stroke + '" stroke-width="0.5" opacity="0.55"/>';
  // Label
  g += '<text x="' + (w/2) + '" y="' + (h + 16) + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + (10*scale) + '" font-style="italic" fill="' + PALETTE.sepia + '">Independence Rock</text>';
  g += '</g>';
  return g;
}

function buildScottsBluff(x, y, scale, paintable) {
  scale = scale || 1;
  const w = 160 * scale, h = 80 * scale;
  const fill = paintable ? 'none' : PALETTE.desert;
  const fillDark = paintable ? 'none' : PALETTE.desertDark;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  let g = '<g class="scotts-bluff" transform="translate(' + x + ' ' + y + ')">';
  // Broad escarpment with stepped top
  g += '<path d="M 0 ' + h + ' L ' + (w*0.10) + ' ' + (h*0.50) + ' L ' + (w*0.30) + ' ' + (h*0.30) + ' L ' + (w*0.55) + ' ' + (h*0.18) + ' L ' + (w*0.75) + ' ' + (h*0.30) + ' L ' + (w*0.90) + ' ' + (h*0.55) + ' L ' + w + ' ' + h + ' Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.2"/>';
  // Cliff bands — horizontal striping
  for (let i = 0; i < 3; i++) {
    const yy = h * (0.45 + i * 0.18);
    g += '<line x1="' + (w*0.05) + '" y1="' + yy + '" x2="' + (w*0.95) + '" y2="' + yy + '" stroke="' + stroke + '" stroke-width="0.5" opacity="0.55"/>';
  }
  // Shadow under crest
  g += '<path d="M ' + (w*0.30) + ' ' + (h*0.30) + ' L ' + (w*0.55) + ' ' + (h*0.18) + ' L ' + (w*0.55) + ' ' + (h*0.32) + ' L ' + (w*0.30) + ' ' + (h*0.42) + ' Z" fill="' + fillDark + '" opacity="0.55"/>';
  g += '<text x="' + (w/2) + '" y="' + (h + 14) + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + (10*scale) + '" font-style="italic" fill="' + PALETTE.sepia + '">Scotts Bluff</text>';
  g += '</g>';
  return g;
}

function buildSouthPass(x, y, scale, paintable) {
  scale = scale || 1;
  const w = 220 * scale, h = 100 * scale;
  const fillL = paintable ? 'none' : PALETTE.mtn;
  const fillR = paintable ? 'none' : PALETTE.mtnDark;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  let g = '<g class="south-pass" transform="translate(' + x + ' ' + y + ')">';
  // Left mountain
  g += '<polygon points="0,' + h + ' ' + (w*0.30) + ',' + (h*0.05) + ' ' + (w*0.50) + ',' + h + '" fill="' + fillL + '" stroke="' + stroke + '" stroke-width="1.0"/>';
  // Right mountain
  g += '<polygon points="' + (w*0.50) + ',' + h + ' ' + (w*0.70) + ',' + (h*0.10) + ' ' + w + ',' + h + '" fill="' + fillR + '" stroke="' + stroke + '" stroke-width="1.0"/>';
  // Saddle highlight — gentle dip drawn slightly above
  g += '<path d="M ' + (w*0.30) + ' ' + (h*0.05) + ' Q ' + (w*0.50) + ' ' + (h*0.30) + ' ' + (w*0.70) + ' ' + (h*0.10) + '" fill="none" stroke="' + stroke + '" stroke-width="0.6" stroke-dasharray="3 3" opacity="0.7"/>';
  // Snow on peaks
  if (!paintable) {
    g += '<polygon points="' + (w*0.24) + ',' + (h*0.20) + ' ' + (w*0.30) + ',' + (h*0.05) + ' ' + (w*0.36) + ',' + (h*0.20) + '" fill="' + PALETTE.mtnSnow + '"/>';
    g += '<polygon points="' + (w*0.65) + ',' + (h*0.22) + ' ' + (w*0.70) + ',' + (h*0.10) + ' ' + (w*0.75) + ',' + (h*0.22) + '" fill="' + PALETTE.mtnSnow + '"/>';
  }
  g += '<text x="' + (w/2) + '" y="' + (h + 14) + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + (10*scale) + '" font-style="italic" fill="' + PALETTE.sepia + '">South Pass</text>';
  g += '</g>';
  return g;
}

function buildDevilsGate(x, y, scale, paintable) {
  scale = scale || 1;
  const w = 80 * scale, h = 60 * scale;
  const fill = paintable ? 'none' : PALETTE.desertDark;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  let g = '<g class="devils-gate" transform="translate(' + x + ' ' + y + ')">';
  // Two narrow vertical rock walls with river slot between
  g += '<polygon points="0,' + h + ' ' + (w*0.18) + ',' + (h*0.10) + ' ' + (w*0.34) + ',' + (h*0.20) + ' ' + (w*0.36) + ',' + h + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="0.9"/>';
  g += '<polygon points="' + (w*0.64) + ',' + h + ' ' + (w*0.66) + ',' + (h*0.20) + ' ' + (w*0.82) + ',' + (h*0.10) + ' ' + w + ',' + h + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="0.9"/>';
  // River slot
  g += '<rect x="' + (w*0.36) + '" y="' + (h*0.50) + '" width="' + (w*0.28) + '" height="' + (h*0.50) + '" fill="' + (paintable ? 'none' : PALETTE.river) + '" stroke="' + stroke + '" stroke-width="0.5" opacity="0.85"/>';
  g += '</g>';
  return g;
}

// --- scenery ---

function buildBuffaloHerd(x, y, count, scale, paintable) {
  scale = scale || 1;
  count = count || 5;
  let g = '<g class="buffalo-herd" transform="translate(' + x + ' ' + y + ')">';
  for (let i = 0; i < count; i++) {
    const bx = (i * 14 + (i%3)*4) * scale;
    const by = (Math.sin(i*1.3) * 4) * scale;
    const sz = (5 + (i%3)*1.5) * scale;
    g += '<ellipse cx="' + bx + '" cy="' + by + '" rx="' + sz + '" ry="' + (sz*0.55) + '" fill="' + (paintable ? 'none' : PALETTE.ink) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.4" opacity="' + (paintable ? 1 : 0.85) + '"/>';
    g += '<rect x="' + (bx-sz*0.7) + '" y="' + by + '" width="' + (sz*0.4) + '" height="' + (sz*0.7) + '" fill="' + (paintable ? 'none' : PALETTE.ink) + '" opacity="' + (paintable ? 1 : 0.85) + '"/>';
  }
  g += '</g>';
  return g;
}

function buildMountainRange(x, y, peakCount, opts) {
  opts = opts || {};
  const paintable = opts.paintable;
  peakCount = peakCount || 4;
  const fill = paintable ? 'none' : (opts.color || PALETTE.mtn);
  const fillDark = paintable ? 'none' : PALETTE.mtnDark;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  const w = (opts.width || 280);
  const h = (opts.height || 80);
  let g = '<g class="mountain-range" transform="translate(' + x + ' ' + y + ')">';
  // Back row (shorter, paler)
  let pts = 'M 0 ' + h + ' ';
  for (let i = 0; i < peakCount + 1; i++) {
    const px = (w / peakCount) * i;
    const py = (i === 0 || i === peakCount) ? h : h * (0.30 + (i%2)*0.15);
    pts += 'L ' + px + ' ' + py + ' ';
  }
  pts += 'L ' + w + ' ' + h + ' Z';
  g += '<path d="' + pts + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="0.9" opacity="0.85"/>';
  // Front row (taller, darker, slightly offset)
  let pts2 = 'M 0 ' + h + ' ';
  for (let i = 0; i < peakCount; i++) {
    const px = (w / peakCount) * (i + 0.5);
    const py = h * (0.10 + (i%2)*0.20);
    pts2 += 'L ' + px + ' ' + py + ' ';
  }
  pts2 += 'L ' + w + ' ' + h + ' Z';
  g += '<path d="' + pts2 + '" fill="' + fillDark + '" stroke="' + stroke + '" stroke-width="1.0"/>';
  // Snow caps on each front peak
  if (opts.snowCapped && !paintable) {
    for (let i = 0; i < peakCount; i++) {
      const px = (w / peakCount) * (i + 0.5);
      const py = h * (0.10 + (i%2)*0.20);
      g += '<polygon points="' + (px-12) + ',' + (py+18) + ' ' + px + ',' + py + ' ' + (px+12) + ',' + (py+18) + '" fill="' + PALETTE.mtnSnow + '"/>';
    }
  }
  g += '</g>';
  return g;
}

function buildPineForest(x, y, treeCount, scale, paintable) {
  scale = scale || 1;
  treeCount = treeCount || 8;
  const fill = paintable ? 'none' : PALETTE.forest;
  const fillDark = paintable ? 'none' : PALETTE.forestDark;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.sepia;
  let g = '<g class="pine-forest" transform="translate(' + x + ' ' + y + ')">';
  for (let i = 0; i < treeCount; i++) {
    const tx = (i * 12 + (i%3)*3) * scale;
    const ty = (Math.sin(i*1.7) * 4) * scale;
    const th = (24 + (i%3)*6) * scale;
    g += '<polygon points="' + tx + ',' + (ty+th) + ' ' + (tx+th*0.42) + ',' + ty + ' ' + (tx+th*0.84) + ',' + (ty+th) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="0.4"/>';
    g += '<rect x="' + (tx + th*0.36) + '" y="' + (ty+th) + '" width="' + (th*0.12) + '" height="' + (th*0.15) + '" fill="' + fillDark + '"/>';
  }
  g += '</g>';
  return g;
}

function buildPrairieGrass(x, y, w, h, paintable) {
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.forest;
  let g = '<g class="prairie-grass" transform="translate(' + x + ' ' + y + ')">';
  for (let i = 0; i < Math.floor(w / 6); i++) {
    const gx = (i * 6) + (i%5)*0.8;
    const gh = 6 + (i%4) * 3;
    g += '<line x1="' + gx + '" y1="' + h + '" x2="' + (gx + (i%2 ? 1 : -1)) + '" y2="' + (h-gh) + '" stroke="' + stroke + '" stroke-width="0.7" opacity="0.65"/>';
  }
  g += '</g>';
  return g;
}

function buildRiver(pathPoints, opts) {
  opts = opts || {};
  const opacity = opts.opacity != null ? opts.opacity : 0.7;
  const color = opts.paintable ? PALETTE.river : PALETTE.river;
  const colorDark = opts.paintable ? 'none' : PALETTE.riverDark;
  if (!pathPoints || pathPoints.length < 2) return '';
  let d = 'M ' + pathPoints[0].x + ' ' + pathPoints[0].y;
  for (let i = 1; i < pathPoints.length; i++) {
    const a = pathPoints[i - 1], b = pathPoints[i];
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2 + (i%2 ? 4 : -4);
    d += ' Q ' + cx + ' ' + cy + ' ' + b.x + ' ' + b.y;
  }
  let g = '<g class="river">';
  // Wide soft underline (water body)
  g += '<path d="' + d + '" fill="none" stroke="' + (opts.paintable ? 'none' : color) + '" stroke-width="' + (opts.width || 9) + '" opacity="' + opacity + '" stroke-linecap="round"/>';
  // Darker centerline (current)
  g += '<path d="' + d + '" fill="none" stroke="' + colorDark + '" stroke-width="' + ((opts.width || 9) * 0.4) + '" opacity="0.55" stroke-linecap="round"/>';
  // Outline-only stroke for paintable
  if (opts.paintable) {
    g += '<path d="' + d + '" fill="none" stroke="' + PALETTE.sepiaLi + '" stroke-width="1.2" opacity="0.7"/>';
  }
  g += '</g>';
  return g;
}

// --- vignettes ---

function buildSettlerVignette(x, y, scale, paintable) {
  scale = scale || 1;
  const fill = paintable ? 'none' : PALETTE.sepia;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.ink;
  let g = '<g class="settler-vignette" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">';
  // Father (left), mother (middle), child (right)
  // Father
  g += '<circle cx="0" cy="0" r="4.5" fill="' + (paintable ? 'none' : '#E8B888') + '" stroke="' + stroke + '" stroke-width="0.6"/>';
  g += '<rect x="-3" y="6" width="3.5" height="11" fill="' + fill + '" stroke="' + stroke + '" stroke-width="0.4"/>';
  g += '<rect x="-3" y="17" width="1.5" height="6" fill="' + PALETTE.ink + '"/>';
  g += '<rect x="-0.5" y="17" width="1.5" height="6" fill="' + PALETTE.ink + '"/>';
  g += '<rect x="-4.5" y="-3.5" width="9" height="2" fill="' + fill + '"/>';
  // Mother (slightly offset)
  g += '<circle cx="9" cy="2" r="4" fill="' + (paintable ? 'none' : '#F2C6A0') + '" stroke="' + stroke + '" stroke-width="0.6"/>';
  g += '<path d="M 5 8 L 13 8 L 14 22 L 4 22 Z" fill="' + (paintable ? 'none' : PALETTE.brick) + '" stroke="' + stroke + '" stroke-width="0.5"/>';
  // Child
  g += '<circle cx="17" cy="6" r="3" fill="' + (paintable ? 'none' : '#E8B888') + '" stroke="' + stroke + '" stroke-width="0.6"/>';
  g += '<rect x="15" y="10" width="4" height="8" fill="' + (paintable ? 'none' : '#5b7faf') + '" stroke="' + stroke + '" stroke-width="0.4"/>';
  g += '<rect x="15" y="18" width="1.4" height="4" fill="' + PALETTE.ink + '"/>';
  g += '<rect x="17.6" y="18" width="1.4" height="4" fill="' + PALETTE.ink + '"/>';
  g += '</g>';
  return g;
}

function buildOxenWagonVignette(x, y, scale, paintable) {
  scale = scale || 1;
  const wood = paintable ? 'none' : '#8B5A2B';
  const cloth = paintable ? 'none' : '#FBF6F0';
  const ox = paintable ? 'none' : '#5C4A36';
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.ink;
  let g = '<g class="oxen-wagon-vignette" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">';
  // Wagon (right)
  g += '<rect x="22" y="6" width="32" height="11" fill="' + wood + '" stroke="' + stroke + '" stroke-width="0.7"/>';
  g += '<path d="M 22 7 Q 38 -10 54 7 L 54 6 L 22 6 Z" fill="' + cloth + '" stroke="' + stroke + '" stroke-width="0.5"/>';
  g += '<circle cx="27" cy="20" r="4" fill="none" stroke="' + stroke + '" stroke-width="0.8"/>';
  g += '<circle cx="49" cy="20" r="4" fill="none" stroke="' + stroke + '" stroke-width="0.8"/>';
  // Yoke
  g += '<line x1="22" y1="14" x2="6" y2="14" stroke="' + stroke + '" stroke-width="0.7"/>';
  // Oxen (two)
  g += '<ellipse cx="-2" cy="14" rx="6" ry="4" fill="' + ox + '" stroke="' + stroke + '" stroke-width="0.5"/>';
  g += '<ellipse cx="6" cy="14" rx="3" ry="3" fill="' + ox + '" stroke="' + stroke + '" stroke-width="0.4"/>';
  g += '<polygon points="3,11 4,8 6,11" fill="' + ox + '"/>';
  g += '<polygon points="9,11 10,8 12,11" fill="' + ox + '"/>';
  g += '<rect x="-7" y="18" width="1.4" height="4" fill="' + (paintable ? 'none' : ox) + '" stroke="' + stroke + '" stroke-width="0.3"/>';
  g += '<rect x="2" y="18" width="1.4" height="4" fill="' + (paintable ? 'none' : ox) + '" stroke="' + stroke + '" stroke-width="0.3"/>';
  g += '</g>';
  return g;
}

function buildCampfireVignette(x, y, scale, paintable) {
  scale = scale || 1;
  const fire = paintable ? 'none' : '#D6863A';
  const fireHot = paintable ? 'none' : PALETTE.gold;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.ink;
  let g = '<g class="campfire-vignette" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">';
  // Flame
  g += '<path d="M 0 12 Q -3 2 0 -6 Q 3 2 0 12 Z" fill="' + fire + '" stroke="' + stroke + '" stroke-width="0.5"/>';
  g += '<path d="M 0 10 Q -1.5 4 0 0 Q 1.5 4 0 10 Z" fill="' + fireHot + '"/>';
  // Logs
  g += '<line x1="-8" y1="14" x2="6" y2="11" stroke="' + (paintable ? 'none' : PALETTE.ink) + '" stroke-width="2.5"/>';
  g += '<line x1="-6" y1="11" x2="8" y2="14" stroke="' + (paintable ? 'none' : PALETTE.ink) + '" stroke-width="2.5"/>';
  // Two seated travelers (silhouettes)
  g += '<circle cx="-15" cy="8" r="2.5" fill="' + (paintable ? 'none' : '#E8B888') + '" stroke="' + stroke + '" stroke-width="0.5"/>';
  g += '<path d="M -18 11 Q -15 22 -12 11 Z" fill="' + (paintable ? 'none' : PALETTE.sepia) + '" stroke="' + stroke + '" stroke-width="0.4"/>';
  g += '<circle cx="15" cy="8" r="2.5" fill="' + (paintable ? 'none' : '#F2C6A0') + '" stroke="' + stroke + '" stroke-width="0.5"/>';
  g += '<path d="M 12 11 Q 15 22 18 11 Z" fill="' + (paintable ? 'none' : PALETTE.brick) + '" stroke="' + stroke + '" stroke-width="0.4"/>';
  g += '</g>';
  return g;
}

function buildPawneeGuideVignette(x, y, scale, paintable) {
  // Respectful representation: helper figure with a pointing gesture,
  // dignified posture. No stereotypical regalia — just period-correct
  // clothing in earth tones.
  scale = scale || 1;
  const stroke = paintable ? PALETTE.sepiaLi : PALETTE.ink;
  const skin = paintable ? 'none' : '#9B6B3F';
  const cloth = paintable ? 'none' : PALETTE.desertDark;
  let g = '<g class="pawnee-guide-vignette" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">';
  g += '<circle cx="0" cy="0" r="4.5" fill="' + skin + '" stroke="' + stroke + '" stroke-width="0.6"/>';
  // Long shirt/tunic
  g += '<path d="M -5 6 L 5 6 L 7 22 L -7 22 Z" fill="' + cloth + '" stroke="' + stroke + '" stroke-width="0.5"/>';
  // Pointing arm
  g += '<line x1="5" y1="9" x2="14" y2="3" stroke="' + skin + '" stroke-width="2.4" stroke-linecap="round"/>';
  // Feet
  g += '<rect x="-5" y="22" width="3.5" height="3" fill="' + (paintable ? 'none' : PALETTE.ink) + '"/>';
  g += '<rect x="1.5" y="22" width="3.5" height="3" fill="' + (paintable ? 'none' : PALETTE.ink) + '"/>';
  g += '</g>';
  return g;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// =====================================================================
// STAGE 1-2 — TILE COMPOSITIONS
// =====================================================================
// Each tile is a viewBox 0 0 850 1100 portrait page. Trail flows
// through differently per the per-tile spec. The renderTile() helper
// emits both decorated and paintable variants from one composition.

function _bgParchment(paintable) {
  // Solid parchment fill or, for paintable, very light wash.
  return '<defs>' +
           '<radialGradient id="bgParchment" cx="0.5" cy="0.45" r="0.85">' +
             '<stop offset="0%" stop-color="' + (paintable ? '#FFFFFF' : PALETTE.parchmentHi) + '"/>' +
             '<stop offset="100%" stop-color="' + (paintable ? '#FBFAF6' : PALETTE.parchmentLo) + '"/>' +
           '</radialGradient>' +
         '</defs>' +
         '<rect x="0" y="0" width="' + TILE_W + '" height="' + TILE_H + '" fill="url(#bgParchment)"/>';
}

function tileA(paintable) {
  // MO/KS plains. Trail starts top-right (continues to Tile B).
  // Independence MO town in lower-right corner. Kansas + Big Blue river
  // crossings. Tall prairie grass. Compass rose anchors top-left.
  let svg = '';
  svg += _bgParchment(paintable);
  svg += buildVignetteEdges(TILE_W, TILE_H);
  // Compass rose top-left (this tile only)
  svg += buildCompassRose(140, 160, 78, true, paintable);
  // State label
  svg += '<text x="425" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="48" font-style="italic" fill="' + PALETTE.sepia + '" opacity="' + (paintable ? 0.35 : 0.25) + '" letter-spacing="6">MISSOURI</text>';
  // Big Blue River (small crossing) — lower-third
  svg += buildRiver([{x:120,y:780},{x:280,y:760},{x:420,y:790},{x:540,y:770}], { paintable: paintable, opacity: 0.55, width: 8 });
  svg += '<text x="320" y="755" font-family="Georgia, serif" font-style="italic" font-size="13" fill="' + PALETTE.riverDark + '" opacity="0.8">Big Blue River</text>';
  // Kansas River — bigger, lower
  svg += buildRiver([{x:60,y:920},{x:240,y:900},{x:480,y:930},{x:720,y:910}], { paintable: paintable, opacity: 0.6, width: 11 });
  svg += '<text x="380" y="895" font-family="Georgia, serif" font-style="italic" font-size="14" fill="' + PALETTE.riverDark + '" opacity="0.85">Kansas River</text>';
  // Prairie grass band
  svg += buildPrairieGrass(50, 1010, 750, 30, paintable);
  // Independence MO town (lower-right) — small frontier silhouettes
  const tx = 580, ty = 1000;
  // Storefronts
  for (let i = 0; i < 4; i++) {
    const sx = tx + i * 38;
    const sh = 28 + (i%2)*8;
    svg += '<rect x="' + sx + '" y="' + (ty - sh) + '" width="32" height="' + sh + '" fill="' + (paintable ? 'none' : PALETTE.brick) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.7"/>';
    svg += '<polygon points="' + sx + ',' + (ty - sh) + ' ' + (sx + 16) + ',' + (ty - sh - 10) + ' ' + (sx + 32) + ',' + (ty - sh) + '" fill="' + (paintable ? 'none' : PALETTE.brickDark) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.5"/>';
    svg += '<rect x="' + (sx + 12) + '" y="' + (ty - sh + 10) + '" width="8" height="' + (sh - 12) + '" fill="' + (paintable ? 'none' : PALETTE.ink) + '" opacity="' + (paintable ? 1 : 0.8) + '"/>';
  }
  svg += '<text x="' + (tx + 70) + '" y="' + (ty + 20) + '" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-weight="700" fill="' + PALETTE.sepia + '">Independence</text>';
  // Wagon train silhouettes leaving town (upper-right of town)
  svg += buildOxenWagonVignette(450, 940, 1.0, paintable);
  svg += buildOxenWagonVignette(380, 870, 0.8, paintable);
  // Trail — starts at Independence, flows up-right, exits top-right edge
  const trail = [
    { x: 660, y: 990 }, // Independence
    { x: 600, y: 880 },
    { x: 540, y: 760 },
    { x: 580, y: 620 },
    { x: 670, y: 480 },
    { x: 760, y: 340 },
    { x: 820, y: 220 }  // exits to Tile B
  ];
  svg += buildTrailLine(trail, { paintable: paintable, width: 6 });
  // Space markers — 1 (start), 2, 3, 4
  svg += buildSpaceMarker(660, 990, 1, 'start',    'Independence, MO', paintable);
  svg += buildSpaceMarker(540, 760, 2, 'river',    'Big Blue River', paintable);
  svg += buildSpaceMarker(670, 480, 3, 'plain',    null, paintable);
  svg += buildSpaceMarker(820, 220, 4, 'plain',    null, paintable);
  // Title cartouche top-center
  svg += buildCartouche(280, 230, 290, 60, TILES.A.title, TILES.A.subtitle, paintable);
  // Settlers vignette near town
  svg += buildSettlerVignette(560, 870, 1.1, paintable);
  // Border + alignment + label
  svg += buildDecorativeBorder(TILE_W, TILE_H, paintable);
  svg += buildAlignmentDots(TILE_W, TILE_H);
  svg += buildTileAssemblyLabel(TILE_W, TILE_H, 'A', TILES.A.neighbors);
  if (!paintable) svg += buildPaperGrain(TILE_W, TILE_H, 0.05);
  return svg;
}

function tileB(paintable) {
  // Nebraska / Platte. Trail enters from left (Tile A), exits right (Tile C).
  // Platte River wide ribbon spanning horizontally. Fort Kearny.
  // Buffalo herd. Chimney Rock. Scotts Bluff. Ash Hollow.
  let svg = '';
  svg += _bgParchment(paintable);
  svg += buildVignetteEdges(TILE_W, TILE_H);
  // State label
  svg += '<text x="425" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="48" font-style="italic" fill="' + PALETTE.sepia + '" opacity="' + (paintable ? 0.35 : 0.25) + '" letter-spacing="6">NEBRASKA</text>';
  // Platte River — wide ribbon spanning the tile, slightly south of center
  svg += buildRiver([{x:0,y:680},{x:200,y:660},{x:420,y:690},{x:640,y:670},{x:850,y:700}], { paintable: paintable, opacity: 0.65, width: 18 });
  svg += '<text x="425" y="740" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="16" fill="' + PALETTE.riverDark + '" opacity="0.85">Platte River</text>';
  // Buffalo herd on horizon (upper-third)
  svg += buildBuffaloHerd(180, 320, 7, 1.0, paintable);
  svg += buildBuffaloHerd(540, 290, 5, 0.9, paintable);
  // Fort Kearny — palisade silhouette near the river
  svg += buildPalisadeFort(120, 560, 0.85, { paintable: paintable, style: 'american', hasFlag: true });
  svg += '<text x="160" y="660" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="' + PALETTE.sepia + '" font-weight="600">Fort Kearny</text>';
  // Ash Hollow — small valley with trees, mid
  svg += buildPineForest(280, 800, 5, 0.7, paintable);
  svg += '<text x="320" y="880" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.85">Ash Hollow</text>';
  // Scotts Bluff — broad escarpment, right-mid
  svg += buildScottsBluff(440, 470, 1.0, paintable);
  // Chimney Rock — distinctive conical spire, lower-mid
  svg += buildChimneyRock(680, 800, 0.85, paintable);
  // Trail — enters left, weaves through Platte country, exits right
  const trail = [
    { x: 0,   y: 250 },
    { x: 120, y: 320 },
    { x: 280, y: 360 },
    { x: 420, y: 420 },
    { x: 560, y: 400 },
    { x: 680, y: 460 },
    { x: 820, y: 520 }
  ];
  svg += buildTrailLine(trail, { paintable: paintable, width: 6 });
  // Space markers
  svg += buildSpaceMarker(120, 320, 5, 'fort',     'Fort Kearny', paintable);
  svg += buildSpaceMarker(280, 360, 6, 'plain',    null, paintable);
  svg += buildSpaceMarker(420, 420, 7, 'landmark', 'Ash Hollow', paintable);
  svg += buildSpaceMarker(560, 400, 8, 'landmark', 'Scotts Bluff', paintable);
  svg += buildSpaceMarker(680, 460, 9, 'landmark', 'Chimney Rock', paintable);
  // Title cartouche
  svg += buildCartouche(280, 220, 290, 60, TILES.B.title, TILES.B.subtitle, paintable);
  // Border + alignment + label
  svg += buildDecorativeBorder(TILE_W, TILE_H, paintable);
  svg += buildAlignmentDots(TILE_W, TILE_H);
  svg += buildTileAssemblyLabel(TILE_W, TILE_H, 'B', TILES.B.neighbors);
  if (!paintable) svg += buildPaperGrain(TILE_W, TILE_H, 0.05);
  return svg;
}

function tileC(paintable) {
  // Wyoming foothills. Fort Laramie. Sweetwater River. Independence
  // Rock. Devil's Gate. Trail bends down at lower-right toward Tile F.
  let svg = '';
  svg += _bgParchment(paintable);
  svg += buildVignetteEdges(TILE_W, TILE_H);
  svg += '<text x="425" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-style="italic" fill="' + PALETTE.sepia + '" opacity="' + (paintable ? 0.35 : 0.25) + '" letter-spacing="5">WYOMING TERRITORY</text>';
  // Sweetwater River — meanders across mid-tile
  svg += buildRiver([{x:60,y:560},{x:220,y:540},{x:380,y:580},{x:560,y:540},{x:780,y:570}], { paintable: paintable, opacity: 0.5, width: 8 });
  svg += '<text x="320" y="530" font-family="Georgia, serif" font-style="italic" font-size="12" fill="' + PALETTE.riverDark + '" opacity="0.85">Sweetwater River</text>';
  // Fort Laramie — larger fort
  svg += buildPalisadeFort(80, 280, 1.10, { paintable: paintable, style: 'american', hasFlag: true });
  svg += '<text x="125" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="' + PALETTE.sepia + '" font-weight="700">Fort Laramie</text>';
  // Independence Rock — turtle-shell dome
  svg += buildIndependenceRock(380, 660, 1.0, paintable);
  // Devil's Gate — narrow river canyon
  svg += buildDevilsGate(580, 820, 0.95, paintable);
  svg += '<text x="618" y="900" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-style="italic" fill="' + PALETTE.sepia + '">Devil\'s Gate</text>';
  // Mountain hills (background)
  svg += buildMountainRange(160, 820, 4, { paintable: paintable, color: PALETTE.mtn, snowCapped: false, width: 380, height: 70 });
  // Trail — enters left, bends down toward lower-right (toward Tile F)
  const trail = [
    { x: 0,   y: 380 },
    { x: 140, y: 420 },
    { x: 280, y: 480 },
    { x: 440, y: 540 },
    { x: 540, y: 660 },
    { x: 640, y: 820 },
    { x: 760, y: 1010 } // exits toward Tile F (below)
  ];
  svg += buildTrailLine(trail, { paintable: paintable, width: 6 });
  svg += buildSpaceMarker(140, 420, 10, 'fort',     'Fort Laramie', paintable);
  svg += buildSpaceMarker(280, 480, 11, 'plain',    null, paintable);
  svg += buildSpaceMarker(440, 540, 12, 'landmark', 'Independence Rock', paintable);
  svg += buildSpaceMarker(640, 820, 13, 'landmark', "Devil's Gate", paintable);
  svg += buildCartouche(280, 220, 290, 60, TILES.C.title, TILES.C.subtitle, paintable);
  svg += buildDecorativeBorder(TILE_W, TILE_H, paintable);
  svg += buildAlignmentDots(TILE_W, TILE_H);
  svg += buildTileAssemblyLabel(TILE_W, TILE_H, 'C', TILES.C.neighbors);
  if (!paintable) svg += buildPaperGrain(TILE_W, TILE_H, 0.05);
  return svg;
}

function tileF(paintable) {
  // Idaho high country / Wyoming. South Pass. Fort Bridger. Soda Springs. Fort Hall.
  let svg = '';
  svg += _bgParchment(paintable);
  svg += buildVignetteEdges(TILE_W, TILE_H);
  svg += '<text x="425" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-style="italic" fill="' + PALETTE.sepia + '" opacity="' + (paintable ? 0.35 : 0.25) + '" letter-spacing="5">IDAHO TERRITORY</text>';
  // Mountain backdrop — Rockies (faded, deep background)
  svg += buildMountainRange(40, 270, 5, { paintable: paintable, color: PALETTE.mtn, snowCapped: true, width: 760, height: 130 });
  // South Pass — gentle saddle
  svg += buildSouthPass(170, 380, 1.0, paintable);
  // Fort Bridger — smaller log palisade
  svg += buildPalisadeFort(120, 580, 0.75, { paintable: paintable, style: 'american', hasFlag: true });
  svg += '<text x="151" y="660" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="' + PALETTE.sepia + '" font-weight="600">Fort Bridger</text>';
  // Soda Springs — bubbling springs with steam
  const springsX = 460, springsY = 700;
  svg += '<g class="soda-springs" transform="translate(' + springsX + ' ' + springsY + ')">';
  svg += '<ellipse cx="0" cy="20" rx="38" ry="8" fill="' + (paintable ? 'none' : PALETTE.river) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.7" opacity="0.65"/>';
  // Bubbles
  for (let i = 0; i < 6; i++) {
    svg += '<circle cx="' + ((i-2.5)*9) + '" cy="20" r="2" fill="' + (paintable ? 'none' : '#FFFFFF') + '" stroke="' + PALETTE.sepia + '" stroke-width="0.3" opacity="0.7"/>';
  }
  // Steam wisps
  if (!paintable) {
    for (let i = 0; i < 4; i++) {
      svg += '<path d="M ' + ((i-1.5)*16) + ' 12 Q ' + ((i-1.5)*16 - 4) + ' -8 ' + ((i-1.5)*16 + 4) + ' -22" fill="none" stroke="' + PALETTE.parchmentHi + '" stroke-width="2" opacity="0.55"/>';
    }
  }
  svg += '</g>';
  svg += '<text x="' + springsX + '" y="' + (springsY + 50) + '" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-style="italic" fill="' + PALETTE.sepia + '">Soda Springs</text>';
  // Fort Hall — British style trading post
  svg += buildPalisadeFort(610, 820, 0.85, { paintable: paintable, style: 'british', hasFlag: true });
  svg += '<text x="655" y="910" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="' + PALETTE.sepia + '" font-weight="600">Fort Hall</text>';
  // Trail — enters from top (continuing from Tile C), exits to the left toward Tile E
  const trail = [
    { x: 760, y: 0    },  // entry from Tile C
    { x: 700, y: 160  },
    { x: 580, y: 280  },
    { x: 380, y: 460  },
    { x: 260, y: 620  },
    { x: 200, y: 760  },
    { x: 0,   y: 880  }   // exit to Tile E
  ];
  svg += buildTrailLine(trail, { paintable: paintable, width: 6 });
  svg += buildSpaceMarker(580, 280, 14, 'landmark', 'South Pass', paintable);
  svg += buildSpaceMarker(380, 460, 15, 'fort',     'Fort Bridger', paintable);
  svg += buildSpaceMarker(260, 620, 16, 'landmark', 'Soda Springs', paintable);
  svg += buildSpaceMarker(200, 760, 17, 'fort',     'Fort Hall', paintable);
  svg += buildCartouche(280, 220, 290, 60, TILES.F.title, TILES.F.subtitle, paintable);
  svg += buildDecorativeBorder(TILE_W, TILE_H, paintable);
  svg += buildAlignmentDots(TILE_W, TILE_H);
  svg += buildTileAssemblyLabel(TILE_W, TILE_H, 'F', TILES.F.neighbors);
  if (!paintable) svg += buildPaperGrain(TILE_W, TILE_H, 0.05);
  return svg;
}

function tileE(paintable) {
  // Idaho / Snake River. Snake River with oxbow. Fort Boise. Three
  // Island Crossing. Massacre Rocks. Hot springs. Sagebrush. Trail
  // flows right-to-left.
  let svg = '';
  svg += _bgParchment(paintable);
  svg += buildVignetteEdges(TILE_W, TILE_H);
  svg += '<text x="425" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-style="italic" fill="' + PALETTE.sepia + '" opacity="' + (paintable ? 0.35 : 0.25) + '" letter-spacing="5">SNAKE RIVER COUNTRY</text>';
  // Snake River — dramatic oxbow curve
  svg += buildRiver([
    { x: 850, y: 320 },
    { x: 720, y: 360 },
    { x: 600, y: 420 },
    { x: 540, y: 540 },
    { x: 600, y: 660 },  // oxbow loop
    { x: 720, y: 700 },
    { x: 580, y: 780 },
    { x: 380, y: 760 },
    { x: 200, y: 720 },
    { x: 60,  y: 700 }
  ], { paintable: paintable, opacity: 0.7, width: 14 });
  svg += '<text x="660" y="650" font-family="Georgia, serif" font-style="italic" font-size="16" fill="' + PALETTE.riverDark + '" opacity="0.85">Snake River</text>';
  // Fort Boise — palisade near river bend
  svg += buildPalisadeFort(140, 600, 0.85, { paintable: paintable, style: 'british', hasFlag: false });
  svg += '<text x="184" y="690" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="' + PALETTE.sepia + '" font-weight="600">Fort Boise</text>';
  // Three Island Crossing — three small islands in the river
  for (let i = 0; i < 3; i++) {
    svg += '<ellipse cx="' + (320 + i*40) + '" cy="780" rx="14" ry="6" fill="' + (paintable ? 'none' : PALETTE.desert) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.5"/>';
  }
  svg += '<text x="380" y="820" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.85">Three Island Crossing</text>';
  // Massacre Rocks — small rocky outcrop, sober
  svg += '<g transform="translate(680, 880)">';
  svg += '<polygon points="0,30 12,12 24,18 36,8 50,28 50,36 0,36" fill="' + (paintable ? 'none' : PALETTE.desertDark) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.7"/>';
  svg += '<text x="25" y="60" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.7">Massacre Rocks</text>';
  svg += '</g>';
  // Hot springs — steam rising
  if (!paintable) {
    svg += '<g transform="translate(380, 460)">';
    for (let i = 0; i < 3; i++) {
      svg += '<ellipse cx="' + (i*22) + '" cy="0" rx="10" ry="3" fill="' + PALETTE.river + '" opacity="0.55"/>';
      svg += '<path d="M ' + (i*22) + ' -4 Q ' + (i*22 - 6) + ' -22 ' + (i*22 + 6) + ' -40" fill="none" stroke="' + PALETTE.parchmentHi + '" stroke-width="1.6" opacity="0.6"/>';
    }
    svg += '<text x="22" y="20" text-anchor="middle" font-family="Georgia, serif" font-size="9" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.8">hot springs</text>';
    svg += '</g>';
  }
  // Sagebrush dotted across high desert
  for (let i = 0; i < 12; i++) {
    const sx = 80 + (i*60) + (i%3)*8;
    const sy = 320 + (i%4)*40;
    svg += '<circle cx="' + sx + '" cy="' + sy + '" r="' + (3 + i%3) + '" fill="' + (paintable ? 'none' : PALETTE.forest) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.3" opacity="0.7"/>';
  }
  // Trail — flows right-to-left across the tile
  const trail = [
    { x: 850, y: 880 },
    { x: 760, y: 820 },
    { x: 580, y: 780 },
    { x: 380, y: 780 },
    { x: 200, y: 720 },
    { x: 60,  y: 700 }
  ];
  svg += buildTrailLine(trail, { paintable: paintable, width: 6 });
  svg += buildSpaceMarker(760, 820, 18, 'plain',    null, paintable);
  svg += buildSpaceMarker(580, 780, 19, 'river',    null, paintable);
  svg += buildSpaceMarker(380, 780, 20, 'river',    'Three Islands', paintable);
  svg += buildSpaceMarker(200, 720, 21, 'fort',     'Fort Boise', paintable);
  svg += buildCartouche(280, 220, 290, 60, TILES.E.title, TILES.E.subtitle, paintable);
  svg += buildDecorativeBorder(TILE_W, TILE_H, paintable);
  svg += buildAlignmentDots(TILE_W, TILE_H);
  svg += buildTileAssemblyLabel(TILE_W, TILE_H, 'E', TILES.E.neighbors);
  if (!paintable) svg += buildPaperGrain(TILE_W, TILE_H, 0.05);
  return svg;
}

function tileD(paintable) {
  // Pacific NW. Cascade Mountains. Whitman Mission. Walla Walla. The
  // Dalles. Columbia River. Oregon City + Willamette Falls. Pacific
  // Ocean strip at western edge.
  let svg = '';
  svg += _bgParchment(paintable);
  svg += buildVignetteEdges(TILE_W, TILE_H);
  svg += '<text x="425" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-style="italic" fill="' + PALETTE.sepia + '" opacity="' + (paintable ? 0.35 : 0.25) + '" letter-spacing="5">OREGON TERRITORY</text>';
  // Pacific Ocean strip (western edge — left side of this tile since we're on the left of assembled board)
  if (!paintable) {
    svg += '<linearGradient id="pacGradD" x1="0" y1="0" x2="1" y2="0">' +
             '<stop offset="0%" stop-color="' + PALETTE.river + '" stop-opacity="0.65"/>' +
             '<stop offset="100%" stop-color="' + PALETTE.river + '" stop-opacity="0"/>' +
           '</linearGradient>';
    svg += '<rect x="28" y="180" width="62" height="850" fill="url(#pacGradD)"/>';
  } else {
    svg += '<rect x="28" y="180" width="62" height="850" fill="none" stroke="' + PALETTE.sepiaLi + '" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.7"/>';
  }
  svg += '<text x="60" y="960" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="11" fill="' + PALETTE.riverDark + '" opacity="0.8" transform="rotate(-90, 60, 960)">Pacific Ocean</text>';
  // Cascade Mountains — snow-capped peaks across upper-mid
  svg += buildMountainRange(120, 280, 5, { paintable: paintable, color: PALETTE.mtn, snowCapped: true, width: 700, height: 160 });
  svg += '<text x="280" y="280" font-family="Georgia, serif" font-style="italic" font-size="12" fill="' + PALETTE.sepia + '" opacity="0.7">Cascade Range</text>';
  // The Dalles — Columbia River narrowing through basalt cliffs (mid)
  svg += '<g transform="translate(530, 580)">';
  svg += '<rect x="-40" y="0" width="80" height="50" fill="' + (paintable ? 'none' : '#3D3328') + '" stroke="' + PALETTE.sepia + '" stroke-width="0.7"/>';
  svg += '<rect x="-50" y="20" width="100" height="14" fill="' + (paintable ? 'none' : PALETTE.river) + '" opacity="0.7"/>';
  // Native fishermen on platforms — small dignified silhouettes
  svg += '<rect x="-32" y="14" width="22" height="6" fill="' + (paintable ? 'none' : '#8B5A2B') + '" stroke="' + PALETTE.sepia + '" stroke-width="0.4"/>';
  svg += '<rect x="12" y="14" width="22" height="6" fill="' + (paintable ? 'none' : '#8B5A2B') + '" stroke="' + PALETTE.sepia + '" stroke-width="0.4"/>';
  if (!paintable) {
    svg += '<circle cx="-20" cy="9" r="2" fill="#9B6B3F"/>';
    svg += '<rect x="-21" y="11" width="2" height="4" fill="' + PALETTE.desertDark + '"/>';
    svg += '<circle cx="22" cy="9" r="2" fill="#9B6B3F"/>';
    svg += '<rect x="21" y="11" width="2" height="4" fill="' + PALETTE.desertDark + '"/>';
  }
  svg += '<text x="0" y="80" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="' + PALETTE.sepia + '" font-weight="600">The Dalles</text>';
  svg += '</g>';
  // Whitman Mission — small white clapboard building, treated solemnly
  svg += '<g transform="translate(650, 460)">';
  svg += '<rect x="0" y="0" width="36" height="22" fill="' + (paintable ? 'none' : PALETTE.clapboard) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.7"/>';
  svg += '<polygon points="-2,0 18,-12 38,0" fill="' + (paintable ? 'none' : PALETTE.brickDark) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.5"/>';
  svg += '<rect x="14" y="10" width="6" height="12" fill="' + (paintable ? 'none' : PALETTE.ink) + '" opacity="' + (paintable ? 1 : 0.7) + '"/>';
  svg += '<line x1="-6" y1="22" x2="44" y2="22" stroke="' + PALETTE.sepia + '" stroke-width="0.5"/>';
  svg += '<text x="18" y="45" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.85">Whitman Mission</text>';
  svg += '</g>';
  // Columbia River — widens toward Pacific (left edge)
  svg += buildRiver([{x:580,y:610},{x:480,y:640},{x:360,y:680},{x:220,y:730},{x:90,y:780}], { paintable: paintable, opacity: 0.7, width: 16 });
  svg += '<text x="280" y="700" font-family="Georgia, serif" font-style="italic" font-size="13" fill="' + PALETTE.riverDark + '" opacity="0.85">Columbia River</text>';
  // Walla Walla / Blue Mountains
  svg += buildPineForest(620, 740, 5, 0.7, paintable);
  svg += '<text x="660" y="820" text-anchor="middle" font-family="Georgia, serif" font-size="9" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.7">Blue Mountains</text>';
  // Oregon City + Willamette Falls (lower-left, the finish)
  svg += '<g transform="translate(160, 880)">';
  // Falls — vertical white streaks
  svg += '<rect x="-10" y="0" width="38" height="20" fill="' + (paintable ? 'none' : PALETTE.river) + '" opacity="0.7"/>';
  for (let i = 0; i < 4; i++) {
    svg += '<line x1="' + (-4 + i*8) + '" y1="20" x2="' + (-4 + i*8) + '" y2="50" stroke="' + (paintable ? PALETTE.sepiaLi : PALETTE.parchmentHi) + '" stroke-width="2" opacity="0.85"/>';
  }
  svg += '<text x="14" y="75" text-anchor="middle" font-family="Georgia, serif" font-size="9" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.85">Willamette Falls</text>';
  // Town
  svg += '<rect x="40" y="-10" width="50" height="35" fill="' + (paintable ? 'none' : PALETTE.brick) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.7"/>';
  svg += '<polygon points="40,-10 65,-22 90,-10" fill="' + (paintable ? 'none' : PALETTE.brickDark) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.5"/>';
  svg += '<rect x="50" y="0" width="6" height="14" fill="' + (paintable ? 'none' : PALETTE.ink) + '" opacity="0.7"/>';
  svg += '<rect x="60" y="0" width="6" height="14" fill="' + (paintable ? 'none' : PALETTE.ink) + '" opacity="0.7"/>';
  svg += '<rect x="74" y="0" width="6" height="14" fill="' + (paintable ? 'none' : PALETTE.ink) + '" opacity="0.7"/>';
  svg += '<text x="65" y="48" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-weight="700" fill="' + PALETTE.sepia + '">Oregon City</text>';
  svg += '</g>';
  // Trail — enters from right (Tile E), descends through Cascades to Oregon City
  const trail = [
    { x: 850, y: 700 },
    { x: 720, y: 680 },
    { x: 580, y: 660 },
    { x: 460, y: 700 },
    { x: 350, y: 760 },
    { x: 240, y: 820 },
    { x: 180, y: 900 }   // Oregon City finish
  ];
  svg += buildTrailLine(trail, { paintable: paintable, width: 6 });
  svg += buildSpaceMarker(720, 680, 22, 'landmark', 'Whitman Mission', paintable);
  svg += buildSpaceMarker(580, 660, 23, 'landmark', 'The Dalles', paintable);
  svg += buildSpaceMarker(350, 760, 24, 'river',    'Columbia', paintable);
  svg += buildSpaceMarker(180, 900, 25, 'finish',   'Oregon City', paintable);
  svg += buildCartouche(280, 220, 290, 60, TILES.D.title, TILES.D.subtitle, paintable);
  svg += buildDecorativeBorder(TILE_W, TILE_H, paintable);
  svg += buildAlignmentDots(TILE_W, TILE_H);
  svg += buildTileAssemblyLabel(TILE_W, TILE_H, 'D', TILES.D.neighbors);
  if (!paintable) svg += buildPaperGrain(TILE_W, TILE_H, 0.05);
  return svg;
}

const TILE_FNS = { A: tileA, B: tileB, C: tileC, D: tileD, E: tileE, F: tileF };

// =====================================================================
// HTML wrapper for tile / poster output
// =====================================================================
function wrapTilePage(tileLetter, paintable, svgBody) {
  const tileMeta = TILES[tileLetter];
  const variant = paintable ? 'paintable' : 'decorated';
  return '<!DOCTYPE html>\n' +
    '<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8"/>\n' +
    '<title>Pink Oregon Trail — Tile ' + tileLetter + ' (' + variant + ')</title>\n' +
    '<style>\n' +
    '  @page { size: letter portrait; margin: 0.25in; }\n' +
    '  * { box-sizing: border-box; margin: 0; padding: 0; }\n' +
    '  html, body { background: #FFF; color: #3D2817; font-family: Georgia, serif; }\n' +
    '  body { display: flex; flex-direction: column; align-items: center; padding: 16px; }\n' +
    '  .hdr { text-align: center; max-width: 8in; margin-bottom: 12px; }\n' +
    '  .hdr h1 { font-size: 22px; color: ' + PALETTE.sepia + '; }\n' +
    '  .hdr .meta { font-size: 13px; color: ' + PALETTE.sepiaLi + '; font-style: italic; }\n' +
    '  .tile-frame { width: 8in; height: 10.36in; background: #FFF; box-shadow: 0 4px 18px rgba(60,42,22,0.18); }\n' +
    '  .tile-frame svg { width: 100%; height: 100%; display: block; }\n' +
    '  @media print {\n' +
    '    body { padding: 0; box-shadow: none; }\n' +
    '    .hdr, .footer { display: none; }\n' +
    '    .tile-frame { box-shadow: none; width: 8in; height: 10.36in; }\n' +
    '  }\n' +
    '  .footer { font-size: 11px; color: ' + PALETTE.sepiaLi + '; margin-top: 12px; max-width: 8in; text-align: center; font-style: italic; }\n' +
    '</style>\n</head>\n<body>\n' +
    '<div class="hdr"><h1>Tile ' + tileLetter + ' — ' + escapeXml(tileMeta.title) + '</h1>' +
       '<div class="meta">' + (paintable ? 'Paintable variant — print and paint over' : 'Decorated variant — print as-is') + '</div></div>\n' +
    '<div class="tile-frame">\n' +
      '<svg viewBox="0 0 ' + TILE_W + ' ' + TILE_H + '" xmlns="http://www.w3.org/2000/svg">\n' +
        svgBody + '\n' +
      '</svg>\n' +
    '</div>\n' +
    '<div class="footer">Pink Oregon Trail v3.1 · Tile ' + tileLetter + ' of 6 · ' + variant + '. Pair with neighbouring tiles via the pink corner registration dots; see PRINTING_AND_PAINTING_GUIDE.html for assembly.</div>\n' +
    '</body>\n</html>\n';
}

// =====================================================================
// STAGE 3-4 — POSTER COMPOSITION
// =====================================================================
function buildPoster(paintable) {
  let svg = '';
  // Background — full parchment with subtle radial vignette
  svg += '<defs>' +
           '<radialGradient id="posterBg" cx="0.5" cy="0.5" r="0.85">' +
             '<stop offset="0%" stop-color="' + (paintable ? '#FFFFFF' : PALETTE.parchmentHi) + '"/>' +
             '<stop offset="80%" stop-color="' + (paintable ? '#FBFAF6' : PALETTE.parchmentLo) + '"/>' +
             '<stop offset="100%" stop-color="' + (paintable ? '#F2EEE3' : '#D4BC92') + '"/>' +
           '</radialGradient>' +
         '</defs>';
  svg += '<rect x="0" y="0" width="' + POSTER_W + '" height="' + POSTER_H + '" fill="url(#posterBg)"/>';
  svg += buildVignetteEdges(POSTER_W, POSTER_H);

  // Region scenery zones — laid out so the S-curve trail flows through them
  // Plains (lower-third, right-to-middle)
  if (!paintable) {
    svg += '<rect x="1500" y="1200" width="1000" height="380" fill="' + PALETTE.forest + '" opacity="0.10"/>';
  }
  // Wyoming zone (middle)
  // Mountain zone (upper-middle)
  if (!paintable) {
    svg += '<rect x="800" y="600" width="1100" height="380" fill="' + PALETTE.mtn + '" opacity="0.08"/>';
  }
  // Desert zone (upper-middle-right)
  // Pacific Northwest zone (upper-left)
  if (!paintable) {
    svg += '<rect x="100" y="200" width="700" height="600" fill="' + PALETTE.forest + '" opacity="0.10"/>';
  }
  // Pacific Ocean strip — far left
  if (!paintable) {
    svg += '<linearGradient id="posterPac" x1="0" y1="0" x2="1" y2="0">' +
             '<stop offset="0%" stop-color="' + PALETTE.river + '" stop-opacity="0.55"/>' +
             '<stop offset="100%" stop-color="' + PALETTE.river + '" stop-opacity="0"/>' +
           '</linearGradient>';
    svg += '<rect x="60" y="200" width="120" height="1300" fill="url(#posterPac)"/>';
  } else {
    svg += '<rect x="60" y="200" width="120" height="1300" fill="none" stroke="' + PALETTE.sepiaLi + '" stroke-width="1" stroke-dasharray="6 6" opacity="0.7"/>';
  }
  svg += '<text x="120" y="900" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-style="italic" fill="' + PALETTE.riverDark + '" opacity="0.85" transform="rotate(-90, 120, 900)">Pacific Ocean</text>';

  // Mountain ranges
  svg += buildMountainRange(820, 540, 6, { paintable: paintable, color: PALETTE.mtn, snowCapped: true, width: 1100, height: 220 });
  svg += '<text x="1370" y="540" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.7">Rocky Mountains</text>';
  svg += buildMountainRange(180, 380, 4, { paintable: paintable, color: PALETTE.mtn, snowCapped: true, width: 600, height: 200 });
  svg += '<text x="480" y="370" text-anchor="middle" font-family="Georgia, serif" font-size="20" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.7">Cascade Range</text>';

  // Pine forests in PNW
  svg += buildPineForest(220, 760, 18, 1.4, paintable);
  svg += buildPineForest(420, 820, 14, 1.3, paintable);

  // Buffalo herds in Plains
  svg += buildBuffaloHerd(1700, 1300, 12, 1.6, paintable);
  svg += buildBuffaloHerd(2100, 1380, 8, 1.4, paintable);

  // Prairie grass band
  svg += buildPrairieGrass(1500, 1600, 1000, 80, paintable);

  // Sagebrush in desert region
  for (let i = 0; i < 30; i++) {
    const sx = 800 + (i*55) + (i%3)*12;
    const sy = 1050 + (i%5)*30;
    svg += '<circle cx="' + sx + '" cy="' + sy + '" r="' + (5 + i%4) + '" fill="' + (paintable ? 'none' : PALETTE.forest) + '" stroke="' + PALETTE.sepia + '" stroke-width="0.4" opacity="0.6"/>';
  }

  // Major rivers
  svg += buildRiver([{x:2500,y:1380},{x:2300,y:1360},{x:2100,y:1390},{x:1900,y:1370},{x:1700,y:1400}], { paintable: paintable, opacity: 0.55, width: 26 }); // Platte
  svg += '<text x="2100" y="1450" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="22" fill="' + PALETTE.riverDark + '" opacity="0.85">Platte River</text>';
  svg += buildRiver([{x:1450,y:920},{x:1280,y:900},{x:1100,y:880},{x:920,y:900},{x:760,y:880}], { paintable: paintable, opacity: 0.6, width: 22 }); // Snake
  svg += '<text x="1100" y="850" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="22" fill="' + PALETTE.riverDark + '" opacity="0.85">Snake River</text>';
  svg += buildRiver([{x:780,y:780},{x:600,y:740},{x:440,y:700},{x:280,y:700}], { paintable: paintable, opacity: 0.6, width: 20 }); // Columbia
  svg += '<text x="540" y="680" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="20" fill="' + PALETTE.riverDark + '" opacity="0.85">Columbia River</text>';

  // Landmarks
  svg += buildScottsBluff(1900, 1180, 1.6, paintable);
  svg += buildChimneyRock(2150, 1240, 1.4, paintable);
  svg += buildIndependenceRock(1500, 1080, 1.6, paintable);
  svg += buildSouthPass(1100, 760, 1.6, paintable);

  // Forts
  svg += buildPalisadeFort(2240, 1320, 1.4, { paintable: paintable, style: 'american', hasFlag: true });
  svg += '<text x="2296" y="1450" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="' + PALETTE.sepia + '" font-weight="700">Fort Kearny</text>';
  svg += buildPalisadeFort(1740, 1080, 1.5, { paintable: paintable, style: 'american', hasFlag: true });
  svg += '<text x="1800" y="1220" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="' + PALETTE.sepia + '" font-weight="700">Fort Laramie</text>';
  svg += buildPalisadeFort(1200, 880, 1.2, { paintable: paintable, style: 'american', hasFlag: true });
  svg += '<text x="1248" y="990" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="' + PALETTE.sepia + '" font-weight="700">Fort Bridger</text>';
  svg += buildPalisadeFort(900, 820, 1.3, { paintable: paintable, style: 'british', hasFlag: true });
  svg += '<text x="952" y="940" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="' + PALETTE.sepia + '" font-weight="700">Fort Hall</text>';
  svg += buildPalisadeFort(620, 800, 1.2, { paintable: paintable, style: 'british', hasFlag: false });
  svg += '<text x="668" y="900" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="' + PALETTE.sepia + '" font-weight="700">Fort Boise</text>';

  // The S-curve trail across the landscape: starts lower-right (Independence MO),
  // rises through Wyoming, turns NW through Idaho, finishes upper-left (Oregon City)
  const trail = [
    { x: 2440, y: 1480 },  // 1  Independence MO
    { x: 2300, y: 1420 },  // 2  Big Blue
    { x: 2200, y: 1380 },  // 3
    { x: 2080, y: 1380 },  // 4
    { x: 1960, y: 1340 },  // 5  Fort Kearny
    { x: 1840, y: 1320 },  // 6
    { x: 1720, y: 1290 },  // 7  Ash Hollow
    { x: 1600, y: 1260 },  // 8  Scotts Bluff
    { x: 1480, y: 1220 },  // 9  Chimney Rock
    { x: 1380, y: 1180 },  // 10 Fort Laramie
    { x: 1280, y: 1130 },  // 11
    { x: 1200, y: 1080 },  // 12 Independence Rock
    { x: 1140, y: 1010 },  // 13 Devil's Gate
    { x: 1080, y: 940  },  // 14 South Pass
    { x: 1020, y: 880  },  // 15 Fort Bridger
    { x: 940,  y: 840  },  // 16 Soda Springs
    { x: 860,  y: 820  },  // 17 Fort Hall
    { x: 780,  y: 820  },  // 18
    { x: 700,  y: 820  },  // 19
    { x: 620,  y: 800  },  // 20 Three Islands
    { x: 540,  y: 780  },  // 21 Fort Boise
    { x: 460,  y: 760  },  // 22 Whitman Mission
    { x: 400,  y: 720  },  // 23 The Dalles
    { x: 340,  y: 660  },  // 24 Columbia
    { x: 280,  y: 580  }   // 25 Oregon City
  ];
  svg += buildTrailLine(trail, { paintable: paintable, width: 11 });
  // Mark all 25 spaces with numbered markers
  const labels = {
    1: { type: 'start',    name: 'Independence' },
    5: { type: 'fort',     name: 'Fort Kearny' },
    10:{ type: 'fort',     name: 'Fort Laramie' },
    12:{ type: 'landmark', name: 'Independence Rock' },
    14:{ type: 'landmark', name: 'South Pass' },
    15:{ type: 'fort',     name: 'Fort Bridger' },
    17:{ type: 'fort',     name: 'Fort Hall' },
    21:{ type: 'fort',     name: 'Fort Boise' },
    25:{ type: 'finish',   name: 'Oregon City' }
  };
  trail.forEach((p, idx) => {
    const num = idx + 1;
    const meta = labels[num] || { type: 'plain', name: null };
    svg += buildSpaceMarker(p.x, p.y, num, meta.type, meta.name, paintable);
  });

  // Title cartouche — upper-center
  svg += buildCartouche(POSTER_W/2 - 480, 80, 960, 180, 'PINK OREGON TRAIL — 1848', 'A History Game Designed by Gabby Kasdaglis', paintable);
  // Quill-and-inkwell vignette decoration
  if (!paintable) {
    svg += '<g transform="translate(' + (POSTER_W/2 - 380) + ', 200)">';
    svg += '<rect x="0" y="0" width="22" height="14" fill="' + PALETTE.ink + '" stroke="' + PALETTE.sepia + '" stroke-width="0.6"/>';
    svg += '<line x1="22" y1="-4" x2="60" y2="-44" stroke="' + PALETTE.sepia + '" stroke-width="2"/>';
    svg += '<polygon points="60,-44 65,-50 68,-44" fill="' + PALETTE.sepia + '"/>';
    svg += '</g>';
    svg += buildOxenWagonVignette(POSTER_W/2 + 320, 200, 2.8, paintable);
  }

  // Compass rose — lower-right corner
  svg += buildCompassRose(POSTER_W - 280, POSTER_H - 280, 200, true, paintable);

  // Scale bar — bottom-center
  svg += buildScaleBar(POSTER_W/2 - 110, POSTER_H - 80, '1 inch ≈ 70 miles', paintable);

  // Four corner vignettes
  svg += buildSettlerVignette(180, 180, 4.0, paintable);
  svg += '<text x="200" y="320" text-anchor="middle" font-family="Georgia, serif" font-size="16" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.85">A Settler Family</text>';
  svg += buildOxenWagonVignette(POSTER_W - 320, 220, 4.0, paintable);
  svg += '<text x="' + (POSTER_W - 220) + '" y="360" text-anchor="middle" font-family="Georgia, serif" font-size="16" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.85">Oxen &amp; Wagon</text>';
  svg += buildPawneeGuideVignette(180, POSTER_H - 240, 4.0, paintable);
  svg += '<text x="200" y="' + (POSTER_H - 100) + '" text-anchor="middle" font-family="Georgia, serif" font-size="16" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.85">A Pawnee Guide</text>';
  svg += buildCampfireVignette(POSTER_W - 320, POSTER_H - 280, 4.0, paintable);
  svg += '<text x="' + (POSTER_W - 320) + '" y="' + (POSTER_H - 140) + '" text-anchor="middle" font-family="Georgia, serif" font-size="16" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.85">Camp at Dusk</text>';

  // State labels — faint italic under the trail
  svg += '<text x="2380" y="1640" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.32" letter-spacing="6">MISSOURI</text>';
  svg += '<text x="1920" y="1640" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.32" letter-spacing="6">KANSAS / NEBRASKA</text>';
  svg += '<text x="1320" y="1640" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.32" letter-spacing="6">WYOMING</text>';
  svg += '<text x="800" y="1640" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.32" letter-spacing="6">IDAHO</text>';
  svg += '<text x="280" y="1640" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-style="italic" fill="' + PALETTE.sepia + '" opacity="0.32" letter-spacing="6">OREGON</text>';

  // Decorative border
  svg += buildDecorativeBorder(POSTER_W, POSTER_H, paintable);
  // Paper grain overlay — last so it tints everything
  if (!paintable) svg += buildPaperGrain(POSTER_W, POSTER_H, 0.04);
  return svg;
}

function wrapPosterPage(paintable, svgBody) {
  const variant = paintable ? 'paintable' : 'decorated';
  return '<!DOCTYPE html>\n' +
    '<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8"/>\n' +
    '<title>Pink Oregon Trail — Wall Poster (' + variant + ')</title>\n' +
    '<style>\n' +
    '  @page { size: 36in 24in landscape; margin: 0.5in; }\n' +
    '  * { box-sizing: border-box; margin: 0; padding: 0; }\n' +
    '  html, body { background: #FFF; color: #3D2817; font-family: Georgia, serif; }\n' +
    '  body { padding: 16px; display: flex; flex-direction: column; align-items: center; }\n' +
    '  .hdr { text-align: center; margin-bottom: 12px; max-width: 32in; }\n' +
    '  .hdr h1 { font-size: 26px; color: ' + PALETTE.sepia + '; }\n' +
    '  .hdr .meta { font-size: 14px; color: ' + PALETTE.sepiaLi + '; font-style: italic; margin-top: 6px; }\n' +
    '  .poster-frame { width: 35in; height: 23.33in; max-width: 100%; box-shadow: 0 8px 36px rgba(60,42,22,0.25); background: #FFF; }\n' +
    '  .poster-frame svg { width: 100%; height: 100%; display: block; }\n' +
    '  @media print {\n' +
    '    body { padding: 0; }\n' +
    '    .hdr, .footer { display: none; }\n' +
    '    .poster-frame { box-shadow: none; width: 35in; height: 23.33in; }\n' +
    '  }\n' +
    '  .footer { font-size: 13px; color: ' + PALETTE.sepiaLi + '; margin-top: 14px; max-width: 32in; text-align: center; font-style: italic; }\n' +
    '</style>\n</head>\n<body>\n' +
    '<div class="hdr"><h1>Pink Oregon Trail — Wall Poster</h1>' +
       '<div class="meta">' + (paintable ? 'Paintable variant — print on cardstock, paint over the outlines' : 'Decorated variant — print as-is for an instant historical map') + '</div></div>\n' +
    '<div class="poster-frame">\n' +
      '<svg viewBox="0 0 ' + POSTER_W + ' ' + POSTER_H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">\n' +
        svgBody + '\n' +
      '</svg>\n' +
    '</div>\n' +
    '<div class="footer">36×24 inch landscape · Print at Staples Engineering Prints or Posters · See PRINTING_AND_PAINTING_GUIDE.html for paper, paint, sealing, and tips.</div>\n' +
    '</body>\n</html>\n';
}

// =====================================================================
// STAGE 5 — PRINTING & PAINTING GUIDE
// =====================================================================
function buildGuidePage() {
  return '<!DOCTYPE html>\n' +
'<html lang="en">\n<head>\n<meta charset="UTF-8"/>\n' +
'<title>Pink Oregon Trail — Printing &amp; Painting Guide</title>\n' +
'<style>\n' +
'  @page { size: letter portrait; margin: 0.6in; }\n' +
'  * { box-sizing: border-box; margin: 0; padding: 0; }\n' +
'  html, body { background: ' + PALETTE.parchmentHi + '; color: ' + PALETTE.sepia + '; font-family: Georgia, "Times New Roman", serif; line-height: 1.6; }\n' +
'  body { max-width: 7.4in; margin: 0 auto; padding: 32px 28px; }\n' +
'  h1 { font-size: 30px; color: ' + PALETTE.sepia + '; border-bottom: 3px double ' + PALETTE.sepiaLi + '; padding-bottom: 10px; margin-bottom: 18px; text-align: center; letter-spacing: 0.04em; }\n' +
'  h2 { font-size: 19px; color: ' + PALETTE.trail + '; margin: 22px 0 8px; border-bottom: 1px solid ' + PALETTE.sepiaLi + '; padding-bottom: 4px; }\n' +
'  h3 { font-size: 15px; color: ' + PALETTE.sepia + '; margin: 14px 0 6px; }\n' +
'  p, li { font-size: 14px; }\n' +
'  ul, ol { margin: 6px 0 6px 22px; }\n' +
'  li { margin-bottom: 4px; }\n' +
'  table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 13px; }\n' +
'  th, td { border: 1px solid ' + PALETTE.sepiaLi + '; padding: 6px 8px; text-align: left; vertical-align: top; }\n' +
'  th { background: ' + PALETTE.parchmentLo + '; }\n' +
'  .palette-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }\n' +
'  .palette-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; background: white; border: 1px solid ' + PALETTE.sepiaLi + '; border-radius: 4px; }\n' +
'  .palette-swatch { width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0; border: 1px solid ' + PALETTE.sepia + '; }\n' +
'  .palette-info { font-size: 12px; }\n' +
'  .palette-info b { display: block; font-size: 13px; }\n' +
'  .tip { background: ' + PALETTE.parchmentLo + '; border-left: 4px solid ' + PALETTE.trail + '; padding: 10px 14px; margin: 10px 0; border-radius: 4px; }\n' +
'  .tip em { color: ' + PALETTE.trail + '; font-weight: 700; font-style: normal; }\n' +
'  @media print { body { padding: 0; } h1 { page-break-after: avoid; } h2 { page-break-after: avoid; } }\n' +
'</style>\n</head>\n<body>\n' +
'<h1>Pink Oregon Trail — Printing &amp; Painting Guide</h1>\n' +
'<p style="text-align:center;font-style:italic;margin-bottom:16px;">A beautiful hand-painted Oregon Trail board for Gabby&rsquo;s history class. This guide walks through printing, painting, sealing, and using it for the game.</p>\n' +
'<h2>1. Print options</h2>\n' +
'<table><tr><th>Format</th><th>What you get</th><th>Cost</th></tr>\n' +
'<tr><td><b>Tile version</b></td><td>6 letter-size tiles printed at home, taped together, glued to foam board</td><td>$0 if home printer; $5&ndash;10 foam board</td></tr>\n' +
'<tr><td><b>Wall poster (recommended)</b></td><td>36&times;24" single-sheet print at Staples; instant gallery-ready board</td><td>$15&ndash;30 depending on paper</td></tr></table>\n' +
'<h2>2. Staples printing instructions</h2>\n' +
'<ol>\n' +
'<li>Walk into Staples or upload at staples.com.</li>\n' +
'<li>Choose <em>Engineering Prints</em> or <em>Posters</em> &rarr; 36&times;24" landscape.</li>\n' +
'<li>Paper: <b>100lb cover cardstock</b> (best for paint) <i>or</i> <b>satin photo paper</b> (best for vivid colors as-is, no painting).</li>\n' +
'<li>Finish: <b>matte</b> for paintable, <b>satin</b> for the decorated print as-is.</li>\n' +
'<li>Cost: $15&ndash;30 depending on paper and rush options.</li>\n' +
'</ol>\n' +
'<div class="tip"><em>Note:</em> True 36&times;24 watercolor paper is hard to find at Staples. Use <b>acrylic paint thinned with water</b> on cardstock for the best on-hand result.</div>\n' +
'<h2>3. Hobby Lobby supply list</h2>\n' +
'<ul>\n' +
'<li>Acrylic paint set (12-color basic)</li>\n' +
'<li>Brushes: small detail (#2 round), medium fill (#6 flat), large wash (1" flat)</li>\n' +
'<li>Palette or paper plate</li>\n' +
'<li>Water cup &amp; rag</li>\n' +
'<li>Pencil &amp; eraser (for sketching before painting)</li>\n' +
'<li>Mod Podge gloss (for sealing afterward)</li>\n' +
'<li><i>Optional:</i> gold leaf paint pen (for the compass rose &amp; cartouche)</li>\n' +
'<li><i>Optional:</i> fine-tip black marker (for re-tracing or detail work)</li>\n' +
'</ul>\n' +
'<h2>4. Color palette reference</h2>\n' +
'<div class="palette-grid">\n' +
'<div class="palette-row"><div class="palette-swatch" style="background:' + PALETTE.parchment + ';"></div><div class="palette-info"><b>Parchment</b>' + PALETTE.parchment + '<br/>2 parts white + dash ochre + drop sepia</div></div>\n' +
'<div class="palette-row"><div class="palette-swatch" style="background:' + PALETTE.trail + ';"></div><div class="palette-info"><b>Trail rose</b>' + PALETTE.trail + '<br/>1 part red + 1 part white + dash burnt sienna</div></div>\n' +
'<div class="palette-row"><div class="palette-swatch" style="background:' + PALETTE.mtn + ';"></div><div class="palette-info"><b>Mountain purple-gray</b>' + PALETTE.mtn + '<br/>1 part blue + 1 part purple + 2 parts white</div></div>\n' +
'<div class="palette-row"><div class="palette-swatch" style="background:' + PALETTE.forest + ';"></div><div class="palette-info"><b>Forest green</b>' + PALETTE.forest + '<br/>2 parts green + 1 part black + dash yellow</div></div>\n' +
'<div class="palette-row"><div class="palette-swatch" style="background:' + PALETTE.river + ';"></div><div class="palette-info"><b>River blue</b>' + PALETTE.river + '<br/>2 parts blue + 1 part white + dash black</div></div>\n' +
'<div class="palette-row"><div class="palette-swatch" style="background:' + PALETTE.desert + ';"></div><div class="palette-info"><b>Desert tan</b>' + PALETTE.desert + '<br/>2 parts ochre + 1 part white + dash burnt umber</div></div>\n' +
'<div class="palette-row"><div class="palette-swatch" style="background:' + PALETTE.sepia + ';"></div><div class="palette-info"><b>Sepia text</b>' + PALETTE.sepia + '<br/>burnt umber straight from the tube</div></div>\n' +
'<div class="palette-row"><div class="palette-swatch" style="background:' + PALETTE.gold + ';"></div><div class="palette-info"><b>Gold accent</b>' + PALETTE.gold + '<br/>yellow ochre + dash white; optional gold leaf pen</div></div>\n' +
'</div>\n' +
'<h2>5. Painting techniques</h2>\n' +
'<h3>Watercolor wash for sky</h3>\n' +
'<p>Wet the brush, load with light blue, paint the top edge of the region. Drag downward and lighten as you go. Pulling water across keeps a smooth gradient.</p>\n' +
'<h3>Layered green for grass and forest</h3>\n' +
'<p>Dark base layer first. Mid-tone over it once dry. Light highlights last. Three layers reads as depth without much detail.</p>\n' +
'<h3>Soft graduated mountains</h3>\n' +
'<p>Distant peaks in pale purple-gray. Foreground peaks in deeper brown-gray. Snow caps last, with a fine brush.</p>\n' +
'<h3>River highlights</h3>\n' +
'<p>Paint river blue. Once dry, add white streaks for current and reflections.</p>\n' +
'<h3>Painting around printed text</h3>\n' +
'<p>Don&rsquo;t paint over the trail line, the space numbers, or the landmark labels. Paint <i>up to</i> them, leaving the printed details visible.</p>\n' +
'<h2>6. Sealing</h2>\n' +
'<ol>\n' +
'<li>Wait 24 hours for paint to dry fully.</li>\n' +
'<li>Apply Mod Podge gloss with a foam brush, thin even coat, full coverage.</li>\n' +
'<li>Wait 24 hours.</li>\n' +
'<li>Optional second coat for extra durability.</li>\n' +
'</ol>\n' +
'<p>Result: a board that survives a school year of handling.</p>\n' +
'<h2>7. Optional laminating</h2>\n' +
'<p>Staples laminating service ($5&ndash;10) for ultra-durability. <b>Only use this on the FINISHED painted board</b>, not on a paintable print.</p>\n' +
'<h2>8. Tips from Gabby&rsquo;s dad</h2>\n' +
'<div class="tip"><em>Sky first.</em> It&rsquo;s the easiest and gives you confidence.</div>\n' +
'<div class="tip"><em>Mountains in the background, not the foreground.</em> Foreground = small details (people, trees, wagons).</div>\n' +
'<div class="tip"><em>Less paint is more paint.</em> You can always add more. You can&rsquo;t take it back.</div>\n' +
'<div class="tip"><em>If you mess up, the trail is forgiving.</em> Real pioneers had bad days too.</div>\n' +
'</body>\n</html>\n';
}

// =====================================================================
// EMIT FILES
// =====================================================================
const docsDir = path.join(__dirname, 'docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir);

const written = [];
function write(name, content) {
  const fp = path.join(docsDir, name);
  fs.writeFileSync(fp, content);
  written.push({ name, bytes: Buffer.byteLength(content, 'utf8') });
}

// Tiles — 6 letters × 2 variants
TILE_ORDER.forEach(letter => {
  ['decorated', 'paintable'].forEach(variant => {
    const paintable = variant === 'paintable';
    const fn = TILE_FNS[letter];
    const svgBody = fn(paintable);
    const html = wrapTilePage(letter, paintable, svgBody);
    write('board_short_tile_' + letter + '_' + variant + '.html', html);
  });
});

// Posters
write('board_poster_decorated.html', wrapPosterPage(false, buildPoster(false)));
write('board_poster_paintable.html', wrapPosterPage(true,  buildPoster(true)));

// Guide
write('PRINTING_AND_PAINTING_GUIDE.html', buildGuidePage());

// Summary
console.log('\nv3.1 board generator complete.');
written.forEach(f => console.log('  ' + f.name + '  ' + (f.bytes / 1024).toFixed(1) + ' KB'));
console.log('\nTotal: ' + written.length + ' files written to docs/.');
