import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StaticPlanner,pickupTime} from '../web/static/planner.mjs';
import {routeEstimate} from '../web/static/routes.mjs';
import {StaticService} from '../web/static/service.mjs';
import {fetchInventory,providerBase,normalized,SeoulInventory} from '../worker/src/worker.mjs';

const now=Date.parse('2026-10-01T00:00:00Z');
const stations=Array.from({length:7},(_,i)=>({id:i+1,number:String(i+1),name:`Station ${i+1}`,lat:37.55+i*.001,lng:126.97,bikes:null,fetched_at:null}));
const history={stations:stations.map(s=>s.number),counts:stations.flatMap(()=>Array.from({length:48},(_,i)=>[30,i===33?6:0]))};
const query=()=>new URLSearchParams({origin_lat:'37.55',origin_lng:'126.97',destination_lat:'37.556',destination_lng:'126.97',pickup:'2026-10-01T09:30',count:'5'});

test('Seoul pickup interpretation and limits are independent of device timezone',()=>{
  assert.deepEqual(pickupTime('2026-10-01T09:30',now),{stamp:now+1800000,hour:9,weekday:true});
  assert.throws(()=>pickupTime('2026-10-09T09:00',now));
  assert.throws(()=>pickupTime('broken',now));
});
test('five departures share one return; missing archive is distinct from zero; destination leaves history unchanged',()=>{
  const planner=new StaticPlanner(stations,history),q=query(),a=planner.plan(q,{},now);
  assert.equal(a.departures.length,5);assert.equal(a.return_station.id,7);
  assert.deepEqual(a.departures[0].availability,{observations:30,zero:6});
  q.set('destination_lat','37.55');const b=planner.plan(q,{},now);
  assert.deepEqual(a.departures.map(s=>s.availability),b.departures.map(s=>s.availability));
  q.set('departure','7');assert.equal(planner.plan(q,{},now).departures.length,5);
  const missing=new StaticPlanner(stations,{stations:[],counts:[]}).plan(query(),{},now);
  assert.deepEqual(missing.departures[0].availability,{observations:0,zero:0});
});
test('bootstrap does not fetch live data; refresh does not reroute or requery history',async()=>{
  const service=new StaticService(new URL('http://localhost/'),{liveUrl:'https://example.test/api/live'});
  service.loaded=Promise.resolve();service.stations=stations;service.history=history;service.popular=[];
  service.planner={plan(){throw new Error('Unexpected plan');}};service.routes={estimate(){throw new Error('Unexpected routing');}};
  let refreshes=0;service.refresh=()=>refreshes++;
  await service.request('/api/bootstrap');assert.equal(refreshes,0);
  await service.request('/api/live');assert.equal(refreshes,1);
  await service.request('/api/live?refresh=0');assert.equal(refreshes,1);
});
test('walking access adjustment preserves zero, rejects long snapping gaps and retains detours',()=>{
  const a={lat:37.55,lng:126.97},b={lat:37.56,lng:126.98};
  const native={trip:{summary:{time:4200,length:8},legs:[{shape:'_zzrfA_hsdqF_pR_pR'}]}};
  assert.equal(routeEstimate(native,a,b,'pedestrian').minutes,70);
  assert.ok(routeEstimate(native,{...a,lat:a.lat+.0001},b,'pedestrian').minutes>70);
  assert.throws(()=>routeEstimate(native,{...a,lat:a.lat+.01},b,'pedestrian'));
});
const row=(id=1,bikes='0')=>({stationId:`ST-${id}`,stationName:`${id}. Example`,stationLatitude:'37.55',stationLongitude:'126.97',parkingBikeTotCnt:bikes});
test('proxy refuses insecure/foreign provider URLs and keeps malformed inventory unknown',()=>{
  assert.throws(()=>providerBase('http://openapi.seoul.go.kr:8088'));
  assert.throws(()=>providerBase('https://attacker.example'));
  assert.equal(normalized(row(),'stamp').bikes,0);
  assert.equal(normalized(row(1,''),'stamp').bikes,null);
  assert.equal(normalized(row(1,null),'stamp').bikes,null);
});
test('proxy validates complete pagination and never returns credential-bearing upstream exceptions',async()=>{
  const env={SEOUL_OPEN_DATA_API_KEY:'PrivateTestKey'};let calls=0;
  const data=await fetchInventory(env,async()=>Response.json(++calls===1?{rentBikeStatus:{RESULT:{CODE:'INFO-000'},row:[row()]}}:{CODE:'INFO-200'}));
  assert.equal(data.stations[0].bikes,0);assert.equal(calls,2);
  await assert.rejects(fetchInventory(env,async()=>{throw new Error('https://provider/PrivateTestKey');}),error=>!error.message.includes('PrivateTestKey'));
  await assert.rejects(fetchInventory(env,async()=>Response.json({rentBikeStatus:{RESULT:{CODE:'INFO-000'},row:[row()]}})),/overlapping/);
});
test('one coordinator shares concurrent refreshes and throttles subsequent misses',async()=>{
  const values=new Map();const state={storage:{get:async k=>values.get(k),put:async(k,v)=>values.set(k,v)},blockConcurrencyWhile:async fn=>fn()};
  const coordinator=new SeoulInventory(state,{});let calls=0,resolve;
  coordinator.refresh=()=>{calls++;values.set('lastAttempt',Date.now());return new Promise(r=>{resolve=value=>{values.set('snapshot',value);r(value);};});};
  const first=coordinator.fetch(),second=coordinator.fetch();
  await Promise.resolve();await Promise.resolve();
  resolve({stations:[],live:{fetched_at:'original',refreshing:false}});
  await Promise.all([first,second]);assert.equal(calls,1);
  const cached=await (await coordinator.fetch()).json();assert.equal(calls,1);assert.equal(cached.live.fetched_at,'original');
});

