import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StaticPlanner,pickupTime,distance} from '../web/static/planner.mjs';
import {BrowserRoutes,routeEstimate} from '../web/static/routes.mjs';
import {StaticService} from '../web/static/service.mjs';
import {fetchWebsiteInventory,normalized} from '../web/static/live.mjs';
import {loadHistory} from '../web/static/data.mjs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

const now=Date.parse('2026-10-01T00:00:00Z');
const stations=Array.from({length:7},(_,i)=>({id:i+1,number:String(i+1),name:`Station ${i+1}`,lat:37.55+i*.001,lng:126.97,bikes:null,fetched_at:null}));
const history={stations:stations.map(s=>s.number),counts:Uint16Array.from(stations.flatMap(()=>Array.from({length:48},(_,i)=>[30,i===33?6:0]).flat()))};
const query=()=>new URLSearchParams({origin_lat:'37.55',origin_lng:'126.97',destination_lat:'37.556',destination_lng:'126.97',pickup:'2026-10-01T09:30',count:'5'});

test('Seoul pickup interpretation and limits are independent of device timezone',()=>{
  assert.deepEqual(pickupTime('2026-10-01T09:30',now),{stamp:now+1800000,hour:9,weekday:true});
  assert.throws(()=>pickupTime('2026-10-09T09:00',now));
  assert.throws(()=>pickupTime('broken',now));
});
test('five departures share one return; missing archive is distinct from zero; destination leaves history unchanged',()=>{
  const planner=new StaticPlanner(stations,history),q=query(),a=planner.plan(q,{},now);
  assert.equal(a.departures.length,5);assert.equal(a.return_station.id,7);
  assert.deepEqual(a.destination,{lat:37.556,lng:126.97});
  assert.deepEqual(a.departures[0].availability,{observations:30,zero:6});
  q.set('destination_lat','37.55');const b=planner.plan(q,{},now);
  assert.deepEqual(a.departures.map(s=>s.availability),b.departures.map(s=>s.availability));
  q.set('departure','7');assert.equal(planner.plan(q,{},now).departures.length,5);
  const missing=new StaticPlanner(stations,{stations:[],counts:[]}).plan(query(),{},now);
  assert.deepEqual(missing.departures[0].availability,{observations:0,zero:0});
});
test('bootstrap does not fetch live data; refresh does not reroute or requery history',async()=>{
  const service=new StaticService(new URL('http://localhost/'),{});
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
test('missing quantities remain unknown while a fresh zero remains zero',()=>{
  assert.equal(normalized(row(),'stamp').bikes,0);
  assert.equal(normalized(row(1,''),'stamp').bikes,null);
  assert.equal(normalized(row(1,null),'stamp').bikes,null);
});

const websitePayload=()=>({checkResult:true,stationVO:{stationGrpSeq:'ALL'},realtimeList:
  Array.from({length:2500},(_,i)=>({...row(i+1),parkingQRBikeCnt:'15',parkingELECBikeCnt:'5'}))});
test('official HTTPS website source sums bike categories without reading or sending a key',async()=>{
  const result=await fetchWebsiteInventory(async(url,options)=>{
    assert.equal(url,'https://www.bikeseoul.com/app/station/getStationRealtimeStatus.do');
    assert.equal(options.method,'POST');assert.equal(options.body,'stationGrpSeq=ALL');assert.equal(options.redirect,'error');
    assert.equal(options.mode,'cors');assert.equal(options.credentials,'omit');
    const data=websitePayload();data.realtimeList[1].parkingQRBikeCnt='';
    data.realtimeList[2].parkingQRBikeCnt='0';data.realtimeList[2].parkingELECBikeCnt='0';
    return Response.json(data);
  });
  assert.equal(result.stations.length,2500);
  assert.equal(result.stations[0].bikes,20);assert.equal(result.stations[1].bikes,null);assert.equal(result.stations[2].bikes,0);
  assert.ok(result.stations.every(s=>s.fetched_at===result.live.fetched_at));
});
test('website source rejects partial, duplicated, invalid and failed citywide responses',async()=>{
  for(const mutate of [p=>p.realtimeList.pop(),p=>p.checkResult=false,p=>p.stationVO.stationGrpSeq='01',
    p=>p.realtimeList[1]=p.realtimeList[0],p=>p.realtimeList[0].stationLatitude='0']) {
    const payload=websitePayload();mutate(payload);
    await assert.rejects(fetchWebsiteInventory(async()=>Response.json(payload)),/station list/);
  }
  await assert.rejects(fetchWebsiteInventory(async()=>new Response('Blocked',{status:403})),/unavailable/);
});

test('direct browser source fetches only on request, shares refreshes and keeps old timestamps on failure',async()=>{
  const service=new StaticService(new URL('https://bttlbmb.github.io/ddareungiwhere/'),{liveSource:'seoul-website'});
  service.loaded=Promise.resolve();service.stations=stations.map(s=>({...s}));service.history=history;service.popular=[];
  service.routes={estimate(){throw new Error('Refresh must not reroute');}};
  const originalFetch=globalThis.fetch,originalNow=Date.now;let clock=now,calls=0;
  try {
    Date.now=()=>clock;
    globalThis.fetch=async()=>{calls++;if(calls>1)throw new Error('Failed');return Response.json(websitePayload());};
    await service.request('/api/bootstrap');assert.equal(calls,0);
    const first=service.refresh(),second=service.refresh();assert.equal(first,second);await first;
    assert.equal(calls,1);assert.equal(service.stations[0].bikes,20);assert.equal(service.stations.length,2500);
    const stamp=service.stations[0].fetched_at;
    await service.refresh();assert.equal(calls,1);
    clock+=61000;await service.refresh();assert.equal(calls,2);
    assert.equal(service.stations[0].bikes,20);assert.equal(service.stations[0].fetched_at,stamp);
    assert.match(service.live.error,/unavailable/);assert.equal(service.live.refreshing,false);
  } finally {globalThis.fetch=originalFetch;Date.now=originalNow;}
});

// Decodes the actual wire representation and verifies integrity, not a mock index.
test('packed history preserves exact counts and rejects incomplete or corrupted data',async()=>{
  const bytes=Buffer.alloc(48*4);bytes.writeUInt16LE(127,8*4);bytes.writeUInt16LE(3,8*4+2);
  const metadata={schema:2,stations:['10'],counts_url:'counts.bin.gz',counts_sha256:createHash('sha256').update(bytes).digest('hex')};
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async()=>new Response(gzipSync(bytes));
    const data=await loadHistory(new URL('https://example.test/'),undefined,metadata);
    assert.ok(data.counts instanceof Uint16Array);assert.equal(data.counts[16],127);assert.equal(data.counts[17],3);
    assert.equal(data.counts[0],0);
    await assert.rejects(loadHistory(new URL('https://example.test/'),undefined,{...metadata,stations:[]}),/incomplete/);
    await assert.rejects(loadHistory(new URL('https://example.test/'),undefined,{...metadata,counts_sha256:'bad'}),/did not match/);
  } finally {globalThis.fetch=original;}
});

test('bounded shortlist matches full sorting and preserves catalogue data and tie order',()=>{
  const catalogue=Array.from({length:300},(_,i)=>({...stations[0],id:i+1,number:String(i+1),lat:37.55+(i%31)*.0001,lng:126.97+(i%7)*.0001}));
  const before=JSON.stringify(catalogue);
  const planner=new StaticPlanner(catalogue,{stations:[],counts:new Uint16Array()});
  const q=query();q.delete('pickup');
  const actual=planner.plan(q,{});
  const {origin}=actual;
  const expected=catalogue.slice().sort((a,b)=>distance(origin,a)-distance(origin,b)).slice(0,5).map(s=>s.id);
  assert.deepEqual(actual.departures.map(s=>s.id),expected);assert.equal(JSON.stringify(catalogue),before);
});

test('bootstrap versions compressed seed data and leaves history cells lazy',async()=>{
  const original=globalThis.fetch,calls=[];
  const metadata={schema:2,stations:['1'],counts_url:'counts.bin.gz',counts_sha256:'unused'};
  globalThis.fetch=async url=>{
    calls.push(String(url));
    const name=new URL(url).pathname.split('/').at(-1);
    if(name==='stations.json.gz')return new Response(gzipSync(JSON.stringify(stations)));
    if(name==='history.json')return Response.json(metadata);
    if(name==='popular_routes.json')return Response.json([]);
    throw new Error('Bootstrap requested unexpected data.');
  };
  try {
    const service=new StaticService(new URL('https://example.test/app/?v=revision'),{});
    const result=await service.request('/api/bootstrap');
    assert.equal(result.stations.length,stations.length);
    assert.equal(calls.length,3);
    assert.ok(calls.every(url=>new URL(url).search==='?v=revision'));
    assert.equal(service.historyReady,null);
    assert.equal(service.routes.routerPromise,null);
    assert.ok(result.stations.every(station=>station.bikes===null));
  } finally {globalThis.fetch=original;}
});

test('comparison calculates one forward return-to-destination walk and retains independent route failures',async()=>{
  const service=new StaticService(new URL('http://localhost/'),{}),calls=[];
  service.stations=stations;service.planner=new StaticPlanner(stations,history);
  service.refresh=()=>{};
  service.routes={estimate:async(origin,destination,mode,signal,options)=>{
    calls.push({origin,destination,mode,options});
    return mode==='bicycle' ? {error:'Cycling estimate unavailable.'} : {minutes:4.2};
  }};
  const q=query();q.delete('pickup');q.set('destination_lat','37.5563');
  const plan=await service.compare(q);
  assert.equal(calls.length,11);
  assert.equal(calls.filter(c=>c.mode==='bicycle').length,5);
  const last=calls.at(-1);
  assert.equal(last.origin,plan.return_station);assert.equal(last.destination,plan.destination);
  assert.equal(last.mode,'pedestrian');assert.deepEqual(last.options,{stationAtOrigin:true});
  assert.equal(plan.destination_walking_route.minutes,4.2);
  assert.ok(plan.departures.every(s=>s.cycling_route.error&&s.walking_route.minutes===4.2));
  const aborted=new AbortController();aborted.abort();
  await assert.rejects(service.compare(q,aborted.signal),{name:'AbortError'});
  assert.equal(calls.length,11);
});

test('walking endpoint roles reach the router and use separate cache entries',async()=>{
  const engine=new BrowserRoutes({},new URL('http://localhost/')),calls=[];
  const a={lat:37.55,lng:126.97},b={lat:37.56,lng:126.98};
  engine.getRouter=async()=>({route:async request=>{
    calls.push(request);
    return {native:{trip:{summary:{time:600,length:1},legs:[{shape:'_zzrfA_hsdqF_pR_pR'}]}}};
  }});
  await engine.estimate(a,b,'pedestrian');
  await engine.estimate(a,b,'pedestrian',undefined,{stationAtOrigin:true});
  await engine.estimate(a,b,'pedestrian',undefined,{stationAtOrigin:true});
  assert.equal(calls.length,2);
  assert.deepEqual(calls[0].locations.map(p=>p.station),[false,true]);
  assert.deepEqual(calls[1].locations.map(p=>p.station),[true,false]);
  assert.deepEqual(calls[1].locations.map(p=>[p.lat,p.lon]),[[a.lat,a.lng],[b.lat,b.lng]]);
  assert.equal((await engine.estimate(a,a,'pedestrian',undefined,{stationAtOrigin:true})).minutes,0);
});
