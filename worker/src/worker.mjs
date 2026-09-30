// Narrow live-count proxy. No user coordinates, caller-supplied URLs or keys.
import {normalized,fetchWebsiteInventory} from '../../web/static/live.mjs';
export {normalized,fetchWebsiteInventory};

export function providerBase(value='https://openapi.seoul.go.kr:8088') {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.hostname!=='openapi.seoul.go.kr'||url.username||url.password||url.search||url.hash||url.pathname!=='/')
    throw new Error('Secure provider configuration is required.');
  return url.origin;
}

export async function fetchInventory(env,fetcher=fetch,consume=async()=>{}) {
  if(env.LIVE_SOURCE==='seoul-website')return fetchWebsiteInventory(fetcher,consume);
  if(env.LIVE_SOURCE&&env.LIVE_SOURCE!=='seoul-openapi')throw new Error('Unknown live source.');
  const key=env.SEOUL_OPEN_DATA_API_KEY;
  if(typeof key!=='string'||!(/^[a-zA-Z0-9]+$/).test(key))throw new Error('Live bike counts are not configured.');
  const base=providerBase(env.SEOUL_API_BASE);
  const stations=new Map();let complete=false;
  for(let start=1;start<=10001;start+=1000) {
    await consume();
    let payload;
    try {
      const response=await fetcher(`${base}/${key}/json/bikeList/${start}/${start+999}/`,{redirect:'error',signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error('Provider failed.');
      payload=await response.json();
    } catch {throw new Error('Live bike counts are unavailable. Try refreshing shortly.');}
    const block=payload.rentBikeStatus||{},code=payload.CODE||block.RESULT?.CODE;
    if(code==='INFO-200'){complete=true;break;}
    if(code!=='INFO-000'||!Array.isArray(block.row)||!block.row.length)throw new Error('The bike service returned an incomplete station list.');
    const stamp=new Date().toISOString();
    for(const row of block.row) {
      const station=normalized(row,stamp);
      if(!station)continue;
      if(stations.has(station.id))throw new Error('The bike service returned overlapping station pages.');
      stations.set(station.id,station);
    }
  }
  if(!complete||!stations.size)throw new Error('The bike service returned an incomplete station list.');
  return {stations:[...stations.values()],live:{refreshing:false,error:null,fetched_at:new Date().toISOString()}};
}

// All refresh misses converge here. Ordinary responses may be edge-cached.
export class SeoulInventory {
  constructor(state,env){this.state=state;this.env=env;this.pending=null;}
  async consume() {
    const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
    const saved=await this.state.storage.get('budget');
    const budget=saved?.day===day?saved:{day,used:0};
    const limit=Number(this.env.UPSTREAM_DAILY_BUDGET||1000);
    if(!Number.isInteger(limit)||limit<1||budget.used>=limit)throw new Error('Live request budget reached. Try again later.');
    budget.used++;await this.state.storage.put('budget',budget);
  }
  async refresh() {
    await this.state.storage.put('lastAttempt',Date.now());
    try {
      const snapshot=await fetchInventory(this.env,fetch,()=>this.consume());
      await this.state.storage.put('snapshot',snapshot);return snapshot;
    } catch(error) {
      // Never serialize/log a fetch exception: its URL could contain the key.
      const old=await this.state.storage.get('snapshot');
      const result={stations:old?.stations||[],live:{refreshing:false,error:'Live bike counts are unavailable. Try refreshing shortly.',fetched_at:old?.live?.fetched_at||null}};
      if(this.env.LIVE_SOURCE==='seoul-website') {
        result.live.source='seoul-website';
        // Fixed diagnostic labels only; never upstream exception text/URLs.
        const codes=['website-http-error','website-response-format','website-transport','website-incomplete','website-invalid'];
        result.live.failure=codes.includes(error?.code)?error.code:'refresh-unavailable';
      }
      await this.state.storage.put('snapshot',result);return result;
    }
  }
  async fetch() {
    if(this.pending)return Response.json(await this.pending);
    let snapshot;
    // Admission is serialized; overlapping requests share one refresh promise.
    await this.state.blockConcurrencyWhile(async()=>{
      if(this.pending)return;
      const last=await this.state.storage.get('lastAttempt');
      if(this.pending)return;
      if(last&&Date.now()-last<60000)snapshot=await this.state.storage.get('snapshot');
      else this.pending=this.refresh();
    });
    if(this.pending){const pending=this.pending;try{snapshot=await pending;}finally{if(this.pending===pending)this.pending=null;}}
    return Response.json(snapshot||{stations:[],live:{refreshing:false,error:'Live bike counts are unavailable.',fetched_at:null}});
  }
}

export function allowedOrigin(request,env) {
  const origin=request.headers.get('Origin');
  const allowed=String(env.ALLOWED_ORIGIN||'https://bttlbmb.github.io').split(',').map(x=>x.trim());
  return origin&&allowed.includes(origin)?origin:null;
}

export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url),origin=allowedOrigin(request,env);
    if(url.pathname!=='/api/live'||url.search)return new Response('Not found',{status:404});
    if(request.headers.has('Origin')&&!origin)return new Response('Origin not allowed',{status:403});
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
    if(origin)headers['Access-Control-Allow-Origin']=origin;
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET','Access-Control-Max-Age':'600'}});
    if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers});
    const cacheKey=new Request(`${url.origin}/_live-snapshot`);
    let response=await caches.default.match(cacheKey);
    if(!response) {
      try {
        const id=env.INVENTORY.idFromName('seoul-citywide');
        response=await env.INVENTORY.get(id).fetch('https://inventory.internal/snapshot');
        // Timestamp lives in JSON and survives every layer of caching.
        response=new Response(response.body,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=15'}});
        ctx.waitUntil(caches.default.put(cacheKey,response.clone()));
      } catch {
        response=Response.json({stations:[],live:{refreshing:false,error:'Live bike counts are unavailable.',fetched_at:null}});
      }
    }
    return new Response(response.body,{status:response.status,headers});
  }
};
