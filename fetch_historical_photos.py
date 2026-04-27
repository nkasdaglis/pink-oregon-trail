#!/usr/bin/env python3
"""
Pink Oregon Trail — Historical Photos Fetcher

Run this script ONCE to upgrade the game with real public-domain photographs
from the Library of Congress, replacing the daguerreotype-style SVG illustrations
at the 9 historical landmarks.

The game itself remains a single-file offline HTML. Photos are base64-embedded
into the HTML at one location: a `HISTORICAL_PHOTOS_OVERRIDE` constant block.
Re-running the script overwrites this block. If a photo can't be fetched,
that entry is skipped and the game falls back to the daguerreotype SVG.

Requirements: Python 3.8+, Pillow (pip install pillow)
Usage: python fetch_historical_photos.py [--html pink_oregon_trail.html]

All Library of Congress photographs from before 1928 are public domain.
"""

import argparse
import base64
import io
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path

# Library of Congress URLs for the 9 historical landmarks.
# These are stable LoC service URLs as of 2026.
# If any fail (404, redirect, slow), the script logs a warning and skips
# that entry — the game falls back to the daguerreotype SVG illustration.
PHOTO_URLS = {
    'fort_laramie': {
        'url': 'https://tile.loc.gov/storage-services/service/pnp/cph/3a30000/3a35000/3a35200/3a35260v.jpg',
        'description': 'Fort Laramie, c. 1858 — Albert Bierstadt',
        'fallback_search': 'Library of Congress: search "Fort Laramie 1858" or "LC-USZ62-3a35260"',
    },
    'chimney_rock': {
        'url': 'https://tile.loc.gov/storage-services/service/pnp/cph/3a40000/3a48000/3a48400/3a48468v.jpg',
        'description': 'Chimney Rock, Nebraska — William Henry Jackson',
        'fallback_search': 'Library of Congress: search "Chimney Rock Jackson"',
    },
    'independence_rock': {
        'url': 'https://tile.loc.gov/storage-services/service/pnp/cph/3c20000/3c25000/3c25800/3c25893v.jpg',
        'description': 'Independence Rock, Wyoming, c. 1870',
        'fallback_search': 'Library of Congress: search "Independence Rock Wyoming"',
    },
    'soda_springs': {
        'url': None,  # No reliable LoC URL; will fall back to SVG
        'description': 'Soda Springs, Idaho (rare; fallback to daguerreotype)',
        'fallback_search': 'Library of Congress: search "Soda Springs Idaho Hayden Survey 1872"',
    },
    'south_pass': {
        'url': 'https://tile.loc.gov/storage-services/service/pnp/cph/3b40000/3b41000/3b41700/3b41716v.jpg',
        'description': 'South Pass, Wyoming — Jackson, c. 1870',
        'fallback_search': 'Library of Congress: search "South Pass Wyoming Jackson"',
    },
    'fort_bridger': {
        'url': None,  # Variable LoC URLs; will fall back to SVG
        'description': 'Fort Bridger, Wyoming, c. 1858',
        'fallback_search': 'Library of Congress: search "Fort Bridger Wyoming 1858"',
    },
    'whitman_mission': {
        'url': None,  # Few pre-1928 photos exist (mission was destroyed 1847)
        'description': 'Whitman Mission, Washington — note: destroyed 1847',
        'fallback_search': 'Library of Congress: search "Whitman Mission Walla Walla"',
    },
    'the_dalles': {
        'url': 'https://tile.loc.gov/storage-services/service/pnp/cph/3a50000/3a52000/3a52900/3a52966v.jpg',
        'description': 'The Dalles, Columbia River — Carleton Watkins',
        'fallback_search': 'Library of Congress: search "The Dalles Columbia Watkins"',
    },
    'oregon_city': {
        'url': 'https://tile.loc.gov/storage-services/service/pnp/cph/3c10000/3c10400/3c10406v.jpg',
        'description': 'Oregon City and Willamette Falls, c. 1850',
        'fallback_search': 'Library of Congress: search "Oregon City 1850" or "Willamette Falls Oregon"',
    },
}

# Maximum dimensions for downscaled images (preserves aspect ratio)
MAX_WIDTH = 600
MAX_HEIGHT = 460
JPEG_QUALITY = 80


def log(msg, level='info'):
    """Simple console logger with level prefixes."""
    prefix = {'info': '  ', 'ok': '✓ ', 'warn': '⚠ ', 'err': '✗ '}.get(level, '  ')
    print(prefix + msg)


