"""Build a sourced Opportunity Navcam photo ride from NASA PDS."""
import csv
import json
import math
import subprocess
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
RIDE = ROOT / 'ride'
INDEX = RIDE / 'edrindex.tab'
RAW = RIDE / 'raw'
FRAMES = RIDE / 'frames'
PDS_BASE = 'https://planetarydata.jpl.nasa.gov/img/data/mer1-m-navcam-2-edr-ops-v1.0'
INDEX_URL = PDS_BASE + '/mer1no_0xxx/index/edrindex.tab'
TARGET_COUNT = 200
FPS = 2

for folder in (RIDE, RAW, FRAMES):
    folder.mkdir(exist_ok=True)

if not INDEX.exists():
    print('Downloading PDS Navcam index...', flush=True)
    urllib.request.urlretrieve(INDEX_URL, INDEX)

def cleaned(value):
    return value.strip(' "')

targets = [round(1 + i * 5110 / (TARGET_COUNT - 1)) for i in range(TARGET_COUNT)]
candidates = [[] for _ in targets]
with INDEX.open(newline='', encoding='ascii') as file:
    for row in csv.reader(file, delimiter='\t'):
        if len(row) < 44 or cleaned(row[3]) != 'NAVCAM_LEFT':
            continue
        sol = int(row[11])
        if not 1 <= sol <= 5111 or cleaned(row[26]) != 'FULL_FRAME':
            continue
        width, height = int(row[22]), int(row[21])
        if min(width, height) < 512:
            continue
        target_index = min(range(len(targets)), key=lambda i: abs(targets[i] - sol))
        azimuth = float(row[42]) if cleaned(row[42]) else 0
        elevation = float(row[43]) if cleaned(row[43]) else 0
        score = abs(targets[target_index] - sol) * 50 + abs(azimuth) * .1 + abs(elevation) * .1
        score -= min(width, height) * .08
        if cleaned(row[31]) != 'REGULAR':
            score += 30
        if 'edn' not in cleaned(row[5]).lower():
            score += 10
        filename = cleaned(row[5]).lower()
        path = cleaned(row[4]).replace('/data/', '/browse/')
        source = f'{PDS_BASE}{path}{filename}.jpg'
        candidates[target_index].append((score, {
            'sol': sol, 'utc': cleaned(row[12]), 'productId': cleaned(row[7]),
            'camera': 'Opportunity Navcam left', 'source': source,
            'width': width, 'height': height,
        }))

selected = []
for choices in candidates:
    if choices:
        choices.sort(key=lambda pair: pair[0])
        selected.append([record for _, record in choices[:8]])
print(f'Selected {len(selected)} sol bins; fetching original NASA browse images...', flush=True)

def retrieve(options):
    for record in options:
        output = RAW / f"{record['productId']}.jpg"
        if not output.exists():
            try:
                urllib.request.urlretrieve(record['source'], output)
            except Exception:
                output.unlink(missing_ok=True)
                continue
        try:
            with Image.open(output) as image:
                image.verify()
            with Image.open(output) as image:
                if min(image.size) < 400:
                    continue
                gray = image.convert('L').resize((64, 64))
                if ImageStat.Stat(gray).stddev[0] < 9:
                    continue
                detail = image.convert('L').resize((128, 128)).filter(ImageFilter.FIND_EDGES).crop((8, 8, 120, 120))
                if ImageStat.Stat(detail).mean[0] < 3:
                    continue
                sample = image.convert('L').resize((128, 128))
                if sample.getextrema()[1] >= 240 and sorted(sample.getdata())[8192] < 50 and ImageStat.Stat(sample.crop((0, 64, 128, 128))).stddev[0] < 15:
                    continue
            return record, output
        except Exception:
            output.unlink(missing_ok=True)
    return None

results = [None] * len(selected)
with ThreadPoolExecutor(max_workers=6) as pool:
    futures = {pool.submit(retrieve, options): i for i, options in enumerate(selected)}
    for finished, future in enumerate(as_completed(futures), 1):
        results[futures[future]] = future.result()
        if finished % 25 == 0:
            print(f'Fetched {finished}/{len(selected)} bins', flush=True)

results = [item for item in results if item]
print(f'{len(results)} usable NASA images', flush=True)
if len(results) < 120:
    raise RuntimeError('Too few valid Navcam images for a mission-wide ride')

