from pathlib import Path
from PIL import Image, ImageFilter, ImageStat

root=Path(__file__).resolve().parents[1]
files=sorted((root/'ride'/'frames').glob('*.jpg'))
sheet=Image.new('RGB',(10*128,20*84),(10,12,18))
from PIL import ImageDraw
draw=ImageDraw.Draw(sheet)
for n,file in enumerate(files):
    with Image.open(file) as source:
        thumb=source.crop((0,0,720,720)).convert('RGB').resize((128,72))
    x=(n%10)*128;y=(n//10)*84
    sheet.paste(thumb,(x,y));draw.text((x+4,y+73),str(n+1),fill=(240,240,240))
sheet.save(root/'ride'/'contact-sheet.jpg',quality=80)
for file in sorted((root/'ride'/'frames').glob('*.jpg')):
    with Image.open(file) as source:
        image=source.crop((0,0,720,720)).convert('L').resize((128,128))
        detail=ImageStat.Stat(image.filter(ImageFilter.FIND_EDGES).crop((8,8,120,120))).mean[0]
        lower=ImageStat.Stat(image.crop((0,64,128,128))).stddev[0]
        if int(file.stem.split('_')[1]) in (1,2,14,46,48,49,50,51,63,78,102,112,145,148,150,178,185):
            values=sorted(image.getdata())
            print(file.name, 'detail', round(detail,1), 'median', values[len(values)//2], 'max', values[-1], 'lowerStd', round(lower,1))
