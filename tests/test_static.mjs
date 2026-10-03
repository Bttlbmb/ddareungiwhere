import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StaticPlanner,pickupTime,distance} from '../web/static/planner.mjs';
import {BrowserRoutes,routeEstimate} from '../web/static/routes.mjs';
import {StaticService} from '../web/static/service.mjs';
import {fetchWebsiteInventory,normalized} from '../web/static/live.mjs';
import {fetchJSON,loadHistory,timeoutSignal,throwIfAborted} from '../web/static/data.mjs';
import {StreetLabels} from '../web/static/streets.mjs';
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
  service.loaded=Promise.resolve();service.stations=stations;service.history=history;
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
  service.loaded=Promise.resolve();service.stations=stations.map(s=>({...s}));service.history=history;
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

test('request timeout and cancellation work without newer AbortSignal methods',async()=>{
  const original=AbortSignal.timeout;
  try {
    AbortSignal.timeout=undefined;
    const signal=timeoutSignal(1);
    assert.equal(signal.aborted,false);
    await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}));
    assert.equal(signal.aborted,true);
    assert.throws(()=>throwIfAborted(signal),{name:'TimeoutError'});
    const reason=new Error('User canceled');
    assert.throws(()=>throwIfAborted({aborted:true,reason}),error=>error===reason);
    assert.throws(()=>throwIfAborted({aborted:true}),{name:'AbortError'});
    assert.doesNotThrow(()=>throwIfAborted({aborted:false}));
  } finally {AbortSignal.timeout=original;}
});