font_regular = Path('C:/Windows/Fonts/segoeui.ttf')
font_bold = Path('C:/Windows/Fonts/segoeuib.ttf')
font = lambda size, bold=False: ImageFont.truetype(str(font_bold if bold else font_regular), size)
orange = (230, 166, 119)
white = (248, 241, 232)
muted = (162, 167, 174)

def act(sol):
    if sol < 900:
        return '01 / FIRST EXPLORATIONS'
    if sol < 2681:
        return '02 / THE LONG DRIVE'
    if sol < 4736:
        return '03 / ENDEAVOUR YEARS'
    return '04 / FINAL VALLEY YEARS'

def panel(frame, record, number, total):
    draw = ImageDraw.Draw(frame)
    draw.rectangle((0, 0, 1280, 720), fill=(15, 20, 29))
    draw.rectangle((720, 0, 1280, 720), fill=(22, 25, 33))
    draw.text((758, 42), 'RIDE WITH OPPORTUNITY', font=font(21, True), fill=orange)
    draw.text((758, 92), 'A NAVCAM PHOTO JOURNEY', font=font(15), fill=muted)
    draw.line((758, 140, 1230, 140), fill=(83, 86, 92), width=2)
    draw.text((758, 170), act(record['sol']), font=font(17, True), fill=white)
    draw.text((758, 228), f"SOL {record['sol']:04}", font=font(60, True), fill=white)
    draw.text((760, 310), record['utc'][:10] + ' UTC', font=font(23), fill=orange)
    draw.text((758, 393), 'Real image from the rover\'s', font=font(20), fill=white)
    draw.text((758, 424), 'left navigation camera.', font=font(20), fill=white)
    draw.text((758, 502), 'Selected stills across 14 years.', font=font(17), fill=muted)
    draw.text((758, 530), 'Jumps between sols are intentional.', font=font(17), fill=muted)
    draw.rectangle((758, 625, 1220, 631), fill=(63, 67, 75))
    draw.rectangle((758, 625, 758 + round(462 * number / total), 631), fill=orange)
    draw.text((758, 649), 'NASA PDS · MER1 NAVCAM EDR BROWSE', font=font(13), fill=muted)

def render_still(record, source, number, total):
    frame = Image.new('RGB', (1280, 720))
    panel(frame, record, number, total)
    with Image.open(source) as image:
        image = ImageOps.fit(image.convert('RGB'), (720, 720), method=Image.Resampling.LANCZOS)
        frame.paste(image, (0, 0))
    return frame

manifest = []
for i, (record, source) in enumerate(results, 1):
    output = FRAMES / f'frame_{i:04}.jpg'
    render_still(record, source, i, len(results)).save(output, 'JPEG', quality=88, optimize=True)
    manifest.append({**record, 'frame': i, 'timeSeconds': (i-1) / FPS})
    if i % 40 == 0:
        print(f'Rendered {i}/{len(results)} frames', flush=True)
for stale in FRAMES.glob('frame_*.jpg'):
    if int(stale.stem.split('_')[1]) > len(results):
        stale.unlink()

metadata = {
    'title': 'Ride with Opportunity',
    'description': 'Representative Navcam left-eye stills across Opportunity\'s surface mission; not continuous video or a complete route reconstruction.',
    'cameraSource': 'NASA Planetary Data System MER1 Navcam EDR OPS archive',
    'indexUrl': INDEX_URL,
    'framesPerSecond': FPS,
    'frameCount': len(manifest),
    'durationSeconds': len(manifest) / FPS,
    'frames': manifest,
}
(RIDE / 'manifest.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
output = RIDE / 'opportunity-photo-ride.mp4'
base = [ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(FRAMES / 'frame_%04d.jpg')]
options = ['-r', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)]
print('Encoding on the Windows laptop...', flush=True)
gpu = subprocess.run(base + ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '25'] + options, capture_output=True, text=True)
if gpu.returncode:
    print('NVIDIA encoder unavailable; using software H.264:', gpu.stderr[-300:], flush=True)
    cpu = subprocess.run(base + ['-c:v', 'libx264', '-preset', 'medium', '-crf', '24'] + options, capture_output=True, text=True)
    if cpu.returncode:
        raise RuntimeError(cpu.stderr[-1000:])
    metadata['encoder'] = 'libx264'
else:
    metadata['encoder'] = 'h264_nvenc'
(RIDE / 'manifest.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
print(f'Finished {output} ({output.stat().st_size / 1_000_000:.1f} MB), {len(manifest)} images, {metadata["encoder"]}', flush=True)
