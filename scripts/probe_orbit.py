from pathlib import Path
import spiceypy as spice
root = Path(__file__).resolve().parents[1]
spice.furnsh(str(root/'kernels'/'naif0012.tls'))
path=root/'kernels'/'vo1_rcon.bsp'
for obj in spice.spkobj(str(path)):
    print('object',obj)
    if obj<0:
        w=spice.spkcov(str(path),obj)
        for i in range(spice.wncard(w)):
            a,b=spice.wnfetd(w,i)
            print(spice.et2utc(a,'ISOC',0),spice.et2utc(b,'ISOC',0))
        spice.furnsh(str(path))
        et=spice.utc2et('1976-07-01T00:00:00')
        try: print('state',spice.spkpos(str(obj),et,'J2000','NONE','499'))
        except Exception as error: print('state error',str(error)[:500])
        handle,descr,ident=spice.spksfs(obj,et,100)
        print('segment',ident,spice.dafus(descr,2,6))
        print('frame',spice.frmnam(14))
        try: print('relative to 4',spice.spkpos(str(obj),et,'J2000','NONE','4'))
        except Exception as error: print('relative to 4 error',str(error)[:500])
