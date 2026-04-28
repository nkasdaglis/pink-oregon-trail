/* Pink Oregon Trail — master SVG renderer (v3.4)
 * Single source of truth for the board map. Used by:
 *   - docs/board_v33_poster_36x24.html  (mode: 'poster')
 *   - pink_oregon_trail.html             (mode: 'screen')
 *
 * Public API (attached to window.PinkOregonTrailMap):
 *   buildMasterBoardSVG({mode, viewBoxW, viewBoxH, activeWagon, wagons,
 *                        trailLength}) -> { svg: string, meta: {...} }
 *
 * Modes differ only in label sizing rules and overlay behavior. The
 * geography, roundels, and piece zones are identical.
 */
(function(global) {
  'use strict';

  // =====================================================================
  // CONSTANTS / PROJECTION
  // =====================================================================
  // Equirectangular projection — accurate enough at this scale.
  // Keep these in sync with build_v33_physical_board.js if you ever
  // change them (only one trail north-south extent should be canonical).
  var LAT_N = 49.5, LAT_S = 32.0;
  var LON_W_EAST = 92.5, LON_W_WEST = 125.5; // degrees-west (positive)

  var PALETTE = {
    parchment:       '#F0DBA8',
    parchment_hi:    '#FBF1D9',
    parchment_lo:    '#E5C792',
    ink:             '#5C4A36',
    ink_dark:        '#3D2817',
    ink_light:       '#8B7355',
    river_blue:      '#7A9DBE',
    river_dark:      '#3F5F87',
    mountain:        '#A88B5B',
    mountain_dark:   '#5C4A36',
    mountain_snow:   '#F5F1EC',
    desert:          '#C8956D',
    forest:          '#5F7A5F',
    forest_dark:     '#3D5A3D',
    trail_pink:      '#B85770',
    trail_pink_lo:   '#D49AAD',
    state_line:      '#9C7E5C',
    gold:            '#B8923D',
    cream:           '#FBF6F0',
    cartouche_field: '#F0E1B8'
  };

  // Roundel type styling — keep in sync with build_v33_physical_board.js
  var TYPE_STYLE = {
    start:    { fill: '#C8DCC8', accent: PALETTE.forest_dark, ring: PALETTE.forest_dark, glyph: '◉' },
    fort:     { fill: '#E8C28A', accent: PALETTE.gold,        ring: PALETTE.ink_dark,    glyph: '⌂' },
    river:    { fill: '#C8DCE8', accent: PALETTE.river_dark,  ring: PALETTE.ink_dark,    glyph: '≈' },
    landmark: { fill: '#E5C8D2', accent: PALETTE.trail_pink,  ring: PALETTE.ink_dark,    glyph: '▲' },
    travel:   { fill: PALETTE.cream, accent: PALETTE.gold,    ring: PALETTE.ink_dark,    glyph: '•' },
    finish:   { fill: '#F5E5A0', accent: PALETTE.gold,        ring: PALETTE.gold,        glyph: '★' }
  };

  // The 25 Short-trail stops with real lat/long.
  var SHORT_TRAIL = [
    { n:  1, name: 'Independence',         type: 'start',    lat: 39.09, lon: 94.41 },
    { n:  2, name: 'Kansas Prairie',       type: 'travel',   lat: 39.20, lon: 95.50 },
    { n:  3, name: 'Kansas River',         type: 'river',    lat: 39.30, lon: 96.30 },
    { n:  4, name: 'Big Blue River',       type: 'river',    lat: 39.78, lon: 96.95 },
    { n:  5, name: 'Fort Kearney',         type: 'fort',     lat: 40.65, lon: 99.00 },
    { n:  6, name: 'Platte River Valley',  type: 'travel',   lat: 41.10, lon: 100.50 },
    { n:  7, name: 'The Great Plains',     type: 'travel',   lat: 41.50, lon: 102.20 },
    { n:  8, name: 'Chimney Rock',         type: 'landmark', lat: 41.70, lon: 103.34 },
    { n:  9, name: 'Scotts Bluff',         type: 'landmark', lat: 41.83, lon: 103.71 },
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

  // The 27 Extended-only stops (small markers, no number).
  var EXTENDED_EXTRA = [
    { name: 'Westport Landing',      lat: 39.11, lon: 94.59 },
    { name: 'Shawnee Mission',       lat: 39.02, lon: 94.71 },
    { name: 'Wakarusa River',        lat: 38.93, lon: 95.40 },
    { name: 'Alcove Spring',         lat: 39.78, lon: 96.66 },
    { name: 'Rock Creek Station',    lat: 40.14, lon: 97.10 },
    { name: 'Little Blue Valley',    lat: 40.30, lon: 97.80 },
    { name: 'South Platte Crossing', lat: 41.09, lon: 102.65 },
    { name: 'Ash Hollow',            lat: 41.30, lon: 102.62 },
    { name: 'Courthouse Rock',       lat: 41.73, lon: 103.10 },
    { name: 'Register Cliff',        lat: 42.16, lon: 104.86 },
    { name: 'North Platte Valley',   lat: 42.30, lon: 105.40 },
    { name: 'Casper',                lat: 42.85, lon: 106.32 },
    { name: 'Sweetwater River',      lat: 42.50, lon: 107.85 },
    { name: 'Ice Slough',            lat: 42.50, lon: 108.20 },
    { name: 'Pacific Springs',       lat: 42.34, lon: 109.06 },
    { name: 'Big Sandy Creek',       lat: 42.05, lon: 109.45 },
    { name: 'Fort Bridger',          lat: 41.32, lon: 110.39 },
    { name: 'Bear River Valley',     lat: 41.95, lon: 111.32 },
    { name: 'American Falls',        lat: 42.78, lon: 112.85 },
    { name: 'Massacre Rocks',        lat: 42.67, lon: 113.05 },
    { name: 'Three Island Crossing', lat: 42.93, lon: 115.32 },
    { name: 'Hot Springs',           lat: 43.05, lon: 116.05 },
    { name: 'Burnt River Canyon',    lat: 44.55, lon: 117.50 },
    { name: 'Powder River',          lat: 44.78, lon: 117.81 },
    { name: 'Grande Ronde Valley',   lat: 45.32, lon: 117.92 },
    { name: 'Walla Walla Valley',    lat: 46.07, lon: 118.34 },
    { name: 'Umatilla River',        lat: 45.92, lon: 119.30 }
  ];

  // Pieces parked here when at this stop (forts + endpoints).
  var PIECE_ZONE_STOPS = ['Independence', 'Fort Kearney', 'Fort Laramie',
                          'Fort Hall', 'Fort Boise', 'Fort Bridger', 'Oregon City'];

  // Geography — same data as build_v33_physical_board.js.
  var STATES = [
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

  var RIVERS = [
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

  var MOUNTAINS = [
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

  var PEAKS = [
    { name: "Pikes Peak",       lat: 38.84, lon: 105.04, h: 22 },
    { name: 'Mount Hood',       lat: 45.37, lon: 121.69, h: 28 },
    { name: 'Mount Rainier',    lat: 46.85, lon: 121.75, h: 30 },
    { name: 'Mount Shasta',     lat: 41.41, lon: 122.19, h: 26 },
    { name: "Long's Peak",      lat: 40.25, lon: 105.62, h: 22 },
    { name: 'Fremont Peak',     lat: 43.12, lon: 109.62, h: 22 },
    { name: 'Mount St. Helens', lat: 46.20, lon: 122.18, h: 24 }
  ];

  var REGIONS = [
    { name: 'GREAT PLAINS',          center: [40.5, 100.0], font: 28 },
    { name: 'GREAT BASIN',           center: [39.5, 116.5], font: 28 },
    { name: 'GREAT SALT LAKE DESERT',center: [40.7, 113.0], font: 16 },
    { name: 'GREAT SALT LAKE',       center: [41.1, 112.5], font: 14 },
    { name: 'COLUMBIA PLATEAU',      center: [46.0, 119.5], font: 18 },
    { name: 'WILLAMETTE VALLEY',     center: [44.5, 123.0], font: 12 },
    { name: 'SNAKE RIVER PLAIN',     center: [42.7, 114.5], font: 14 },
    { name: 'TERRA INCOGNITA',       center: [37.0, 107.0], font: 18, italic: true },
    { name: 'TERRITORIES OF THE PAIUTE', center: [38.0, 118.5], font: 12, italic: true },
    { name: 'LAND OF THE LAKOTA',    center: [44.5, 102.5], font: 14, italic: true },
    { name: 'LANDS OF THE NEZ PERCE',center: [45.5, 117.0], font: 12, italic: true },
    { name: 'CHEYENNE COUNTRY',      center: [40.0, 103.5], font: 12, italic: true }
  ];

  // =====================================================================
  // UTILITIES
  // =====================================================================
  function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function project(lat, lonW, W, H) {
    // v3.4.1 fix — mirror corrected. On a standard cartographic projection
    // of North America, west sits on the LEFT and east on the RIGHT.
    // Independence (lonW=94.4°, less west) must land on the right; Oregon
    // City (lonW=122.6°, more west) on the left. The earlier formula
    // produced the inverse, yielding a left-right mirrored poster.
    var x = ((LON_W_WEST - lonW) / (LON_W_WEST - LON_W_EAST)) * W;
    var y = ((LAT_N - lat) / (LAT_N - LAT_S)) * H;
    return { x: x, y: y };
  }

  // Smooth Bezier curve through a list of (lat, lon) points.
  function smoothPath(latLngs, W, H) {
    var pts = latLngs.map(function (ll) { return project(ll[0], ll[1], W, H); });
    if (pts.length < 2) return '';
    var d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      if (i < pts.length - 1) {
        var cx = (pts[i].x + pts[i+1].x) / 2;
        var cy = (pts[i].y + pts[i+1].y) / 2;
        d += ' Q ' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1);
      } else {
        d += ' T ' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1);
      }
    }
    return d;
  }

  // =====================================================================
  // COMPONENT BUILDERS — viewBox-aware
  // =====================================================================
  function buildBackground(W, H) {
    var s = '';
    s += '<defs>'
      +    '<radialGradient id="parch-grad" cx="0.5" cy="0.5" r="0.7">'
      +      '<stop offset="0%" stop-color="' + PALETTE.parchment_hi + '"/>'
      +      '<stop offset="60%" stop-color="' + PALETTE.parchment + '"/>'
      +      '<stop offset="100%" stop-color="' + PALETTE.parchment_lo + '"/>'
      +    '</radialGradient>'
      +    '<pattern id="dots-desert" patternUnits="userSpaceOnUse" width="10" height="10">'
      +      '<circle cx="2" cy="2" r="0.6" fill="' + PALETTE.desert + '" opacity="0.4"/>'
      +      '<circle cx="7" cy="7" r="0.5" fill="' + PALETTE.desert + '" opacity="0.4"/>'
      +    '</pattern>'
      +    '<pattern id="grass-prairie" patternUnits="userSpaceOnUse" width="14" height="14">'
      +      '<path d="M 3 12 L 3 8 M 7 12 L 7 7 M 11 12 L 11 9" stroke="' + PALETTE.forest + '" stroke-width="0.4" opacity="0.35"/>'
      +    '</pattern>'
      +  '</defs>';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#parch-grad)"/>';
    // Crackle texture
    for (var i = 0; i < 200; i++) {
      var x = Math.floor((i * 137.5) % W);
      var y = Math.floor((i * 89.3) % H);
      var len = 4 + (i % 6);
      s += '<line x1="' + x + '" y1="' + y + '" x2="' + (x + len) + '" y2="' + (y + (i % 3)) + '" stroke="' + PALETTE.ink_light + '" stroke-width="0.3" opacity="0.12"/>';
    }
    // Outer hairline + corner flourishes (1840s style)
    s += '<rect x="' + (W*0.005) + '" y="' + (H*0.005) + '" width="' + (W*0.99) + '" height="' + (H*0.99) + '" fill="none" stroke="' + PALETTE.ink + '" stroke-width="' + (W/2400) + '" opacity="0.55"/>';
    var corners = [[W*0.012, H*0.018], [W-W*0.012, H*0.018], [W*0.012, H-H*0.018], [W-W*0.012, H-H*0.018]];
    var rots = [0, 90, 270, 180];
    var fs = W/450;
    corners.forEach(function (c, i) {
      s += '<g transform="translate(' + c[0] + ' ' + c[1] + ') rotate(' + rots[i] + ')" opacity="0.6">'
        +    '<path d="M 0 0 q ' + (4*fs) + ' ' + (-2*fs) + ' ' + (8*fs) + ' ' + (-1*fs) + ' q 0 ' + (-4*fs) + ' ' + (-2*fs) + ' ' + (-8*fs) + ' q ' + (-4*fs) + ' 0 ' + (-6*fs) + ' ' + (4*fs) + ' z" fill="' + PALETTE.ink + '" stroke="' + PALETTE.ink_dark + '" stroke-width="' + (0.4*fs) + '"/>'
        +    '<path d="M 0 0 q ' + (-2*fs) + ' ' + (4*fs) + ' ' + (-1*fs) + ' ' + (8*fs) + ' q ' + (-4*fs) + ' 0 ' + (-8*fs) + ' ' + (-2*fs) + ' q 0 ' + (-4*fs) + ' ' + (4*fs) + ' ' + (-6*fs) + ' z" fill="' + PALETTE.ink + '" stroke="' + PALETTE.ink_dark + '" stroke-width="' + (0.4*fs) + '"/>'
        +  '</g>';
    });
    return s;
  }

  function buildRegionTints(W, H) {
    var s = '';
    var plains = project(40.5, 99.0, W, H), plainsW = project(40.5, 104.0, W, H);
    s += '<rect x="' + plainsW.x.toFixed(1) + '" y="' + (plains.y - H*0.08).toFixed(1) + '" width="' + (plains.x - plainsW.x).toFixed(1) + '" height="' + (H*0.16).toFixed(1) + '" fill="url(#grass-prairie)" opacity="0.6"/>';
    var gb_nw = project(42.5, 117.0, W, H), gb_se = project(37.5, 113.0, W, H);
    s += '<rect x="' + gb_nw.x.toFixed(1) + '" y="' + gb_nw.y.toFixed(1) + '" width="' + (gb_se.x - gb_nw.x).toFixed(1) + '" height="' + (gb_se.y - gb_nw.y).toFixed(1) + '" fill="url(#dots-desert)" opacity="0.55"/>';
    var pnw_nw = project(49.0, 124.5, W, H), pnw_se = project(42.0, 121.5, W, H);
    s += '<rect x="' + pnw_nw.x.toFixed(1) + '" y="' + pnw_nw.y.toFixed(1) + '" width="' + (pnw_se.x - pnw_nw.x).toFixed(1) + '" height="' + (pnw_se.y - pnw_nw.y).toFixed(1) + '" fill="' + PALETTE.forest + '" opacity="0.10"/>';
    return s;
  }

  function buildStates(W, H, mode) {
    var s = '';
    var fontSize = (mode === 'poster') ? 28 : 14;
    STATES.forEach(function (st) {
      var pts = st.poly.map(function (ll) { var p = project(ll[0], ll[1], W, H); return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
      s += '<polygon points="' + pts + '" fill="none" stroke="' + PALETTE.state_line + '" stroke-width="' + (W/2000) + '" stroke-dasharray="6 4" opacity="0.6"/>';
      var lonAvg = st.poly.reduce(function (sm, p) { return sm + p[1]; }, 0) / st.poly.length;
      var latAvg = st.poly.reduce(function (sm, p) { return sm + p[0]; }, 0) / st.poly.length;
      var lp = project(latAvg, lonAvg, W, H);
      s += '<text x="' + lp.x.toFixed(1) + '" y="' + lp.y.toFixed(1) + '" font-family="Georgia, serif" font-size="' + fontSize + '" font-style="italic" font-weight="bold" fill="' + PALETTE.ink + '" text-anchor="middle" opacity="0.45" letter-spacing="3">' + escapeXml(st.name.toUpperCase()) + '</text>';
    });
    return s;
  }

  function buildRegionLabels(W, H, mode) {
    var s = '';
    var scale = (mode === 'poster') ? 1.0 : 0.55;
    REGIONS.forEach(function (r) {
      var p = project(r.center[0], r.center[1], W, H);
      var fst = r.italic ? 'italic' : 'normal';
      var fw = r.italic ? '400' : '600';
      s += '<text x="' + p.x.toFixed(1) + '" y="' + p.y.toFixed(1) + '" font-family="Georgia, serif" font-size="' + (r.font * scale).toFixed(1) + '" font-style="' + fst + '" font-weight="' + fw + '" fill="' + (r.italic ? PALETTE.ink_light : PALETTE.ink) + '" text-anchor="middle" opacity="0.55" letter-spacing="' + (r.italic ? 1 : 4) + '">' + escapeXml(r.name) + '</text>';
    });
    return s;
  }

  function buildRivers(W, H, mode) {
    var s = '';
    var labelFont = (mode === 'poster') ? 12 : 9;
    RIVERS.forEach(function (r) {
      var d = smoothPath(r.points, W, H);
      var widthScale = (W / 3600);
      s += '<path d="' + d + '" fill="none" stroke="' + PALETTE.river_blue + '" stroke-width="' + ((r.width + 1.5) * widthScale).toFixed(1) + '" opacity="0.4" stroke-linecap="round" stroke-linejoin="round"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + PALETTE.river_dark + '" stroke-width="' + (r.width * widthScale).toFixed(1) + '" opacity="0.85" stroke-linecap="round" stroke-linejoin="round"/>';
      if (r.name) {
        var mid = r.points[Math.floor(r.points.length / 2)];
        var p = project(mid[0], mid[1], W, H);
        s += '<text class="mm-river-label" x="' + (p.x + 8).toFixed(1) + '" y="' + (p.y - 6).toFixed(1) + '" font-family="Georgia, serif" font-size="' + labelFont + '" font-style="italic" fill="' + PALETTE.river_dark + '" opacity="0.85">' + escapeXml(r.name) + '</text>';
      }
    });
    return s;
  }

  function buildMountains(W, H, mode) {
    var s = '';
    var labelFont = (mode === 'poster') ? 12 : 9;
    var hScale = W / 3600;
    MOUNTAINS.forEach(function (m) {
      m.ridge.forEach(function (rp) {
        var p = project(rp[0], rp[1], W, H);
        var h = m.h * hScale;
        for (var dx = -h; dx <= h; dx += h) {
          var cx = p.x + dx;
          s += '<polygon points="' + cx + ',' + (p.y - h * 1.2) + ' ' + (cx - h * 0.7) + ',' + (p.y + h * 0.5) + ' ' + (cx + h * 0.7) + ',' + (p.y + h * 0.5) + '" fill="' + PALETTE.mountain + '" stroke="' + PALETTE.mountain_dark + '" stroke-width="0.6"/>';
          s += '<polygon points="' + cx + ',' + (p.y - h * 1.2) + ' ' + (cx - h * 0.3).toFixed(1) + ',' + (p.y - h * 0.5).toFixed(1) + ' ' + (cx + h * 0.3).toFixed(1) + ',' + (p.y - h * 0.5).toFixed(1) + '" fill="' + PALETTE.mountain_snow + '" opacity="0.85"/>';
          s += '<polygon points="' + cx + ',' + (p.y - h * 1.2) + ' ' + (cx + h * 0.7) + ',' + (p.y + h * 0.5) + ' ' + cx + ',' + (p.y + h * 0.5) + '" fill="' + PALETTE.mountain_dark + '" opacity="0.30"/>';
        }
      });
      if (m.name) {
        var mid = m.ridge[Math.floor(m.ridge.length / 2)];
        var p2 = project(mid[0], mid[1], W, H);
        s += '<text class="mm-mtn-label" x="' + p2.x.toFixed(1) + '" y="' + (p2.y + m.h * hScale + 12).toFixed(1) + '" font-family="Georgia, serif" font-size="' + labelFont + '" font-style="italic" fill="' + PALETTE.mountain_dark + '" text-anchor="middle">' + escapeXml(m.name) + '</text>';
      }
    });
    PEAKS.forEach(function (pk) {
      var p = project(pk.lat, pk.lon, W, H);
      var h = pk.h * hScale;
      s += '<polygon points="' + p.x + ',' + (p.y - h * 1.3) + ' ' + (p.x - h * 0.7) + ',' + (p.y + h * 0.5) + ' ' + (p.x + h * 0.7) + ',' + (p.y + h * 0.5) + '" fill="' + PALETTE.mountain + '" stroke="' + PALETTE.mountain_dark + '" stroke-width="0.7"/>';
      s += '<polygon points="' + p.x + ',' + (p.y - h * 1.3) + ' ' + (p.x - h * 0.4).toFixed(1) + ',' + (p.y - h * 0.4).toFixed(1) + ' ' + (p.x + h * 0.4).toFixed(1) + ',' + (p.y - h * 0.4).toFixed(1) + '" fill="' + PALETTE.mountain_snow + '"/>';
      s += '<polygon points="' + p.x + ',' + (p.y - h * 1.3) + ' ' + (p.x + h * 0.7) + ',' + (p.y + h * 0.5) + ' ' + p.x + ',' + (p.y + h * 0.5) + '" fill="' + PALETTE.mountain_dark + '" opacity="0.35"/>';
      s += '<text class="mm-peak-label" x="' + p.x.toFixed(1) + '" y="' + (p.y + h * 0.5 + 12).toFixed(1) + '" font-family="Georgia, serif" font-size="' + labelFont + '" font-style="italic" font-weight="bold" fill="' + PALETTE.mountain_dark + '" text-anchor="middle">' + escapeXml(pk.name) + '</text>';
    });
    return s;
  }

  function buildTrailPath(W, H) {
    var pts = SHORT_TRAIL.map(function (sp) { return project(sp.lat, sp.lon, W, H); });
    var d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2 + 8 * (H/2400);
      d += ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    }
    var s = '';
    var widthScale = W / 3600;
    s += '<path d="' + d + '" fill="none" stroke="' + PALETTE.trail_pink_lo + '" stroke-width="' + (14 * widthScale).toFixed(1) + '" opacity="0.55" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + PALETTE.trail_pink + '" stroke-width="' + (5 * widthScale).toFixed(1) + '" stroke-dasharray="14 8" stroke-linecap="round" opacity="0.95"/>';
    return s;
  }

  function buildExtendedMarkers(W, H, mode, trailLength) {
    // Skip when not relevant. Short-only posters don't render Extended
    // markers at all to keep the print clean.
    if (trailLength === 'short') return '';
    if (mode === 'poster' || mode === 'screen-extended') {
      var s = '';
      var labelFont = (mode === 'poster') ? 11 : 8;
      var rScale = W / 3600;
      EXTENDED_EXTRA.forEach(function (e) {
        var p = project(e.lat, e.lon, W, H);
        s += '<g class="mm-extended">';
        s += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (6 * rScale).toFixed(1) + '" fill="' + PALETTE.cream + '" stroke="' + PALETTE.ink + '" stroke-width="0.8" opacity="0.85"/>';
        s += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (2.5 * rScale).toFixed(1) + '" fill="' + PALETTE.trail_pink + '" opacity="0.9"/>';
        s += '<text x="' + (p.x + 9 * rScale).toFixed(1) + '" y="' + (p.y - 4).toFixed(1) + '" font-family="Georgia, serif" font-size="' + labelFont + '" font-style="italic" fill="' + PALETTE.ink + '" opacity="0.85">' + escapeXml(e.name) + '</text>';
        s += '</g>';
      });
      return s;
    }
    return '';
  }

  // =====================================================================
  // ROUNDELS + LABEL COLLISION PASS
  // =====================================================================
  // Place each label at the side with most clearance. If all 4 sides
  // collide, pick the least-bad and draw a leader line. The collision
  // pass runs at draw time using a simple bbox grid.
  function buildRoundelsAndLabels(W, H, mode) {
    var roundelR = (mode === 'poster') ? 40 : 6;     // 0.8" diameter at 100u/in
    var pieceZoneSize = (mode === 'poster') ? 200 : 0; // 2"×2" only on poster
    var nameFont = (mode === 'poster') ? 16 : 11;
    var numFont = (mode === 'poster') ? 20 : 11;
    var labelMargin = (mode === 'poster') ? 14 : 8;
    var pieceZoneFont = (mode === 'poster') ? 10 : 0;
    var s = '';
    var pieceZonesSvg = '';
    var roundelsSvg = '';
    var labelsSvg = '';
    var occupied = []; // bboxes already placed
    var pieceZoneStops = {};
    PIECE_ZONE_STOPS.forEach(function (n) { pieceZoneStops[n] = true; });

    SHORT_TRAIL.forEach(function (sp) {
      var p = project(sp.lat, sp.lon, W, H);
      var style = TYPE_STYLE[sp.type] || TYPE_STYLE.travel;
      // Roundel core (drawn after piece zones so it sits on top)
      var rg = '<g class="mm-roundel" data-stop-n="' + sp.n + '" data-stop-name="' + escapeXml(sp.name) + '" data-stop-type="' + sp.type + '">';
      rg += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (roundelR + 3) + '" fill="' + PALETTE.cream + '" stroke="' + PALETTE.ink_dark + '" stroke-width="' + (1.2 * W/3600) + '" opacity="0.95"/>';
      rg += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + roundelR + '" fill="' + style.fill + '" stroke="' + style.ring + '" stroke-width="' + (2 * W/3600) + '"/>';
      rg += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (roundelR - 4) + '" fill="none" stroke="' + style.accent + '" stroke-width="' + (1 * W/3600) + '"/>';
      // Number on Short-trail stops only
      rg += '<text class="mm-stop-number" x="' + p.x.toFixed(1) + '" y="' + (p.y - 2 * (W/3600)).toFixed(1) + '" font-family="Georgia, serif" font-size="' + numFont + '" font-weight="bold" fill="' + PALETTE.ink_dark + '" text-anchor="middle">' + sp.n + '</text>';
      // Type glyph
      rg += '<text x="' + p.x.toFixed(1) + '" y="' + (p.y + (mode === 'poster' ? 16 : 8)).toFixed(1) + '" font-family="Georgia, serif" font-size="' + (mode === 'poster' ? 18 : 9) + '" fill="' + PALETTE.ink_dark + '" text-anchor="middle" opacity="0.85">' + style.glyph + '</text>';
      rg += '</g>';
      roundelsSvg += rg;

      // Roundel itself goes on the occupancy grid
      occupied.push({ x1: p.x - roundelR, y1: p.y - roundelR, x2: p.x + roundelR, y2: p.y + roundelR, kind: 'roundel' });

      // Piece zone — only for forts/start/finish on poster
      if (mode === 'poster' && pieceZoneStops[sp.name]) {
        // Pick a side with clearance: try right, then left, then below, then above
        var zoneOffsets = [
          { dx: roundelR + 30,  dy: -pieceZoneSize/2, side: 'right' },
          { dx: -roundelR - 30 - pieceZoneSize, dy: -pieceZoneSize/2, side: 'left' },
          { dx: -pieceZoneSize/2, dy: roundelR + 30, side: 'below' },
          { dx: -pieceZoneSize/2, dy: -roundelR - 30 - pieceZoneSize, side: 'above' }
        ];
        var chosen = null;
        for (var zi = 0; zi < zoneOffsets.length; zi++) {
          var zo = zoneOffsets[zi];
          var zx1 = p.x + zo.dx, zy1 = p.y + zo.dy;
          var zx2 = zx1 + pieceZoneSize, zy2 = zy1 + pieceZoneSize;
          // Stay within map bounds (5% margin)
          if (zx1 < W * 0.02 || zx2 > W * 0.98 || zy1 < H * 0.04 || zy2 > H * 0.94) continue;
          // No overlap with existing occupied bboxes
          var conflict = occupied.some(function (o) { return !(zx2 < o.x1 || zx1 > o.x2 || zy2 < o.y1 || zy1 > o.y2); });
          if (!conflict) { chosen = { x1: zx1, y1: zy1, x2: zx2, y2: zy2, side: zo.side }; break; }
        }
        if (chosen) {
          pieceZonesSvg += '<g class="mm-piece-zone" data-stop-name="' + escapeXml(sp.name) + '">';
          pieceZonesSvg += '<rect x="' + chosen.x1.toFixed(1) + '" y="' + chosen.y1.toFixed(1) + '" width="' + pieceZoneSize + '" height="' + pieceZoneSize + '" fill="' + PALETTE.cream + '" stroke="' + PALETTE.ink_dark + '" stroke-width="' + (1.6 * W/3600) + '" stroke-dasharray="6 4" opacity="0.85" rx="6"/>';
          pieceZonesSvg += '<text x="' + ((chosen.x1 + chosen.x2)/2).toFixed(1) + '" y="' + (chosen.y1 + 18).toFixed(1) + '" font-family="Georgia, serif" font-size="' + pieceZoneFont + '" font-style="italic" fill="' + PALETTE.ink + '" text-anchor="middle">Piece Zone</text>';
          pieceZonesSvg += '</g>';
          occupied.push({ x1: chosen.x1, y1: chosen.y1, x2: chosen.x2, y2: chosen.y2, kind: 'pieceZone' });
        }
      }

      // Label placement — try 4 sides at increasing distances; pick first
      // non-conflicting side. If all conflict, fall back to direct above
      // and draw a long leader line (forced collision — log to report).
      var labelW = Math.max(140, sp.name.length * (nameFont * 0.62));
      var labelH = nameFont + 6;
      var sideOffsets = [
        { dx: 0,  dy: roundelR + labelMargin + labelH/2,            anchor: 'middle', side: 'below' },
        { dx: 0,  dy: -roundelR - labelMargin - labelH/2,           anchor: 'middle', side: 'above' },
        { dx: roundelR + labelMargin + labelW/2, dy: 0,             anchor: 'middle', side: 'right' },
        { dx: -roundelR - labelMargin - labelW/2, dy: 0,            anchor: 'middle', side: 'left' },
        // Fallback: push further out below
        { dx: 0,  dy: roundelR + labelMargin*3 + labelH/2,          anchor: 'middle', side: 'below-far' },
        { dx: 0,  dy: -roundelR - labelMargin*3 - labelH/2,         anchor: 'middle', side: 'above-far' }
      ];
      var labelChosen = null;
      for (var li = 0; li < sideOffsets.length; li++) {
        var lo = sideOffsets[li];
        var lcx = p.x + lo.dx, lcy = p.y + lo.dy;
        var lx1 = lcx - labelW/2, ly1 = lcy - labelH/2;
        var lx2 = lx1 + labelW, ly2 = ly1 + labelH;
        if (lx1 < W * 0.01 || lx2 > W * 0.99 || ly1 < H * 0.02 || ly2 > H * 0.98) continue;
        var lconflict = occupied.some(function (o) { return !(lx2 < o.x1 || lx1 > o.x2 || ly2 < o.y1 || ly1 > o.y2); });
        if (!lconflict) {
          labelChosen = { cx: lcx, cy: lcy, x1: lx1, y1: ly1, x2: lx2, y2: ly2, side: lo.side, leader: (li >= 4) };
          break;
        }
      }
      if (!labelChosen) {
        // Forced collision — push to below-far and draw leader anyway
        var fcy = p.y + roundelR + labelMargin*4 + labelH/2;
        labelChosen = { cx: p.x, cy: fcy, x1: p.x - labelW/2, y1: fcy - labelH/2, x2: p.x + labelW/2, y2: fcy + labelH/2, side: 'below-forced', leader: true, forced: true };
      }
      occupied.push({ x1: labelChosen.x1, y1: labelChosen.y1, x2: labelChosen.x2, y2: labelChosen.y2, kind: 'label' });

      var labelTier = (sp.type === 'fort' || sp.type === 'start' || sp.type === 'finish') ? 'major' :
                      (sp.type === 'landmark' || sp.type === 'river') ? 'landmark' : 'minor';
      var lg = '<g class="mm-label mm-label-' + labelTier + '" data-stop-n="' + sp.n + '" data-anchor-x="' + p.x.toFixed(1) + '" data-anchor-y="' + p.y.toFixed(1) + '" data-label-cx="' + labelChosen.cx.toFixed(1) + '" data-label-cy="' + labelChosen.cy.toFixed(1) + '">';
      if (labelChosen.leader) {
        lg += '<line x1="' + p.x.toFixed(1) + '" y1="' + p.y.toFixed(1) + '" x2="' + labelChosen.cx.toFixed(1) + '" y2="' + labelChosen.cy.toFixed(1) + '" stroke="' + PALETTE.ink + '" stroke-width="' + (0.6 * W/3600) + '" opacity="0.55"/>';
      }
      lg += '<rect x="' + labelChosen.x1.toFixed(1) + '" y="' + labelChosen.y1.toFixed(1) + '" width="' + labelW.toFixed(1) + '" height="' + labelH.toFixed(1) + '" fill="' + PALETTE.cartouche_field + '" stroke="' + PALETTE.ink_light + '" stroke-width="0.6" opacity="0.92" rx="3"/>';
      lg += '<text class="mm-name" x="' + labelChosen.cx.toFixed(1) + '" y="' + (labelChosen.cy + nameFont/3).toFixed(1) + '" font-family="Georgia, serif" font-size="' + nameFont + '" font-weight="600" fill="' + PALETTE.ink_dark + '" text-anchor="middle">' + escapeXml(sp.name) + '</text>';
      lg += '</g>';
      labelsSvg += lg;
    });

    return { svg: pieceZonesSvg + roundelsSvg + labelsSvg, occupied: occupied };
  }

  function buildCompassRose(W, H, mode) {
    var cx = W - W * 0.06, cy = H - H * 0.10;
    if (mode !== 'poster') { cx = W * 0.93; cy = H * 0.15; }
    var size = (mode === 'poster') ? 1.0 : 0.5;
    var s = '<g transform="translate(' + cx + ', ' + cy + ') scale(' + size + ')" opacity="0.92">'
      +    '<circle cx="0" cy="0" r="68" fill="' + PALETTE.cream + '" stroke="' + PALETTE.ink_dark + '" stroke-width="2" opacity="0.95"/>'
      +    '<circle cx="0" cy="0" r="56" fill="none" stroke="' + PALETTE.gold + '" stroke-width="1"/>'
      +    '<circle cx="0" cy="0" r="44" fill="none" stroke="' + PALETTE.ink_light + '" stroke-width="0.6"/>'
      +    '<polygon points="0,-60 9,0 0,18 -9,0" fill="' + PALETTE.ink_dark + '"/>'
      +    '<polygon points="0,60 -9,0 0,-18 9,0" fill="' + PALETTE.ink + '" opacity="0.5"/>'
      +    '<polygon points="60,0 0,9 -18,0 0,-9" fill="' + PALETTE.gold + '"/>'
      +    '<polygon points="-60,0 0,-9 18,0 0,9" fill="' + PALETTE.gold + '" opacity="0.6"/>'
      +    '<circle cx="0" cy="0" r="5" fill="' + PALETTE.ink_dark + '"/>'
      +    '<text x="0" y="-78" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="' + PALETTE.ink_dark + '" text-anchor="middle">N</text>'
      +    '<text x="0" y="92" font-family="Georgia, serif" font-size="18" fill="' + PALETTE.ink + '" text-anchor="middle">S</text>'
      +    '<text x="74" y="6" font-family="Georgia, serif" font-size="18" fill="' + PALETTE.ink + '" text-anchor="middle">E</text>'
      +    '<text x="-74" y="6" font-family="Georgia, serif" font-size="18" fill="' + PALETTE.ink + '" text-anchor="middle">W</text>'
      +  '</g>';
    return s;
  }

  function buildScaleBar(W, H, mode) {
    var x0 = (mode === 'poster') ? W - 600 : W * 0.04;
    var y0 = (mode === 'poster') ? H - 100 : H - 30;
    var segWidth = (mode === 'poster') ? 70 : 18;
    var segH = (mode === 'poster') ? 14 : 6;
    var labelFont = (mode === 'poster') ? 11 : 8;
    var s = '<g opacity="0.85">';
    s += '<text x="' + (x0 + segWidth * 2.5).toFixed(1) + '" y="' + (y0 - 8) + '" font-family="Georgia, serif" font-style="italic" font-size="' + labelFont + '" fill="' + PALETTE.ink + '" text-anchor="middle">Scale of Miles</text>';
    for (var i = 0; i < 5; i++) {
      var fill = (i % 2 === 0) ? PALETTE.ink_dark : PALETTE.cream;
      s += '<rect x="' + (x0 + i * segWidth) + '" y="' + y0 + '" width="' + segWidth + '" height="' + segH + '" fill="' + fill + '" stroke="' + PALETTE.ink_dark + '" stroke-width="0.6"/>';
      s += '<text x="' + (x0 + i * segWidth) + '" y="' + (y0 + segH + 14) + '" font-family="Georgia, serif" font-size="' + labelFont + '" fill="' + PALETTE.ink + '" text-anchor="middle">' + (i * 100) + '</text>';
    }
    s += '<text x="' + (x0 + 5 * segWidth) + '" y="' + (y0 + segH + 14) + '" font-family="Georgia, serif" font-size="' + labelFont + '" fill="' + PALETTE.ink + '" text-anchor="middle">500 mi</text>';
    s += '</g>';
    return s;
  }

  function buildCartouche(W, H, mode) {
    if (mode !== 'poster') {
      // Slim ribbon banner for screen mode
      return '<g transform="translate(' + (W*0.18) + ', 8)" opacity="0.92">'
        +      '<path d="M 0 16 L ' + (W*0.32) + ' 16 L ' + (W*0.32) + ' 32 L ' + (W*0.32 - 30) + ' 36 L 30 36 L 0 32 Z" fill="' + PALETTE.cartouche_field + '" stroke="' + PALETTE.ink + '" stroke-width="0.6"/>'
        +      '<text x="' + (W*0.16) + '" y="29" font-family="Georgia, serif" font-style="italic" font-size="14" font-weight="bold" fill="' + PALETTE.ink + '" text-anchor="middle" letter-spacing="2">A MAP of the OREGON TRAIL</text>'
        +    '</g>';
    }
    var x0 = 60, y0 = H - 360;
    var s = '<g>';
    s += '<rect x="' + x0 + '" y="' + y0 + '" width="500" height="240" fill="' + PALETTE.cream + '" stroke="' + PALETTE.ink_dark + '" stroke-width="2.5" opacity="0.95" rx="8"/>';
    s += '<rect x="' + (x0 + 10) + '" y="' + (y0 + 10) + '" width="480" height="220" fill="none" stroke="' + PALETTE.gold + '" stroke-width="1.4" rx="6"/>';
    s += '<text x="' + (x0 + 250) + '" y="' + (y0 + 60) + '" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="' + PALETTE.ink_dark + '" text-anchor="middle">A MAP of the</text>';
    s += '<text x="' + (x0 + 250) + '" y="' + (y0 + 110) + '" font-family="Georgia, serif" font-size="48" font-weight="bold" fill="' + PALETTE.trail_pink + '" text-anchor="middle" letter-spacing="3">OREGON TRAIL</text>';
    s += '<text x="' + (x0 + 250) + '" y="' + (y0 + 145) + '" font-family="Georgia, serif" font-style="italic" font-size="16" fill="' + PALETTE.ink + '" text-anchor="middle">From the Town of Independence in Missouri</text>';
    s += '<text x="' + (x0 + 250) + '" y="' + (y0 + 168) + '" font-family="Georgia, serif" font-style="italic" font-size="16" fill="' + PALETTE.ink + '" text-anchor="middle">to the Willamette Valley in the Oregon Country</text>';
    s += '<text x="' + (x0 + 250) + '" y="' + (y0 + 198) + '" font-family="Georgia, serif" font-style="italic" font-size="13" fill="' + PALETTE.ink_light + '" text-anchor="middle">Two thousand miles &middot; Drawn for Pink Oregon Trail &middot; 1848</text>';
    s += '<g transform="translate(' + (x0 + 40) + ', ' + (y0 + 100) + ')">';
    s += '<ellipse cx="0" cy="0" rx="18" ry="10" fill="' + PALETTE.mountain_dark + '"/>';
    s += '<circle cx="-15" cy="-4" r="6" fill="' + PALETTE.mountain_dark + '"/>';
    s += '<polygon points="-19,-7 -23,-15 -16,-12" fill="' + PALETTE.ink_dark + '"/>';
    s += '</g>';
    s += '<g transform="translate(' + (x0 + 460) + ', ' + (y0 + 100) + ') scale(-1,1)">';
    s += '<ellipse cx="0" cy="0" rx="18" ry="10" fill="' + PALETTE.mountain_dark + '"/>';
    s += '<circle cx="-15" cy="-4" r="6" fill="' + PALETTE.mountain_dark + '"/>';
    s += '<polygon points="-19,-7 -23,-15 -16,-12" fill="' + PALETTE.ink_dark + '"/>';
    s += '</g>';
    s += '</g>';
    return s;
  }

  function buildLegend(W, H, mode) {
    if (mode !== 'poster') return '';
    var x0 = W / 2 - 320, y0 = H - 200;
    var s = '<g class="mm-legend">';
    s += '<rect x="' + x0 + '" y="' + y0 + '" width="640" height="160" fill="' + PALETTE.cream + '" stroke="' + PALETTE.ink_dark + '" stroke-width="1.6" opacity="0.95" rx="6"/>';
    s += '<text x="' + (x0 + 320) + '" y="' + (y0 + 28) + '" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="' + PALETTE.ink_dark + '" text-anchor="middle">Trail Spaces</text>';
    var items = [
      { color: '#C8DCC8', label: 'Start (Independence)', glyph: '◉' },
      { color: '#E8C28A', label: 'Fort',                 glyph: '⌂' },
      { color: '#C8DCE8', label: 'River Crossing',       glyph: '≈' },
      { color: '#E5C8D2', label: 'Landmark',             glyph: '▲' },
      { color: '#F5E5A0', label: 'Finish (Oregon City)', glyph: '★' }
    ];
    items.forEach(function (it, i) {
      var cy = y0 + 60 + i * 18;
      s += '<circle cx="' + (x0 + 36) + '" cy="' + cy + '" r="11" fill="' + it.color + '" stroke="' + PALETTE.ink_dark + '" stroke-width="1"/>';
      s += '<text x="' + (x0 + 36) + '" y="' + (cy + 5) + '" font-family="Georgia, serif" font-size="13" fill="' + PALETTE.ink_dark + '" text-anchor="middle">' + it.glyph + '</text>';
      s += '<text x="' + (x0 + 56) + '" y="' + (cy + 5) + '" font-family="Georgia, serif" font-size="13" fill="' + PALETTE.ink_dark + '">' + escapeXml(it.label) + '</text>';
    });
    s += '<circle cx="' + (x0 + 360) + '" cy="' + (y0 + 60) + '" r="8" fill="' + PALETTE.cream + '" stroke="' + PALETTE.ink + '" stroke-width="0.8"/>';
    s += '<circle cx="' + (x0 + 360) + '" cy="' + (y0 + 60) + '" r="3" fill="' + PALETTE.trail_pink + '"/>';
    s += '<text x="' + (x0 + 380) + '" y="' + (y0 + 65) + '" font-family="Georgia, serif" font-size="13" fill="' + PALETTE.ink + '">Alternate stop (Extended trail only)</text>';
    s += '<rect x="' + (x0 + 360) + '" y="' + (y0 + 80) + '" width="40" height="40" fill="' + PALETTE.cream + '" stroke="' + PALETTE.ink_dark + '" stroke-width="1.2" stroke-dasharray="6 4" opacity="0.85" rx="4"/>';
    s += '<text x="' + (x0 + 380) + '" y="' + (y0 + 105) + '" font-family="Georgia, serif" font-size="11" font-style="italic" fill="' + PALETTE.ink + '" text-anchor="middle">Zone</text>';
    s += '<text x="' + (x0 + 410) + '" y="' + (y0 + 105) + '" font-family="Georgia, serif" font-size="13" fill="' + PALETTE.ink + '">Piece Zone (forts &amp; endpoints — pieces park here)</text>';
    s += '<line x1="' + (x0 + 360) + '" y1="' + (y0 + 138) + '" x2="' + (x0 + 600) + '" y2="' + (y0 + 138) + '" stroke="' + PALETTE.trail_pink_lo + '" stroke-width="10" stroke-linecap="round"/>';
    s += '<line x1="' + (x0 + 360) + '" y1="' + (y0 + 138) + '" x2="' + (x0 + 600) + '" y2="' + (y0 + 138) + '" stroke="' + PALETTE.trail_pink + '" stroke-width="3.5" stroke-dasharray="10 5" stroke-linecap="round"/>';
    s += '<text x="' + (x0 + 380) + '" y="' + (y0 + 152) + '" font-family="Georgia, serif" font-style="italic" font-size="11" fill="' + PALETTE.ink + '">The Trail Itself &mdash; about 2,000 miles</text>';
    s += '</g>';
    return s;
  }

  function buildNativeNations(W, H, mode) {
    var native = [
      { lat: 41.5, lon: 100.5, t: 'Pawnee' },
      { lat: 43.5, lon: 102.5, t: 'Lakota' },
      { lat: 42.6, lon: 110.0, t: 'Shoshone' },
      { lat: 43.7, lon: 114.0, t: 'Bannock' },
      { lat: 45.6, lon: 116.0, t: 'Nez Perce' },
      { lat: 45.5, lon: 119.5, t: 'Cayuse' },
      { lat: 39.0, lon: 110.5, t: 'Ute' },
      { lat: 41.0, lon: 105.0, t: 'Cheyenne' },
      { lat: 46.0, lon: 109.0, t: 'Crow' },
      { lat: 47.5, lon: 116.0, t: 'Salish' },
      { lat: 38.5, lon: 105.5, t: 'Arapaho' }
    ];
    var fontSize = (mode === 'poster') ? 11 : 8;
    var s = '<g class="mm-native-nations">';
    native.forEach(function (n) {
      var p = project(n.lat, n.lon, W, H);
      s += '<text x="' + p.x.toFixed(1) + '" y="' + p.y.toFixed(1) + '" font-family="Georgia, serif" font-style="italic" font-size="' + fontSize + '" fill="' + PALETTE.ink_light + '" text-anchor="middle" opacity="0.55">' + escapeXml(n.t) + '</text>';
    });
    s += '</g>';
    return s;
  }

  // =====================================================================
  // PUBLIC API
  // =====================================================================
  function buildMasterBoardSVG(opts) {
    opts = opts || {};
    var mode = opts.mode || 'poster';
    var trailLength = opts.trailLength || 'both'; // 'short' | 'extended' | 'both'
    var W = opts.viewBoxW || (mode === 'poster' ? 3600 : 800);
    var H = opts.viewBoxH || (mode === 'poster' ? 2400 : 500);
    var meta = { mode: mode, trailLength: trailLength, W: W, H: H, forced_collisions: [] };
    var body = '';
    body += buildBackground(W, H);
    body += buildRegionTints(W, H);
    body += buildStates(W, H, mode);
    body += buildRegionLabels(W, H, mode);
    body += buildRivers(W, H, mode);
    body += buildMountains(W, H, mode);
    body += buildNativeNations(W, H, mode);
    body += buildTrailPath(W, H);
    body += buildExtendedMarkers(W, H, mode, trailLength);
    var rl = buildRoundelsAndLabels(W, H, mode);
    body += rl.svg;
    body += buildCompassRose(W, H, mode);
    body += buildScaleBar(W, H, mode);
    body += buildCartouche(W, H, mode);
    body += buildLegend(W, H, mode);
    if (mode === 'poster') {
      var lengthTag = trailLength === 'short' ? 'Short Trail' : (trailLength === 'extended' ? 'Extended Trail' : 'Short + Extended');
      body += '<text x="' + (W - 12) + '" y="' + (H - 8) + '" font-family="Georgia, serif" font-style="italic" font-size="9" fill="' + PALETTE.ink_light + '" text-anchor="end" opacity="0.7">Pink Oregon Trail v3.4.1 &mdash; ' + lengthTag + ' &mdash; print at 36" &times; 24" (no scaling, landscape)</text>';
    }
    return { svg: body, meta: meta };
  }

  // Expose
  global.PinkOregonTrailMap = {
    buildMasterBoardSVG: buildMasterBoardSVG,
    project: project,
    constants: { LAT_N: LAT_N, LAT_S: LAT_S, LON_W_EAST: LON_W_EAST, LON_W_WEST: LON_W_WEST },
    palette: PALETTE,
    SHORT_TRAIL: SHORT_TRAIL,
    EXTENDED_EXTRA: EXTENDED_EXTRA,
    PIECE_ZONE_STOPS: PIECE_ZONE_STOPS,
    TYPE_STYLE: TYPE_STYLE
  };
})(typeof window !== 'undefined' ? window : this);