def fetch_and_encode(landmark_id, info):
    """Fetch one image, downscale, base64-encode. Return base64 string or None."""
    if info['url'] is None:
        log(f'{landmark_id}: no URL configured — falls back to daguerreotype SVG', 'warn')
        log(f'    To add manually: {info["fallback_search"]}', 'info')
        return None
    try:
        from PIL import Image
    except ImportError:
        log('Pillow is required. Install with: pip install pillow', 'err')
        sys.exit(1)
    log(f'{landmark_id}: fetching {info["description"]}...', 'info')
    try:
        req = urllib.request.Request(
            info['url'],
            headers={'User-Agent': 'PinkOregonTrail-Educational-Tool/1.0'},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
        log(f'    downloaded {len(raw)//1024} KB', 'info')
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        log(f'    fetch failed: {e}. Falling back to SVG.', 'warn')
        log(f'    To add manually: {info["fallback_search"]}', 'info')
        return None
    # Resize and re-encode
    try:
        img = Image.open(io.BytesIO(raw)).convert('RGB')
        img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.LANCZOS)
        out = io.BytesIO()
        img.save(out, format='JPEG', quality=JPEG_QUALITY, optimize=True)
        encoded = base64.b64encode(out.getvalue()).decode('ascii')
        log(f'    encoded {len(encoded)//1024} KB base64 ({img.size[0]}x{img.size[1]})', 'ok')
        return encoded
    except Exception as e:
        log(f'    image processing failed: {e}', 'err')
        return None


def patch_html(html_path, photos):
    """Insert or replace the HISTORICAL_PHOTOS_OVERRIDE block in pink_oregon_trail.html."""
    if not html_path.exists():
        log(f'HTML file not found: {html_path}', 'err')
        sys.exit(1)
    html = html_path.read_text(encoding='utf-8')
    # Build the override block as a JS const
    block_lines = ['  window.HISTORICAL_PHOTOS_OVERRIDE = {']
    for landmark_id, b64 in photos.items():
        if b64:
            # Use string concatenation to keep line lengths reasonable
            block_lines.append(f'    {landmark_id}: ' + repr(b64).replace("'", '"') + ',')
    block_lines.append('  };')
    new_block = (
        '<script id="historical-photos-override">\n'
        '  // Generated by fetch_historical_photos.py — DO NOT EDIT BY HAND.\n'
        '  // Re-run the script to refresh. To remove: delete this <script> block.\n'
        + '\n'.join(block_lines) + '\n'
        '</script>\n'
    )
    # Replace existing block if present
    pattern = re.compile(
        r'<script id="historical-photos-override">.*?</script>\s*',
        re.DOTALL,
    )
    if pattern.search(html):
        html = pattern.sub(new_block, html, count=1)
        log('replaced existing override block', 'ok')
    else:
        # Insert immediately before the closing </body> tag
        if '</body>' not in html:
            log('could not find </body> tag in HTML — file may be malformed', 'err')
            sys.exit(1)
        html = html.replace('</body>', new_block + '</body>', 1)
        log('inserted new override block before </body>', 'ok')
    html_path.write_text(html, encoding='utf-8')
    size_kb = html_path.stat().st_size // 1024
    log(f'wrote {html_path.name} ({size_kb} KB)', 'ok')


def main():
    parser = argparse.ArgumentParser(description='Download and embed historical photos.')
    parser.add_argument('--html', default='pink_oregon_trail.html',
                        help='Path to pink_oregon_trail.html (default: %(default)s)')
    args = parser.parse_args()
    html_path = Path(args.html).resolve()
    print('=' * 64)
    print('Pink Oregon Trail — Historical Photos Fetcher')
    print('=' * 64)
    print(f'Target: {html_path}')
    print()
    photos = {}
    for landmark_id, info in PHOTO_URLS.items():
        encoded = fetch_and_encode(landmark_id, info)
        photos[landmark_id] = encoded
    print()
    successful = sum(1 for v in photos.values() if v)
    log(f'fetched {successful} of {len(PHOTO_URLS)} photos', 'ok' if successful >= 5 else 'warn')
    if successful == 0:
        log('no photos fetched — leaving HTML unchanged', 'err')
        sys.exit(2)
    patch_html(html_path, photos)
    print()
    log('Done. Open pink_oregon_trail.html in a browser to see real photos at landmarks.', 'ok')
    log('To revert to SVG-only: delete the <script id="historical-photos-override"> block.', 'info')


if __name__ == '__main__':
    main()
