"""Deterministic card composition explicitly requested by the user.

Preserves all source assets. Outside the artwork aperture every output pixel is
identical to the reference frame. Name/rules/stat areas remain blank for HTML.
"""
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'card-template.json').read_text(encoding='utf-8'))
SOURCE = ROOT / 'cards-clean-layout-31'
DEST = ROOT / 'cards-unified-31'
DEST.mkdir(exist_ok=True)
OUT = ROOT / 'output' / 'card-template'
OUT.mkdir(parents=True, exist_ok=True)
reference = Image.open(ROOT / CONFIG['reference']).convert('RGB')
assert reference.size == (1024, 1536)
# A manually traced aperture stays inside the gold frame and behind the blue
# mana medallion and central jewels. It does not touch any gameplay fields.
aperture = [(224,63),(468,63),(484,77),(499,81),(512,100),(527,81),(542,77),(557,63),(855,63),
            (908,95),(942,137),(964,201),(964,719),(946,765),(920,793),
            (574,797),(545,776),(514,750),(484,776),(453,797),(133,797),
            (92,776),(63,730),(61,240),(77,224),(105,233),(118,244),
            (130,258),(144,239),(160,228),(190,214),(213,190),(228,163),
            (234,150),(248,132),(232,116),(227,91),(216,74)]
mask = Image.new('L', reference.size)
ImageDraw.Draw(mask).polygon(aperture, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(1.25))
mask.save(OUT / 'artwork-aperture.png')
frame = reference.convert('RGBA')
frame.putalpha(ImageOps.invert(mask))
frame.save(OUT / 'cthulhu-frame.png')
# Source-specific cropping affects illustration framing only, never UI positions.
metadata = json.loads(subprocess.check_output(['node','-e',
    "const fs=require('fs'),vm=require('vm');const c={window:{}};vm.runInNewContext(fs.readFileSync('cards-data.js','utf8'),c);process.stdout.write(JSON.stringify(c.window.CARDS));"], cwd=ROOT))
cards = {c['id']:c for c in metadata}
manifest = []
for file in sorted(SOURCE.glob('*.webp')):
    original = Image.open(file).convert('RGB')
    if original.size != reference.size:
        raise ValueError(f'{file.name}: expected 1024x1536, found {original.size}')
    ident = file.name[:2]
    card = cards[ident]
    layout = card.get('nameLayout', {})
    bottom = round(min(800, (layout.get('centerY',57.2)-layout.get('height',5.6)/2)*15.36-40))
    crop = (80,95,944,bottom)
    if ident == '25':
        result = reference.copy()
    else:
        painting = ImageOps.fit(original.crop(crop),(904,738),method=Image.Resampling.LANCZOS)
        layer = reference.copy()
        layer.paste(painting,(61,62))
        result = Image.composite(layer,reference,mask)
    target = DEST / file.name
    result.save(target,format='WEBP',lossless=True,method=6)
    # Verify the encoded file, not merely the in-memory composition.
    decoded = Image.open(target).convert('RGB')
    fixed_area = mask.point(lambda value: 255 if value == 0 else 0)
    difference = ImageChops.difference(decoded, reference)
    assert Image.composite(difference, Image.new('RGB',reference.size),fixed_area).getbbox() is None, file.name
    manifest.append({'id':ident,'source':file.as_posix().replace(ROOT.as_posix()+'/',''),
                     'output':'cards-unified-31/'+file.name,'sourceCrop':crop})

CONFIG['images']={row['source']:row['output'] for row in manifest}
(ROOT/'card-template.js').write_text('// Generated from card-template.json by scripts/build-unified-cards.py.\nwindow.CardTemplate = '+json.dumps(CONFIG,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
sheet=Image.new('RGB',(6*220,6*352),'#ddd');draw=ImageDraw.Draw(sheet)
for i,row in enumerate(manifest):
    thumb=Image.open(ROOT/row['output']);thumb.thumbnail((212,318));x=(i%6)*220;y=(i//6)*352
    sheet.paste(thumb,(x+4,y+24));draw.text((x+6,y+5),row['id'],fill='black')
sheet.save(OUT/'unified-contact.jpg')
print(f'Generated {len(manifest)} lossless cards with one shared frame in {DEST}')
