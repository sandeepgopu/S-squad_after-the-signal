"""Inspect NASA PDS MER1 Navcam EDR index."""
import csv
from collections import Counter
from pathlib import Path
from urllib.request import urlretrieve

root = Path(__file__).resolve().parents[1]
archive = root / 'ride'
archive.mkdir(exist_ok=True)
index = archive / 'edrindex.tab'
url = 'https://planetarydata.jpl.nasa.gov/img/data/mer1-m-navcam-2-edr-ops-v1.0/mer1no_0xxx/index/edrindex.tab'
if not index.exists():
    print('Downloading NASA PDS Navcam index...', flush=True)
    urlretrieve(url, index)

sols = Counter()
sizes = Counter()
types = Counter()
dates = []
with index.open(newline='', encoding='ascii') as file:
    for row in csv.reader(file, delimiter='\t'):
        if len(row) < 44 or row[3].strip(' "') != 'NAVCAM_LEFT':
            continue
        sol = int(row[11])
        sols[sol] += 1
        sizes[(int(row[21]), int(row[22]))] += 1
        types[(row[26].strip(' "'), row[31].strip(' "'))] += 1
        if sol in (1, 1000, 2600, 4736, 5000, 5111) and len(dates) < 20:
            dates.append((sol, row[12], row[5].strip(' "')))
print('sols', len(sols), min(sols), max(sols), 'left images', sum(sols.values()))
print('top sizes', sizes.most_common(8))
print('top types', types.most_common(8))
print('samples', dates)
