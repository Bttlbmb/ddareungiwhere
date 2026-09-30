export function decodePolyline(shape) {
  let i=0,lat=0,lng=0; const points=[];
  const read=()=>{let result=0,shift=0,byte;do{if(i>=shape.length||shift>30)throw new Error('Invalid walking geometry.');byte=shape.charCodeAt(i++)-63;result|=(byte&31)<<shift;shift+=5;}while(byte>=32);return result&1?~(result>>>1):result>>>1;};
  while(i<shape.length){lat+=read();lng+=read();points.push([lat/1e6,lng/1e6]);}
  return points;
}

export function routeEstimate(native, origin, destination, mode) {
  const summary=native?.trip?.summary;
  if(!summary||![summary.time,summary.length].every(v=>Number.isFinite(v)&&v>=0)) throw new Error('Invalid route estimate.');
  let seconds=summary.time,km=summary.length,access=0;
  if(mode==='pedestrian') {
    const legs=native.trip.legs;
    if(!legs?.length)throw new Error('Missing walking geometry.');
    const first=decodePolyline(legs[0].shape),last=decodePolyline(legs.at(-1).shape);
    if(!first.length||!last.length)throw new Error('Missing walking geometry.');
    for(const [point,snapped] of [[origin,first[0]],[destination,last.at(-1)]]) {
      const gap=111195*Math.hypot(point.lat-snapped[0],(point.lng-snapped[1])*Math.cos(point.lat*Math.PI/180));
      if(!Number.isFinite(gap)||gap>100)throw new Error('Walking endpoint too far from mapped path.');
      access+=gap;
    }
    seconds+=access/5100*3600;km+=access/1000;
  }
  return {provider:'Valhalla',minutes:seconds/60,distance_m:Math.round(km*1000),...(mode==='pedestrian'?{access_distance_m:Math.round(access)}:{})};
}

export class BrowserRoutes {
  constructor(config, base) {this.config=config;this.base=base;this.router=null;this.cache=new Map();this.samples=[];}
  async getRouter() {
    if(!this.router) {
      const {Router}=await import('../vendor/valhalla/index.js');
      this.router=new Router({manifestUrl:new URL(this.config.manifestUrl,this.base).href,transport:'individual-tiles',
        memoryBudgetBytes:96*1024*1024,wasmMemory:{initialMiB:64,maximumMiB:512},timeoutMs:15000,retries:1});
    }
    return this.router;
  }
  async estimate(origin,destination,mode,signal) {
    if(mode==='pedestrian'&&origin.lat===destination.lat&&origin.lng===destination.lng)return {provider:'Valhalla',minutes:0,distance_m:0};
    if(mode==='bicycle'&&origin.id===destination.id)return {provider:'Valhalla',error:'Choose different departure and return stations.'};
    const key=JSON.stringify([mode,origin.lat,origin.lng,destination.lat,destination.lng]);
    if(this.cache.has(key)) {const value=this.cache.get(key);this.cache.delete(key);this.cache.set(key,value);return {...value};}
    try {
      signal?.throwIfAborted();
      const router=await this.getRouter();
      const result=await router.route({locations:[{lat:origin.lat,lon:origin.lng},{lat:destination.lat,lon:destination.lng}],costing:mode,
        costing_options:mode==='bicycle'?{bicycle:{bicycle_type:'hybrid',cycling_speed:15}}:{pedestrian:{walking_speed:5.1}}},{signal});
      const estimate=routeEstimate(result.native,origin,destination,mode);
      this.cache.set(key,estimate);if(this.cache.size>2048)this.cache.delete(this.cache.keys().next().value);
      this.samples.push({mode,diagnostics:result.diagnostics});if(this.samples.length>100)this.samples.shift();
      return {...estimate};
    } catch(error) {
      if(signal?.aborted)throw error;
      this.lastError={code:error.code||'ROUTE',message:error.message};
      return {provider:'Valhalla',error:mode==='pedestrian'?'Walking estimate unavailable.':'Cycling estimate unavailable.'};
    }
  }
}
