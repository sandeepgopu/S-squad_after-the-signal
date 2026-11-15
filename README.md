# After the Signal — Mars Story Atlas

An interactive, sourced web story built for NASA Space Apps Challenge 2026, *Abandoned but not Forgotten*. The first complete narrated mission is Opportunity (MER-B). The default `/` page is a single explorer with a 3D solar-system view, Mars and Moon globes, a curated surface-object catalog, mission phases, imagery and highlights. The site is served by a single dependency-free Node server (`server.mjs`).

## Quick start (works on a fresh clone)

Requirements: **Node.js 18 or newer** and an internet connection. No `npm install`, no build step, no database.

```
git clone https://github.com/sandeepgopu/S-squad_after-the-signal.git
cd S-squad_after-the-signal
node server.mjs
```

Open **http://127.0.0.1:8765/** in Chrome, Edge or Firefox (set `PORT=3000` to use another port). The server also listens on the LAN, so other devices can use `http://<your-ip>:8765/`.

- Everything needed to run (data, photographs, the photo-ride video, the SPICE-derived positions) is in this repository.
- The Mars and Moon imagery globes stream NASA Trek tiles through the server (cached in `cache/`), and CesiumJS and fonts load from CDNs, so the first load needs internet.
- Large raw NASA source files (SPICE kernels, a 134 MB TIFF, the PDS image index) are **not** stored here; they are only needed to *rebuild* derived data. Where each one comes from and how to re-create it is documented in [DATA_SOURCES.md](DATA_SOURCES.md) and [SETUP.md](SETUP.md).
- `npm run check` validates the mission catalog and JavaScript syntax.

## Explorer and source-backed object catalog

`/` opens the integrated explorer. Choose Mars or the Moon to see a NASA Trek imagery globe and 43 curated object records (18 Mars, 25 Moon). Thirty-six records have published coordinates and appear as pins; the rest have named regions only and remain in the sidebar. A `STORY` badge marks the missions with a narrative view. The list is a vetted first release, not an exhaustive inventory of every mission. Each record links to an original source and carries a precision note. The catalog is `data/atlas-objects.json`; supplementary story imagery and highlights are `data/story-extras.json`.

The solar view plays SPICE-sampled planetary positions in 3D, preserving inclination relative to the ECLIPJ2000 plane. The slider ranges over the selected mission segment, and craft markers appear only during kernel-covered dates. Planet symbols are enlarged for visibility. The Opportunity phase view places its source imagery and narrated text beside the map; the timeline and NASA annotated route-map control are on the same page. The detailed Opportunity story is at `/story.html`, the photo ride at `/ride.html`, and the advanced solar atlas at `/atlas.html`.

## Rendering and precision

