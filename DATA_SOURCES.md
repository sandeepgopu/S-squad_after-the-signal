# Data sources and provenance

Everything the site displays comes from public NASA / JPL / ISRO / USGS material. Nothing here is AI-generated imagery. Each object record in `data/atlas-objects.json` and each chapter in `data/missions.json` carries its own source URL; this page lists where the *bulk* data and files come from, and how the files that are **not stored in this git repository** are re-created.

## Files not in git (and where they come from)

The repository is complete enough to run: `node server.mjs` works on a fresh clone with no extra downloads (verified). Four things are deliberately left out because they are large, public, and re-downloadable. None are needed to *run* the site; they are only needed to *rebuild* the derived data.

| Left-out path | Size | What it is | Original source | Rebuild command |
|---|---|---|---|---|
| `kernels/de440s.bsp` | 33 MB | JPL planetary ephemeris (SPICE SPK) | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp | `python scripts/build_atlas.py` |
| `kernels/naif0012.tls` | <1 MB | Leap-seconds kernel | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls | `python scripts/build_atlas.py` |
| `kernels/mer1_cruise.bsp` | 1 MB | Opportunity (MER-B) cruise trajectory | https://naif.jpl.nasa.gov/pub/naif/pds/data/mer1-m-spice-6-v1.0/mer1sp_1000/data/spk/mer1_cruise.bsp | `python scripts/build_atlas.py` |
| `kernels/vo1_rcon.bsp` | 26 MB | Viking 1 Orbiter reconstructed orbit | https://naif.jpl.nasa.gov/pub/naif/VIKING/kernels/spk/vo1_rcon.bsp | `python scripts/build_atlas.py` |
| `assets/PIA22909_full.tif` | 134 MB | Original NASA Photojournal PIA22909 (Opportunity legacy panorama), source of the committed `assets/final-pan.jpg` | https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia22/pia22909/tiff/PIA22909_full.tif | `python scripts/prepare_final_pan.py` |
| `ride/edrindex.tab` | 112 MB | PDS index of MER-1 Navcam EDR images | https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=MER1-M-NAVCAM-2-EDR-OPS-V1.0 (file: https://planetarydata.jpl.nasa.gov/img/data/mer1-m-navcam-2-edr-ops-v1.0/mer1no_0xxx/index/edrindex.tab) | `python scripts/build_ride.py` |
| `ride/raw/` | 20 MB | The 191 original Navcam photographs used in the photo ride | NASA PDS MER1 Navcam EDR OPS (same dataset) | `python scripts/build_ride.py` |
| `cache/` | grows | Map tiles proxied from NASA Trek on demand | https://trek.nasa.gov/tiles/ | automatic (the server fills it) |

The *outputs* of those rebuilds are committed: `data/atlas-ephemeris.json`, `data/atlas-orbits.json`, `assets/final-pan.jpg`, `ride/opportunity-photo-ride.mp4`, `ride/manifest.json`, `ride/frames/`.

Rebuild everything:

```
pip install -r requirements.txt
python scripts/build_atlas.py        # downloads kernels, regenerates data/atlas-*.json
python scripts/prepare_final_pan.py  # downloads the TIFF, regenerates assets/final-pan.jpg
python scripts/build_ride.py         # downloads index + photos, regenerates the ride video
```

## Live services (needs internet when running)

| Used for | Source |
|---|---|
| Mars imagery globe (Viking colour mosaic, MOLA elevation, Meridiani CTX) and Moon imagery (LRO) tiles | NASA Trek tile service, https://trek.nasa.gov, proxied and cached by `server.mjs` |
| 3D globe library | CesiumJS 1.134.1 from the jsDelivr CDN |
| Fonts | Google Fonts |

If the machine is offline the globes show no imagery; all stories, data, photographs, the solar-system view and the photo ride still work.

## Bundled third-party libraries (`vendor/`)

Three.js (`three.module.js`, `three.core.js`) and Pannellum (`pannellum.js/css`) - both MIT licensed.

## Traverse (rover route) data in `data/routes/`

| File | Source |
|---|---|
| `opportunity.csv`, `opportunity.lbl`, `spirit.csv` | PDS Geosciences Analyst's Notebook MER traverse, https://an.rsl.wustl.edu/mera/AN/pages/mer/mer_traverse.htm |
| `msl.json` | NASA MMGIS, https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json |
| `perseverance-sol-checkpoints.json`, `m20.json` | NASA MMGIS, https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json |

## Images in `assets/`

Credit and source page for each image, as recorded in the data files:

| File | Credit | Source page |
|---|---|---|
| `/assets/apollo10-lunar-orbit.jpg` | NASA | https://www.nasa.gov/image-article/apollo-10-command-module-charlie-brown/ |
| `/assets/apollo11-launch-official.jpg` | NASA | https://www.nasa.gov/image-article/apollo-11-lifts-off/ |
| `/assets/apollo11-launch.jpg` | NASA | https://www.nasa.gov/image-article/apollo-11-lifts-off/ |
| `/assets/apollo11-lro.jpg` | NASA / LRO | https://science.nasa.gov/resource/apollo-11-landing-site/ |
| `/assets/apollo12-launch.jpg` | NASA | https://www.nasa.gov/image-article/55-years-ago-apollo-12-launches/ |
| `/assets/apollo12-lro.jpg` | NASA/GSFC/Arizona State University · PIA12903 | https://science.nasa.gov/photojournal/first-look-apollo-12-and-surveyor-3/ |
| `/assets/apollo13-damage.jpg` | NASA | https://www.nasa.gov/image-article/damage-from-apollo-13-explosion/ |
| `/assets/apollo14-lro.jpg` | NASA/GSFC/Arizona State University · PIA14003 | https://science.nasa.gov/photojournal/new-view-of-apollo-14/ |
| `/assets/apollo15-lro.png` | NASA | https://www.nasa.gov/image-article/apollo-15-interplanetary-mountaineers/ |
| `/assets/apollo15-rover.jpg` | NASA | https://science.nasa.gov/resource/apollo-15-on-the-moon/ |
| `/assets/apollo15-traverse.png` | NASA / LRO Camera | https://www.nasa.gov/image-article/apollo-15-interplanetary-mountaineers/ |
| `/assets/apollo16-lro.jpg` | NASA/GSFC/Arizona State University | https://science.nasa.gov/photojournal/apollo-16-footsteps-under-high-sun/ |
| `/assets/apollo16-rover.jpg` | NASA | https://www.nasa.gov/image-article/john-young-driving-lunar-rover/ |
| `/assets/apollo16-traverse.png` | NASA | https://www.nasa.gov/history/apollo-16-on-the-moon-at-descartes/ |
| `/assets/apollo17-launch.jpg` | NASA | https://science.nasa.gov/resource/apollo-17-launch/ |
| `/assets/apollo17-lro.jpg` | NASA/GSFC/Arizona State University · PIA12920 | https://science.nasa.gov/photojournal/exploring-the-apollo-17-site/ |
| `/assets/apollo17-rover.jpg` | NASA | https://science.nasa.gov/image-article/apod-2001-june-9-apollo-17s-lunar-rover/ |
| `/assets/apollo17-traverse.jpg` | NASA | https://www.nasa.gov/history/50-years-ago-apollo-17-lands-at-taurus-littrow/ |
| `/assets/apollo8-earthrise.jpg` | NASA | https://www.nasa.gov/image-article/apollo-8-earthrise/ |
| `/assets/chandrayaan1-water-map.jpg` | ISRO / NASA / JPL-Caltech / Brown University / USGS | https://science.nasa.gov/mission/chandrayaan-1/ |
| `/assets/chandrayaan2-launch-vehicle.webp` | ISRO | https://www.isro.gov.in/Chandrayan_2.html |
| `/assets/chandrayaan3-orbital-site.jpg` | ISRO | https://www.isro.gov.in/ch3_Discovery_of_a_buried_crater_on_the_moon.html |
| `/assets/chandrayaan3-vikram-from-pragyan.jpg` | ISRO | https://www.isro.gov.in/ISRO_EN/India_Bags_Credit_First-Ever_In-Situ_Measurement.html |
| `/assets/eagle-lion-8192.jpg` | NASA / JPL / Cornell · PIA05755 |  |
| `/assets/eagle-pan.jpg` | NASA/JPL-Caltech/Cornell · PIA05199 | https://science.nasa.gov/resource/as-far-as-opportunitys-eye-can-see/ |
| `/assets/endeavour-full.jpg` | NASA/JPL-Caltech/Cornell/ASU · PIA14509 | https://science.nasa.gov/photojournal/arrival-at-spirit-point-by-mars-rover-opportunity/ |
| `/assets/final-map.jpg` | NASA / JPL-Caltech / MSSS · PIA23178 |  |
| `/assets/final-pan.jpg` | NASA/JPL-Caltech/Cornell/ASU · PIA22909 | https://science.nasa.gov/photojournal/opportunity-legacy-pan-true-color/ |
| `/assets/ingenuity-valinor-hills.jpg` | NASA/JPL-Caltech/ASU/MSSS · PIA26237 | https://www.jpl.nasa.gov/images/pia26237-ingenuity-at-valinor-hills/ |
| `/assets/landing-close.jpg` | NASA / JPL-Caltech · PIA05575 |  |
| `/assets/opportunity-launch.jpg` | NASA / JPL-Caltech | https://science.nasa.gov/resource/opportunity-rover-delta-ii-launch/ |
| `/assets/perseverance-edl-annotated.jpg` | NASA/JPL-Caltech/University of Arizona · PIA24333 | https://science.nasa.gov/image-article/apod-2021-february-27-perseverance-landing-site-from-mars-reconnaissance-orbiter/ |
| `/assets/perseverance-launch.jpg` | United Launch Alliance / NASA | https://science.nasa.gov/resource/powerful-launch-for-mars-2020-perseverance/ |
| `/assets/viking-first-panorama.jpg` | NASA/JPL · PIA00383 | https://science.nasa.gov/photojournal/first-panoramic-view-from-the-surface-of-mars-2/ |
| `/assets/water.jpg` | NASA / JPL-Caltech / Cornell · PIA05634 | https://science.nasa.gov/resource/discovery-served-up-in-a-bowl/ |
| `/assets/zhurong-selfie.jpg` | CNSA via The Planetary Society | https://www.planetary.org/space-images/chinas-zhurong-rover-on-mars |
| `/assets/gateway-mars.jpg` | NASA/JPL-Caltech/USGS Viking mosaic | https://trek.nasa.gov |
| `/assets/gateway-moon.jpg` | NASA SVS / LRO mosaic | https://svs.gsfc.nasa.gov |

`assets/ride-poster.jpg` is a frame from the photo ride (original NASA PDS Navcam photographs, see above). `assets/eagle-lion-pan.jpg`, `endeavour.jpg` and `landing.jpg` are older NASA image copies no longer referenced by any page.

NASA imagery is used under NASA's media guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/). This is an independent participant project and does not claim NASA endorsement.
