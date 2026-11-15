"""Build browser-sized, source-traceable SPICE samples.

Usage: python scripts/build_atlas.py
Raw kernels stay under kernels/; only sampled JSON is served.
"""
import json
import os
from pathlib import Path
from urllib.request import urlretrieve
from datetime import datetime, timedelta

import spiceypy as spice

ROOT = Path(__file__).resolve().parents[1]
KERNELS = ROOT / 'kernels'
OUT = ROOT / 'data' / 'atlas-ephemeris.json'
OUT_ORBITS = ROOT / 'data' / 'atlas-orbits.json'
GENERIC = {
    'de440s.bsp': 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp',
    'naif0012.tls': 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls',
}
BODY_IDS = {
    'mercury': '1', 'venus': '2', 'earth': '399', 'moon': '301',
    'mars': '4', 'jupiter': '5', 'saturn': '6', 'uranus': '7', 'neptune': '8',
}
def utc(text):
    return datetime.fromisoformat(text.replace('Z', '+00:00'))

def kernel(name, url):
    path = KERNELS / name
    if not path.exists() or path.stat().st_size == 0:
        print('Downloading', name, flush=True)
        tmp = path.with_suffix(path.suffix + '.part')
        urlretrieve(url, tmp)
        os.replace(tmp, path)
    return path

def state(target, et):
    value, _ = spice.spkezr(target, et, 'ECLIPJ2000', 'NONE', 'SUN')
    return ([round(float(v), 3) for v in value[:3]],
            [round(float(v), 10) for v in value[3:]])

def main():
    KERNELS.mkdir(exist_ok=True)
    missions = json.loads((ROOT / 'data' / 'atlas-missions.json').read_text())['missions']
    sources = dict(GENERIC)
    spice.furnsh(str(kernel('naif0012.tls', GENERIC['naif0012.tls'])))
    for mission in missions:
        for kind in ('spacecraftSpk', 'orbitSpk'):
            config = mission.get(kind)
            if config:
                name = config['url'].rsplit('/', 1)[-1]
                path = kernel(name, config['url'])
                if config['naifId'] not in list(spice.spkobj(str(path))):
                    raise ValueError(f"{mission['id']}: NAIF ID is absent from {name}")
                spice.furnsh(str(path))
                sources[name] = config['url']
    # The generic planetary solution is loaded last so it has priority over
    # any older planetary segments bundled in a mission-specific SPK.
    spice.furnsh(str(kernel('de440s.bsp', GENERIC['de440s.bsp'])))
    data = {
        'schemaVersion': 1,
        'frame': 'ECLIPJ2000',
        'origin': 'SUN',
        'unit': 'km',
        'sampleTimescale': 'UTC labels converted by NAIF LSK to ET/TDB',
        'interpolation': 'Cubic Hermite between source position/velocity states for storytelling visualization; SPK remains authoritative',
        'kernelSources': sources,
        'planetIds': BODY_IDS,
        'segments': {},
    }
    for mission in missions:
        mission_id = mission['id']
        hours = mission.get('ephemerisStepHours', 12)
        if hours <= 0 or hours > 24 or 24 % hours:
            raise ValueError(f'{mission_id}: invalid ephemerisStepHours')
        t = utc(mission['startUtc']).replace(hour=0, minute=0, second=0)
        end = utc(mission['endUtc']).replace(hour=0, minute=0, second=0) + timedelta(days=1)
        start, stop = t.strftime('%Y-%m-%dT%H:%M:%SZ'), end.strftime('%Y-%m-%dT%H:%M:%SZ')
        samples = []
        config = mission.get('spacecraftSpk')
        while t <= end:
            label = t.strftime('%Y-%m-%dT%H:%M:%SZ')
            et = spice.utc2et(label)
            body_states = {name: state(code, et) for name, code in BODY_IDS.items()}
            row = {'utc': label,
                   'bodies': {name: value[0] for name, value in body_states.items()},
                   'bodyVelocities': {name: value[1] for name, value in body_states.items()}}
            if config:
                try:
                    row['spacecraft'], row['spacecraftVelocity'] = state(str(config['naifId']), et)
                except spice.utils.exceptions.SpiceyError:
                    pass
            samples.append(row)
            t += timedelta(hours=hours)
        data['segments'][mission_id] = {'startUtc': start, 'stopUtc': stop, 'stepHours': hours, 'spacecraftId': config['naifId'] if config else None, 'samples': samples}
        print(mission_id, len(samples), 'samples', flush=True)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(',', ':')))
    print('Wrote', OUT, OUT.stat().st_size, 'bytes', flush=True)
    orbits = {'schemaVersion': 1, 'unit': 'km', 'segments': {}}
    for mission in missions:
        config = mission.get('orbitSpk')
        if not config:
            continue
        t, end = utc(config['startUtc']), utc(config['endUtc'])
        step = timedelta(minutes=config['stepMinutes'])
        samples = []
        while t <= end:
            label = t.strftime('%Y-%m-%dT%H:%M:%SZ')
            et = spice.utc2et(label)
            try:
                vec, _ = spice.spkpos(str(config['naifId']), et, config['frame'], 'NONE', str(config['centerId']))
                samples.append({'utc': label, 'positionKm': [round(float(v), 3) for v in vec]})
            except spice.utils.exceptions.SpiceyError:
                pass
            t += step
        if not samples:
            raise RuntimeError(f"{mission['id']}: orbit SPK has no coverage in declared window")
        orbits['segments'][mission['id']] = {
            'frame': config['frame'], 'centerId': config['centerId'],
            'naifId': config['naifId'], 'source': config['url'],
            'stepMinutes': config['stepMinutes'], 'samples': samples,
        }
        print(mission['id'], len(samples), 'orbit samples', flush=True)
    OUT_ORBITS.write_text(json.dumps(orbits, separators=(',', ':')))
    print('Wrote', OUT_ORBITS, OUT_ORBITS.stat().st_size, 'bytes', flush=True)
    spice.kclear()

if __name__ == '__main__':
    main()
