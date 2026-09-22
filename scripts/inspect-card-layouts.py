from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
files = sorted((root / 'cards-clean-layout-31').glob('*.webp'))
out = root / 'output' / 'card-template'
out.mkdir(parents=True, exist_ok=True)
sheet = Image.new('RGB', (6 * 220, 6 * 352), '#dddddd')
draw = ImageDraw.Draw(sheet)
for i, file in enumerate(files):
    im = Image.open(file)
    print(file.name, im.size)
    im.thumbnail((212, 318))
    x, y = (i % 6) * 220, (i // 6) * 352
    sheet.paste(im, (x + 4, y + 24))
    draw.text((x + 6, y + 5), file.stem, fill='black')
sheet.save(out / 'original-contact.jpg')
