import http from 'node:http';
import {readFile, mkdir, writeFile, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8765);
const cacheRoot = path.join(root, 'cache');
const tileLayers = {
  moon:{id:'LRO_WAC_Mosaic_Global_303ppd_v02',ext:'jpg',mime:'image/jpeg',maxZoom:8,body:'Moon'},
  mola:{id:'Mars_MGS_MOLA_ClrShade_merge_global_463m',ext:'jpg',mime:'image/jpeg',maxZoom:7},
  viking:{id:'Mars_Viking_MDIM21_ClrMosaic_global_232m',ext:'jpg',mime:'image/jpeg',maxZoom:7},
  meridiani:{id:'S_Meridiani_Sinus_Planium_CTX_BlockAdj_dd',ext:'png',mime:'image/png',maxZoom:12}
};
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4'};

function send(res, status, body, contentType='text/plain; charset=utf-8', extra={}) {
  res.writeHead(status,{'Content-Type':contentType,'Cache-Control':'no-cache',...extra});res.end(body);
}
async function tile(req,res,url) {
  const match = /^\/api\/tiles\/(moon|mola|viking|meridiani)\/(\d{1,2})\/(\d{1,4})\/(\d{1,4})\.(jpg|png)$/.exec(url.pathname);
  if(!match)return send(res,404,'Unknown tile');
  const layer=match[1];
  const conf=tileLayers[layer];
  if(match[5]!==conf.ext)return send(res,404,'Unknown format');
  const [z,x,y]=match.slice(2).map(Number);
  if(z>conf.maxZoom||x>=2**(z+1)||y>=2**z)return send(res,404,'Tile outside Mars grid');
  const cachePath=path.join(cacheRoot,layer,String(z),String(x),`${y}.${conf.ext}`);
  try{const data=await readFile(cachePath);return send(res,200,data,conf.mime,{'Cache-Control':'public, max-age=31536000, immutable'})}catch{}
  const remote=`https://trek.nasa.gov/tiles/${conf.body||'Mars'}/EQ/${conf.id}/1.0.0/default/default028mm/${z}/${y}/${x}.${conf.ext}`;
  try{
    const upstream=await fetch(remote,{signal:AbortSignal.timeout(15000)});
    if(!upstream.ok)return send(res,upstream.status,'NASA tile unavailable');
    const data=Buffer.from(await upstream.arrayBuffer());
    if(!upstream.headers.get('content-type')?.includes('image')||data.length>2_000_000)return send(res,502,'Unexpected NASA tile response');
    await mkdir(path.dirname(cachePath),{recursive:true});await writeFile(cachePath,data);
    return send(res,200,data,conf.mime,{'Cache-Control':'public, max-age=31536000, immutable'});
  }catch(error){console.error('Tile fetch:',error.message);return send(res,502,'NASA tile service temporarily unavailable')}
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,'Method not allowed');
  if(url.pathname.startsWith('/api/tiles/'))return tile(req,res,url);
  if(url.pathname==='/api/health')return send(res,200,JSON.stringify({ok:true,service:'mars-story-atlas',storage:root}),'application/json; charset=utf-8',{'Cache-Control':'no-store'});
  const file=url.pathname==='/api/missions'?path.join(root,'data','missions.json'):path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html'))return send(res,403,'Forbidden');
  if(file.includes(`${path.sep}cache${path.sep}`)||file.includes(`${path.sep}kernels${path.sep}`)||file.endsWith('server.mjs')||file.includes(`${path.sep}scripts${path.sep}`))return send(res,403,'Forbidden');
  if(file.includes(`${path.sep}ride${path.sep}`)&&!['opportunity-photo-ride.mp4','manifest.json'].includes(path.basename(file)))return send(res,403,'Forbidden');
  try{
    const s=await stat(file);if(!s.isFile())throw new Error('Not a file');
    if(path.extname(file)==='.mp4'){
      const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
      const start=match?Number(match[1]):0;
      const end=match&&match[2]?Math.min(Number(match[2]),s.size-1):s.size-1;
      if(start>=s.size||end<start){res.writeHead(416,{'Content-Range':`bytes */${s.size}`});return res.end()}
      res.writeHead(match?206:200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,...(match?{'Content-Range':`bytes ${start}-${end}/${s.size}`}:{})});
      if(req.method==='HEAD')return res.end();
      return createReadStream(file,{start,end}).pipe(res);
    }
    const body=await readFile(file);send(res,200,req.method==='HEAD'?'':body,mime[path.extname(file)]||'application/octet-stream');
  }
  catch{send(res,404,'Not found')}
});
server.listen(port,'0.0.0.0',()=>console.log(`Mars Story Atlas listening on http://0.0.0.0:${port} from ${root}`));
