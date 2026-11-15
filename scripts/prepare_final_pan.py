"""Create a browser-sized JPEG from NASA's original Opportunity legacy panorama.

Run. The full TIFF is retained there as provenance.
"""
from pathlib import Path
from urllib.request import urlretrieve
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "assets" / "PIA22909_full.tif"
output = root / "assets" / "final-pan.jpg"
url = "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia22/pia22909/tiff/PIA22909_full.tif"
if not source.exists():
    print("Downloading NASA PIA22909 original...")
    urlretrieve(url, source)
Image.MAX_IMAGE_PIXELS = None
with Image.open(source) as image:
    image.thumbnail((8192, 8192), Image.Resampling.LANCZOS)
    image.convert("RGB").save(output, "JPEG", quality=87, optimize=True)
print(f"Prepared {output}")