- Mars globe: CesiumJS with Mars's IAU-style ellipsoid (equatorial radius 3,396,190 m, polar radius 3,376,200 m), matching camera map projection, and NASA Mars Trek's Viking colour global mosaic. The surface control adds the Mars Trek Meridiani CTX regional mosaic (grayscale) for close exploration. The server can also serve MOLA false-colour elevation tiles. Tiles use a two-column, one-row level-zero geographic grid, not Earth Web Mercator. The D: server proxies and caches the tiles.
- Coordinates in data: planetocentric latitude and east-positive longitude in 0–360 degrees. No Earth WGS84 position is passed to a Mars marker. West longitude is `360 - east` for non-zero values.
- The landing marker is a published NASA landing coordinate. Endeavour's marker is the official crater *centre*, not the rover's position. The final position is presented on NASA's original traverse map because an individually verified final rover coordinate has not been established in this edition.
- The original `/story.html` solar system panel is diagrammatic and explicitly labelled. It is not a JPL/Horizons trajectory reconstruction. The launch timestamp is exact to the second; the landing is deliberately presented to the UTC day due to conflicting time notation in one NASA page. See `data/missions.json` for the source note.
- The advanced `/atlas.html` solar view uses sampled NASA SPICE positions and Opportunity's archived cruise SPK. It replaces the diagrammatic curve for verified space geometry while the original narrated story remains intact. `/atlas-method.html` explains its frames, source kernels, interpolation and limits.
- The global MOLA layer cannot resolve a 22-metre crater. Local details use original NASA photographs and annotated orbital imagery, with credits. The Cesium globe is an ellipsoid with imagery, not a terrain DEM mesh; this is a known fidelity limit rather than a claim of photorealistic 3D at the landing site.
- Play story starts browser speech for the current chapter and automatically advances through the remaining chapters. Pause stops speech; manual timeline navigation during playback starts the newly selected chapter. The on-screen prose is the complete narration transcript. Speech voice and availability depend on the browser.
- The ground-view button opens source-backed rover camera panoramas where available. Pannellum provides drag-to-look and wheel / button zoom. The first Eagle panorama is [NASA PIA05199](https://science.nasa.gov/resource/as-far-as-opportunitys-eye-can-see/); the second viewpoint is [PIA05755](https://science.nasa.gov/photojournal/opportunity-captures-lion-king-panorama/); the final Perseverance Valley panorama is [PIA22909](https://science.nasa.gov/photojournal/opportunity-legacy-pan-true-color/). Black unphotographed regions in NASA's mosaics remain black. Endeavour's 2011 image is a directional mosaic, so it opens as a zoomable photo. These camera positions are not claimed to coincide with the globe's feature-centre markers.

## Ride with Opportunity

The optional `/ride.html` chapter streams a downloadable MP4 from `ride/opportunity-photo-ride.mp4`. It contains 191 selected Opportunity left Navcam images spanning Sol 1 through Sol 5086, shown at two photos per second. The player speaks a short, child-friendly story in four parts, offers a seek bar and chapter jumps, and lets the visitor zoom and drag the current original NASA PDS photograph. Browser speech is separate from the silent downloadable MP4. The movie represents dated snapshots, not continuous driving footage or a camera-pose-correct traverse animation.

The source is [NASA PDS MER1 Navcam EDR OPS](https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=MER1-M-NAVCAM-2-EDR-OPS-V1.0). `scripts/build_ride.py` reads the archive's `edrindex.tab` to select images by planetary sol and use each product's `START_TIME` in UTC. `ride/manifest.json` on D: preserves the product ID, exact timestamp, source URL, and video offset for every frame. Rebuild with `python scripts/build_ride.py`; the script keeps the raw images and index on D:. It attempts NVIDIA encoding, then falls back to CPU H.264 when the encoder is unavailable. The current MP4 used CPU encoding. The server supports HTTP byte ranges so the browser can stream and seek without loading the whole file.

## Mission atlas foundation

`/atlas.html` is a browser WebGL solar-system view driven by the [NASA NAIF SPICE](https://naif.jpl.nasa.gov/naif/spiceconcept.html) data system. Three.js draws the Sun, eight planets, Moon, sampled orbital tracks, and Opportunity's measured 2003–2004 cruise path. The browser uses SPICE position and velocity states with cubic Hermite interpolation between samples. All positions are Sun-origin ECLIPJ2000 Cartesian kilometres; displayed planet bodies are intentionally enlarged. The full-size raw kernels remain under ``kernels/`` and are blocked from web requests. The browser receives only `data/atlas-ephemeris.json` (about 0.8 MB). Apollo 11, Viking 1 and Opportunity each have a time range, event list and filter button. Viking 1 Orbiter has a separate reconstructed SPK orbit view. Apollo spacecraft and Viking cruise lines remain omitted until their flight vectors are ingested.

`/surface.html` uses a separate Cesium ellipsoid and NASA Trek tile set for the Moon or Mars. Apollo 11's landing pin uses NASA's LRO image-derived DE421 Mean Earth/Polar Axis coordinate; Viking 1 uses NASA's planetocentric Mars coordinate; Opportunity uses its published landing coordinate. The server proxies Moon Trek and Mars Trek imagery. These are imagery globes, not detailed terrain meshes, and the surface pin is not an image-resolved object identification.

To add a mission, add a new entry to `data/atlas-missions.json` with its time range, body, sourced events, objects and optional `spacecraftSpk` or `orbitSpk` URL plus NAIF ID, center, frame and sample interval. Run `python scripts/build_atlas.py`. The builder downloads any new kernels to D:, validates the spacecraft ID, and samples cruise and orbit segments automatically. `/orbit.html?mission=<id>` renders any cataloged orbit segment around Moon or Mars in its declared inertial frame. `npm run check` validates catalog structure, JavaScript and source references. The catalog's `spatialContract` requires explicit body-fixed versus inertial coordinates; new lunar or Mars missions do not need a renderer rewrite.

## Adding another mission story

The explorer uses an incremental adapter across existing files, not yet a single mission registry. A new mission still requires coordinated data entries, but should not require mission-specific navigation code:

1. Add the mission and its sourced event records to `data/atlas-missions.json`, and its objects to `data/atlas-objects.json`. Add a narrative mission, its named locations, source registry, and chapters to `data/missions.json`.
2. Add a `data/story-sequences.json` entry keyed by the same mission ID. Set explicit `story`, `narration`, `cruiseTrajectory`, and `surfaceRoute` capability flags. `objectChapterLinks` connects an object to a chapter; unlinked objects remain records. `chapterOverrides` supplies any missing `timePrecision` and explorer-specific prose for legacy chapters. Each chapter must have a source URL directly or a source ID in the mission source registry.
3. Optional typed `phases` may be inserted after a named chapter. Each requires a unique ID, kind, title, scene, date, `timePrecision`, date label, narrative, and source. Solar chapters need a second- or minute-precision event and a matching sampled segment before a synchronized position is shown. Day/month/year dates are never silently converted to precise instants. A mission without a matching segment shows an explicit unavailable state.
4. Set optional `trajectory` to the sampled segment ID, whether spacecraft samples are present, and a clear status/coverage statement. A segment can provide planetary positions with `spacecraft: false`. Only set the spacecraft capability when a sourced trajectory exists. Sample bounds are not proof of continuous kernel coverage. Set optional `route` to a named asset in `data/story-extras.json` with its own explanatory precision note; an annotated raster is not a georeferenced drive track. Optional links and narration are data-controlled.
5. Run `npm run check` and visually test the story, object links, precision states, and deep-link reload. The sequence verifier checks identifiers, chapter sources, time precision, location links, and absent/out-of-range sample handling. It does not independently verify the factual content of sources or the underlying SPICE kernel coverage.

`mission-adapter.js` assembles the chapters and checks whether a timed position can be shown. The integrated explorer supports its existing Moon/Mars surface and solar scene modes. Multi-world missions, different coordinate frames, spacecraft events with multiple segments, authenticated terrain, and formally registered rover geometry need further modeling; creating a data entry alone does not provide these. `FOUNDATION-AUDIT.md` records remaining kernel, datum, and cross-catalog work. The older standalone pages retain their own implementations and are not automatically covered by this adapter.

## Repository review and choices

- [NASA AMMOS MMGIS](https://github.com/NASA-AMMOS/MMGIS): mature 2D/3D planetary GIS, data layers, time control, and mission operations use. Useful reference for later large mission collections; substantial backend and configuration for one short story.
- [NASA Space Apps Martian Map](https://github.com/RISHI-1453/NASA_Space-Apps_Challenge_Martian_Map): demonstrates CesiumJS Mars globe, streaming terrain and imagery, and rover tracks. Strong technical reference. Its data pipeline and service assumptions require independent validation; no source code was copied.
- [Abandoned but not Forgotten](https://github.com/Perfectreviewer/abandoned-but-not-forgotten): story chapters and real-position markers for several objects; illustrates why our experience makes evidence and uncertainty visible to the audience.
- [Tour de Mars](https://github.com/pengvil/Tour-de-Mars): lightweight tour using Mars Trek tiles; reinforces the NASA tile approach.

## Challenge and AI disclosure

**Who made this.** This project was created by our team. The story direction, the choice of missions and what to tell about them, and the UI/UX layout and flow of every screen were decided by the team, who guided the work and gave feedback on a regular basis throughout.

**How AI helped.** None of us are developers or technical people. To turn our ideas into a working website, we used AI development agents, **Codex** and **Claude**, as our engineering help. The agents assisted with preparing the story text, acquiring and processing the NASA data (SPICE trajectories, imagery, traverse data and catalog records), writing the code, and preparing the look of the pages. The team reviewed the results, and the facts were checked against the linked NASA, JPL, PDS and USGS sources. Every object record and chapter carries its source link; see [DATA_SOURCES.md](DATA_SOURCES.md).

**Sources and media.** The first mission uses a challenge-listed NASA source, the NASA Science Opportunity page, alongside JPL, NASA Photojournal, NASA PDS and USGS records. All photographs and video frames are original NASA/JPL/ISRO imagery with credits shown in the experience; no AI-generated photographs or video frames are included. "Play story" and the photo ride use the visitor's browser synthetic speech voice.

This is an independent participant project and does not claim NASA endorsement.

## Integrated explorer (2026-11-15)

The default `/` page is now the Mars/Moon explorer, also available at `/explore.html`. It combines SPICE planetary positions, the 43-record sourced object catalog (36 pinned, seven without precise coordinates), globe selection, mission imagery, timeline, and Opportunity narration. The original story remains at `/story.html`. Object and chapter URLs restore on reload.

Integration checks passed locally and. Chrome checks covered the default view, Opportunity launch/landing and narration controls, Moon imagery, and Chandrayaan-3 deep links. Responsive grid overflow was fixed after a narrow-layout inspection.