const websitePayload=()=>({checkResult:true,stationVO:{stationGrpSeq:'ALL'},realtimeList:
  Array.from({length:2500},(_,i)=>({...row(i+1),parkingQRBikeCnt:'15',parkingELECBikeCnt:'5'}))});
test('official HTTPS website source sums bike categories without reading or sending a key',async()=>{
  const env={LIVE_SOURCE:'seoul-website',get SEOUL_OPEN_DATA_API_KEY(){throw new Error('Key must not be read');}};
  let consumed=0;
  const result=await fetchInventory(env,async(url,options)=>{
    assert.equal(url,'https://www.bikeseoul.com/app/station/getStationRealtimeStatus.do');
    assert.equal(options.method,'POST');assert.equal(options.body,'stationGrpSeq=ALL');assert.equal(options.redirect,'error');
    const data=websitePayload();data.realtimeList[1].parkingQRBikeCnt='';
    data.realtimeList[2].parkingQRBikeCnt='0';data.realtimeList[2].parkingELECBikeCnt='0';
    return Response.json(data);
  },async()=>{consumed++;});
  assert.equal(consumed,1);assert.equal(result.stations.length,2500);
  assert.equal(result.stations[0].bikes,20);assert.equal(result.stations[1].bikes,null);assert.equal(result.stations[2].bikes,0);
  assert.ok(result.stations.every(s=>s.fetched_at===result.live.fetched_at));
});
test('website source rejects partial, duplicated, invalid and failed citywide responses',async()=>{
  for(const mutate of [p=>p.realtimeList.pop(),p=>p.checkResult=false,p=>p.stationVO.stationGrpSeq='01',
    p=>p.realtimeList[1]=p.realtimeList[0],p=>p.realtimeList[0].stationLatitude='0']) {
    const payload=websitePayload();mutate(payload);
    await assert.rejects(fetchInventory({LIVE_SOURCE:'seoul-website'},async()=>Response.json(payload)),/station list/);
  }
  await assert.rejects(fetchInventory({LIVE_SOURCE:'seoul-website'},async()=>new Response('Blocked',{status:403})),/unavailable/);
});

test('failed website refresh retains old counts and timestamps, exposing only a fixed failure label',async()=>{
  const old={stations:[{id:1,bikes:3,fetched_at:'original'}],live:{fetched_at:'original'}};
  const values=new Map([['snapshot',old]]),state={storage:{get:async k=>values.get(k),put:async(k,v)=>values.set(k,v)},blockConcurrencyWhile:async fn=>fn()};
  const originalFetch=globalThis.fetch;
  try {
    globalThis.fetch=async()=>new Response('Blocked',{status:403});
    const result=await (await new SeoulInventory(state,{LIVE_SOURCE:'seoul-website'}).fetch()).json();
    assert.deepEqual(result.stations,old.stations);assert.equal(result.live.fetched_at,'original');
    assert.equal(result.live.failure,'website-http-error');assert.equal(result.live.source,'seoul-website');
  } finally {globalThis.fetch=originalFetch;}
});
