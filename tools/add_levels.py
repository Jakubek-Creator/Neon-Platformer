"""Adds levels to the campaign in levels/.

  python tools/add_levels.py my_campaign.json          campaign export (🏆 Campaign → ⬇ Export Campaign)
  python tools/add_levels.py lvl1.json lvl2.json ...   single levels (editor → ⬇ Save As…), added in this order
  python tools/add_levels.py --replace ...             replace the campaign instead of adding to the end

Each level is written to levels/NN-name.json and listed in levels/campaign.json.
Run tools/build.py afterwards so the offline copy picks them up."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEVELS = os.path.join(ROOT, 'levels')
CAMP = os.path.join(LEVELS, 'campaign.json')

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:40] or 'level'

def read_levels(path):
    d = json.load(open(path, encoding='utf-8'))
    base = os.path.splitext(os.path.basename(path))[0]
    if isinstance(d, dict) and isinstance(d.get('levels'), list):           # campaign export
        return [(lv.get('name') or f"{d.get('name', base)} {i+1}", lv.get('data', lv)) for i, lv in enumerate(d['levels'])]
    if isinstance(d, dict) and 'grid' in d:                                  # single level
        return [(d.get('name') or base, d)]
    if isinstance(d, dict) and isinstance(d.get('data'), dict):              # library entry
        return [(d.get('name') or base, d['data'])]
    sys.exit(f'{path}: not a level or campaign file')

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    camp = json.load(open(CAMP, encoding='utf-8')) if os.path.exists(CAMP) else {'name': 'Neon Platformer', 'levels': []}
    if '--replace' in sys.argv:
        camp['levels'] = []
    for path in args:
        for name, data in read_levels(path):
            if 'grid' not in data:
                sys.exit(f'{path}: level "{name}" has no grid')
            data = {k: v for k, v in data.items() if k not in ('thumb', 'savedAt')}
            data['name'] = name
            n = len(camp['levels']) + 1
            fname = f'{n:02d}-{slug(name)}.json'
            with open(os.path.join(LEVELS, fname), 'w', encoding='utf-8') as f:
                json.dump(data, f, separators=(',', ':'))
            camp['levels'].append(fname)
            print(f'  level {n:2d}  {fname}')
    with open(CAMP, 'w', encoding='utf-8') as f:
        json.dump(camp, f, indent=2)
    print(f'campaign now has {len(camp["levels"])} levels')

main()