test('older browsers get an actionable compressed-data error while plain responses stay readable',async()=>{
  const originalFetch=globalThis.fetch,originalDecompression=globalThis.DecompressionStream;
  try {
    globalThis.DecompressionStream=undefined;
    globalThis.fetch=async url=>String(url).endsWith('.gz')
      ? new Response(gzipSync('{"ready":true}')) : Response.json({ready:true});
    await assert.rejects(fetchJSON('https://example.test/stations.json.gz'),error=>
      error.code==='UNSUPPORTED_GZIP' && /update your browser/i.test(error.message));
    assert.deepEqual(await fetchJSON('https://example.test/config.json'),{ready:true});
  } finally {globalThis.fetch=originalFetch;globalThis.DecompressionStream=originalDecompression;}
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

test('bootstrap versions only station data and leaves history, live inventory and routes lazy',async()=>{
  const original=globalThis.fetch,calls=[];
  const metadata={schema:2,stations:['1'],counts_url:'counts.bin.gz',counts_sha256:'unused'};
  globalThis.fetch=async url=>{
    calls.push(String(url));
    const name=new URL(url).pathname.split('/').at(-1);
    if(name==='stations.json.gz')return new Response(gzipSync(JSON.stringify(stations)));
    if(name==='history.json')return Response.json(metadata);
    throw new Error('Bootstrap requested unexpected data.');
  };
  try {
    const service=new StaticService(new URL('https://example.test/app/?v=revision'),{});
    const result=await service.request('/api/bootstrap');
    assert.equal(result.stations.length,stations.length);
    assert.equal(calls.length,1);
    assert.ok(calls[0].includes('stations.json.gz'));
    assert.equal(result.history,null);
    assert.ok(calls.every(url=>new URL(url).search==='?v=revision'));
    assert.equal(service.historyReady,null);
    assert.equal(service.routes.routerPromise,null);
    assert.ok(result.stations.every(station=>station.bikes===null));
  } finally {globalThis.fetch=original;}
});

test('failed historical loading preserves usable station bootstrap and requires an explicit retry',async()=>{
  const original=globalThis.fetch,calls=[];
  const bytes=Buffer.alloc(stations.length*48*4);
  const metadata={schema:2,stations:stations.map(s=>s.number),counts_url:'counts.bin.gz',
    counts_sha256:createHash('sha256').update(bytes).digest('hex')};
  let historyAttempts=0,refreshes=0;
  globalThis.fetch=async url=>{
    const asset=new URL(url);calls.push(asset);
    if(asset.pathname.endsWith('stations.json.gz'))return new Response(gzipSync(JSON.stringify(stations)));
    if(asset.pathname.endsWith('history.json')){
      if(++historyAttempts===1)throw new Error('Historical connection failure');
      return Response.json(metadata);
    }
    if(asset.pathname.endsWith('counts.bin.gz'))return new Response(gzipSync(bytes));
    throw new Error('Unexpected asset requested.');
  };
  try {
    const service=new StaticService(new URL('https://example.test/app/?v=revision'),{});
    service.refresh=()=>refreshes++;
    const first=await service.request('/api/bootstrap');
    assert.equal(first.stations.length,stations.length);assert.equal(calls.length,1);
    const q=query();q.delete('pickup');
    await assert.rejects(service.request(`/api/plan?${q}`),/Historical connection failure/);
    assert.equal(service.historyReady,null);assert.equal(refreshes,0);
    assert.equal(service.routes.routerPromise,null);
    const recovered=await service.request('/api/bootstrap');
    assert.deepEqual(recovered.stations,first.stations);assert.equal(calls.length,2);
    assert.equal(historyAttempts,1);assert.equal(recovered.history,null);
    await service.loadPlanner();
    assert.equal(historyAttempts,2);assert.ok(service.planner);
    assert.equal(refreshes,0);assert.equal(service.routes.routerPromise,null);
    assert.ok(calls.filter(url=>url.pathname.endsWith('history.json')).every(url=>url.search==='?v=revision'));
    assert.equal(calls.at(-1).search,'');
    assert.equal(service.planner.plan(q,{},now).departures.length,5);
    await service.loadPlanner();assert.equal(calls.length,4);
  } finally {globalThis.fetch=original;}
});

test('an immediate metadata retry is isolated from an earlier canceled caller',async()=>{
  const original=globalThis.fetch,old=new AbortController(),current=new AbortController();
  const service=new StaticService(new URL('https://example.test/'),{});
  let calls=0;
  globalThis.fetch=async(url,{signal})=>{
    calls++;
    if(signal===old.signal)return new Promise((resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
    });
    return new URL(url).pathname.endsWith('stations.json.gz')
      ? new Response(gzipSync(JSON.stringify(stations))) : Response.json({schema:2,stations:['1']});
  };
  try {
    const abandoned=service.load(old.signal);old.abort();
    const restarted=service.load(current.signal);
    const [first,second]=await Promise.allSettled([abandoned,restarted]);
    assert.equal(first.status,'rejected');assert.equal(first.reason.name,'AbortError');
    assert.equal(second.status,'fulfilled');assert.equal(current.signal.aborted,false);
    assert.equal(calls,2);assert.equal(service.stations.length,stations.length);
    await service.load(current.signal);assert.equal(calls,2);
    assert.equal(service.historyReady,null);assert.equal(service.routes.routerPromise,null);
  } finally {globalThis.fetch=original;}
});

test('an immediate history retry is isolated from an earlier canceled caller',async()=>{
  const bytes=Buffer.alloc(48*4),original=globalThis.fetch;
  const service=new StaticService(new URL('https://example.test/'),{});
  service.stations=stations;service.history={schema:2,stations:['1'],counts_url:'counts.bin',
    counts_sha256:createHash('sha256').update(bytes).digest('hex')};
  const old=new AbortController(),current=new AbortController();let calls=0;
  globalThis.fetch=async(url,{signal})=>{
    calls++;
    if(signal===old.signal)return new Promise((resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
    });
    return new Response(bytes);
  };
  try {
    const abandoned=service.loadPlanner(old.signal);old.abort();
    const restarted=service.loadPlanner(current.signal);
    const [first,second]=await Promise.allSettled([abandoned,restarted]);
    assert.equal(first.status,'rejected');assert.equal(first.reason.name,'AbortError');
    assert.equal(second.status,'fulfilled');assert.equal(current.signal.aborted,false);
    assert.equal(calls,2);assert.ok(service.planner);
    await service.loadPlanner(current.signal);assert.equal(calls,2);
    assert.equal(service.routes.routerPromise,null);
  } finally {globalThis.fetch=original;}
});

test('ordinary initialization failures require an explicit retry',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;throw new Error('Connection failure');};
  try {
    const service=new StaticService(new URL('https://example.test/'),{});
    await assert.rejects(service.load(new AbortController().signal),/Connection failure/);
    assert.equal(calls,1);assert.equal(service.loaded,null);
    service.history={schema:2,stations:['1'],counts_url:'counts.bin'};
    await assert.rejects(service.loadPlanner(new AbortController().signal),/Connection failure/);
    assert.equal(calls,2);assert.equal(service.historyReady,null);
    const canceled=new AbortController();canceled.abort();
    await assert.rejects(service.load(canceled.signal),{name:'AbortError'});
    await assert.rejects(service.loadPlanner(canceled.signal),{name:'AbortError'});
    assert.equal(calls,2);
  } finally {globalThis.fetch=original;}
});

