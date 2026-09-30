// Narrow live-count proxy. No user coordinates, caller-supplied URLs or keys.
export function normalized(row,stamp) {
  const id=Number(String(row.stationId||'').replace(/^ST-/,''));
  const match=String(row.stationName||'').match(/^(\d+)\.\s*(.*)$/);
  const lat=Number(row.stationLatitude),lng=Number(row.stationLongitude);
  if(!Number.isInteger(id)||id<=0||!match||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<33||lat>39||lng<124||lng>132)return null;
  const raw=row.parkingBikeTotCnt;
  const bikes=typeof raw==='number'?raw:typeof raw==='string'&&/^\d+$/.test(raw.trim())?Number(raw):null;
  return {id,number:String(Number(match[1])),name:match[2],lat,lng,bikes:Number.isInteger(bikes)&&bikes>=0?bikes:null,fetched_at:stamp};
}

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

// Official public station map: HTTPS, no account cookies or API credential.
function websiteFailure(code) {
  const error=new Error('Live bike counts are unavailable. Try refreshing shortly.');
  error.code=code;return error;
}
export async function fetchWebsiteInventory(fetcher=fetch,consume=async()=>{}) {
  await consume();
  let payload;
  try {
    const response=await fetcher('https://www.bikeseoul.com/app/station/getStationRealtimeStatus.do',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:'stationGrpSeq=ALL',redirect:'error',signal:AbortSignal.timeout(8000)
    });
    if(!response.ok)throw websiteFailure('website-http-error');
    try {payload=await response.json();}catch {throw websiteFailure('website-response-format');}
  } catch(error) {
    throw websiteFailure(['website-http-error','website-response-format'].includes(error?.code)?error.code:'website-transport');
  }
  // ALL is the website's citywide request. The size floor also detects obvious
  // partial responses; it is a dated coverage guard, not a provider guarantee.
  if(payload.checkResult!==true||payload.stationVO?.stationGrpSeq!=='ALL'||
     !Array.isArray(payload.realtimeList)||payload.realtimeList.length<2500||payload.realtimeList.length>10000)
    {const error=new Error('The bike service returned an incomplete station list.');error.code='website-incomplete';throw error;}
  const stamp=new Date().toISOString(),stations=new Map();
  for(const row of payload.realtimeList) {
    // Unlike bikeList's aggregate, the website has three separate categories.
    // Its all-bike map sums legacy, regular QR, and smaller 새싹 bikes.
    const counts=['parkingBikeTotCnt','parkingQRBikeCnt','parkingELECBikeCnt'].map(name=>{
      const value=row[name];
      const count=typeof value==='number'?value:typeof value==='string'&&/^\d+$/.test(value.trim())?Number(value):null;
      return Number.isSafeInteger(count)&&count>=0?count:null;
    });
    const bikes=counts.every(n=>n!==null)?counts.reduce((a,b)=>a+b,0):null;
    const station=normalized({...row,parkingBikeTotCnt:bikes},stamp);
    if(!station||stations.has(station.id)){const error=new Error('The bike service returned an invalid station list.');error.code='website-invalid';throw error;}
    stations.set(station.id,station);
  }
  return {stations:[...stations.values()],live:{refreshing:false,error:null,fetched_at:stamp,source:'seoul-website'}};
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
