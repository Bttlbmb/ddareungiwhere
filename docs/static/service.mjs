import {StaticPlanner} from './planner.mjs';
import {StreetLabels} from './streets.mjs';
import {BrowserRoutes} from './routes.mjs';

export async function fetchJSON(url,signal) {
  const response=await fetch(url,{signal});
  if(!response.ok){const error=new Error('Data could not be loaded. Please try again.');error.status=response.status;throw error;}
  return response.json();
}

export class StaticService {
  constructor(base,config) {
    this.base=base;this.config=config;this.loaded=null;this.stations=[];
    this.live={refreshing:false,error:null,fetched_at:null};this.pendingLive=null;
    this.streets=new StreetLabels(base,fetchJSON);this.routes=new BrowserRoutes(config,base);
  }
  async load(signal) {
    if(!this.loaded) this.loaded=Promise.all(['stations','history','popular_routes'].map(name=>fetchJSON(new URL(`data/${name}.json`,this.base),signal)))
      .then(([stations,history,popular])=>{this.stations=stations.map(s=>({...s,bikes:null,fetched_at:null}));this.history=history;this.popular=popular;
        this.planner=new StaticPlanner(this.stations,history);}).catch(error=>{this.loaded=null;throw error;});
    return this.loaded;
  }
  refresh() {
    if(this.pendingLive)return;
    if(!this.config.liveUrl){this.live={...this.live,refreshing:false,error:'Live bike counts have not been connected.'};return;}
    this.live={...this.live,refreshing:true,error:null};
    this.pendingLive=fetchJSON(this.config.liveUrl,AbortSignal.timeout(25000)).then(response=>{
      const byId=new Map((response.stations||[]).map(s=>[s.id,s]));
      for(const station of this.stations){const value=byId.get(station.id);station.bikes=Number.isInteger(value?.bikes)&&value.bikes>=0?value.bikes:null;station.fetched_at=value?.fetched_at||null;}
      for(const value of byId.values()) {
        if(!Number.isInteger(value.id)||!Number.isFinite(value.lat)||!Number.isFinite(value.lng))continue;
        const existing=this.stations.find(s=>s.id===value.id);
        if(existing)for(const key of ['number','name','lat','lng'])existing[key]=value[key];
        else this.stations.push({...value});
      }
      this.live={...response.live,refreshing:false};
    }).catch(()=>{this.live={...this.live,refreshing:false,error:'Live bike counts are unavailable. Try refreshing shortly.'};})
      .finally(()=>{this.pendingLive=null;});
  }
  snapshot(){return {stations:this.stations.map(s=>({...s})),live:{...this.live}};}
  async request(path,{signal}={}) {
    await this.load(signal);signal?.throwIfAborted();
    const url=new URL(path,'https://local.invalid');
    if(url.pathname==='/api/bootstrap')return {...this.snapshot(),history:this.history,popular_routes:this.popular,now:new Date().toISOString()};
    if(url.pathname==='/api/place-label')return this.streets.lookup(Number(url.searchParams.get('lat')),Number(url.searchParams.get('lng')),signal);
    if(url.pathname==='/api/live'){if(url.searchParams.get('refresh')!=='0')this.refresh();return this.snapshot();}
    if(url.pathname==='/api/plan') {
      const plan=this.planner.plan(url.searchParams,{...this.live}); // Validate before provider work.
      this.refresh();
      for(const station of plan.departures) {
        signal?.throwIfAborted();
        station.cycling_route=await this.routes.estimate(station,plan.return_station,'bicycle',signal);
        station.walking_route=await this.routes.estimate(plan.origin,station,'pedestrian',signal);
      }
      // A live fetch may have finished while routing; keep original timestamps.
      for(const station of plan.departures){const fresh=this.stations.find(s=>s.id===station.id);station.bikes=fresh.bikes;station.fetched_at=fresh.fetched_at;}
      plan.suggested_id=plan.immediate ? plan.departures.find(s=>{
        const age=Date.now()-Date.parse(s.fetched_at);
        return s.bikes>0&&age>=-60000&&age<=120000&&s.id!==plan.return_station.id;
      })?.id??null : null;
      plan.live={...this.live};return plan;
    }
    throw new Error('Unknown operation.');
  }
}