test('canceling while history finishes cannot start planning or live collection',async()=>{
  const bytes=Buffer.alloc(48*4),original=globalThis.fetch;
  const service=new StaticService(new URL('https://example.test/'),{});
  service.loaded=Promise.resolve();service.stations=stations;
  service.history={schema:2,stations:['1'],counts_url:'counts.bin',
    counts_sha256:createHash('sha256').update(bytes).digest('hex')};
  let refreshes=0,resolveData,started;
  service.refresh=()=>refreshes++;
  service.routes={estimate(){throw new Error('Canceled operation routed');}};
  const fetching=new Promise(resolve=>started=resolve);
  globalThis.fetch=()=>{started();return new Promise(resolve=>resolveData=resolve);};
  try {
    const controller=new AbortController(),q=query();q.delete('pickup');
    const pending=service.request(`/api/plan?${q}`,{signal:controller.signal});
    await fetching;controller.abort();resolveData(new Response(bytes));
    await assert.rejects(pending,{name:'AbortError'});assert.equal(refreshes,0);
    service.planner={plan(){throw new Error('Canceled operation validated');}};
    await assert.rejects(service.compare(new URLSearchParams(),controller.signal),{name:'AbortError'});
    assert.equal(refreshes,0);
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

// Export-shaped shards exercise browser geometry and cross-shard cell lookup.
function streetFixture(segments) {
  const shards=new Map();
  for(const segment of segments) {
    const [id,,aLat,aLng,bLat,bLng]=segment;
    for(let row=Math.floor(Math.min(aLat,bLat)/.005);row<=Math.floor(Math.max(aLat,bLat)/.005);row++) {
      for(let col=Math.floor(Math.min(aLng,bLng)/.005);col<=Math.floor(Math.max(aLng,bLng)/.005);col++) {
        const key=`${Math.floor(row/10)}_${Math.floor(col/10)}`;
        if(!shards.has(key))shards.set(key,{cells:{},segments:[]});
        const shard=shards.get(key);
        (shard.cells[`${row},${col}`]??=[]).push(id);
        if(!shard.segments.includes(segment))shard.segments.push(segment);
      }
    }
  }
  const calls=[];
  const labels=new StreetLabels(new URL('https://example.test/app/?v=revision'),async url=>{
    calls.push(new URL(url));
    const key=new URL(url).pathname.split('/').at(-1).replace('.json.gz','');
    if(!shards.has(key))throw Object.assign(new Error('Missing shard'),{status:404});
    return shards.get(key);
  });
  return {labels,calls};
}

test('browser street labels find segment interiors and use versioned gzip shards',async()=>{
  const {labels,calls}=streetFixture([
    [0,'Long road',37.5601,126.96,37.5601,126.98],
    [1,'Nearby endpoint',37.5605,126.9701,37.561,126.9701]
  ]);
  const result=await labels.lookup(37.5601,126.9701);
  assert.equal(result.label,'Long road');assert.equal(result.distance_m,0);
  assert.ok(calls.every(url=>url.pathname.endsWith('.json.gz')&&url.search==='?v=revision'));
  const previous=calls.length;
  await labels.lookup(37.5601,126.9701);
  assert.equal(calls.length,previous);
  await assert.rejects(labels.lookup(NaN,126.97),/Choose a location/);
  await assert.rejects(labels.lookup(0,0),/Choose a location/);
});

test('browser street lookup searches both sides of a shard boundary',async()=>{
  const {labels,calls}=streetFixture([
    [0,'Across boundary',37.54995,126.969,37.54995,126.971],
    [1,'Same side',37.5505,126.969,37.5505,126.971]
  ]);
  const result=await labels.lookup(37.55005,126.9701);
  assert.equal(result.label,'Across boundary');assert.equal(result.distance_m,11);
  assert.equal(new Set(calls.map(url=>url.pathname.split('/').at(-1).split('_')[0])).size,2);
});

test('bilingual street names share the same geometry and cached requests with legacy fallback',async()=>{
  const segments=[
    [0,'Long road',37.5601,126.96,37.5601,126.98,'긴길'],
    [1,'Other road',37.5605,126.969,37.5605,126.971,'다른길'],
    [2,'English only',37.563,126.969,37.563,126.971]
  ];
  const bilingual=streetFixture(segments);
  const legacy=streetFixture(segments.map(segment=>segment.slice(0,6)));
  for(const [lat,lng,expectedKo] of [[37.5601,126.9701,'긴길'],[37.5605,126.9701,'다른길'],
                                  [37.563,126.9701,'English only']]) {
    const result=await bilingual.labels.lookup(lat,lng);
    const {label_ko,...unchanged}=result;
    const {label_ko:legacyKo,...old}=await legacy.labels.lookup(lat,lng);
    assert.equal(label_ko,expectedKo);
    assert.equal(legacyKo,old.label);
    assert.deepEqual(unchanged,old);
    const previous=bilingual.calls.length;
    const repeated=await bilingual.labels.lookup(lat,lng);
    assert.deepEqual(repeated,result);
    assert.equal(bilingual.calls.length,previous);
  }
  assert.deepEqual(await bilingual.labels.lookup(37.7,126.97),
    {label:null,label_ko:null,distance_m:null,source:'OpenStreetMap',kind:null});
});

test('missing browser street shards produce no label while other fetch errors can retry',async()=>{
  const missing=new StreetLabels(new URL('https://example.test/'),async()=>{
    throw Object.assign(new Error('Not found'),{status:404});
  });
  assert.deepEqual(await missing.lookup(37.55,126.97),
    {label:null,label_ko:null,distance_m:null,source:'OpenStreetMap',kind:null});
  let calls=0;
  const retry=new StreetLabels(new URL('https://example.test/'),async()=>{
    if(++calls===1)throw new Error('Temporary connection failure');
    return {cells:{},segments:[]};
  });
  const first=retry.shard('751_2539');
  assert.equal(retry.shard('751_2539'),first);
  await assert.rejects(first,/Temporary/);
  assert.equal(retry.cache.size,0);
  await retry.shard('751_2539');assert.equal(calls,2);
});

test('browser street shard cache remains bounded and refetches evicted entries',async()=>{
  let calls=0;
  const labels=new StreetLabels(new URL('https://example.test/'),async()=>{
    calls++;return {cells:{},segments:[]};
  });
  for(let i=0;i<33;i++)await labels.shard(String(i));
  assert.equal(labels.cache.size,32);assert.equal(labels.cache.has('0'),false);
  await labels.shard('32');assert.equal(calls,33);
  await labels.shard('0');assert.equal(calls,34);assert.equal(labels.cache.size,32);
});
