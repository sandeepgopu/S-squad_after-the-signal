# Setup

## Requirements
- Node.js 18+ (the server uses only built-in modules; no `npm install` needed)
- Python 3.10+ (optional, only to rebuild data): `pip install -r requirements.txt`
- Internet access: CesiumJS and fonts load from CDN; Mars/Moon map tiles are proxied from NASA Trek and cached in `cache/`.

## Run
```
node server.mjs        # or: npm start
```
Open http://127.0.0.1:8765/ (the server binds to all interfaces; allow Node through the firewall for LAN access).
On Windows, `run-server.cmd` / `start-server.cmd` start it from the folder they sit in.

## Large files not stored in git (re-created on demand)
| Path | How to get it |
|---|---|
| `kernels/` (SPICE kernels) | `python scripts/build_atlas.py` downloads them from NASA NAIF |
| `ride/raw/`, `ride/edrindex.tab` | `python scripts/build_ride.py` downloads them from NASA PDS |
| `assets/PIA22909_full.tif` | `python scripts/prepare_final_pan.py` downloads it from NASA |
| `cache/` | Created automatically as map tiles are requested |

The committed `data/atlas-ephemeris.json`, `ride/opportunity-photo-ride.mp4` and `ride/manifest.json` mean the site runs without rebuilding anything.

## Check
`npm run check` validates the catalog and JavaScript syntax.
