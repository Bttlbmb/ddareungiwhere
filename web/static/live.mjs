export function normalized(row,stamp) {
  const id=Number(String(row.stationId||'').replace(/^ST-/,''));
  const match=String(row.stationName||'').match(/^(\d+)\.\s*(.*)$/);
  const lat=Number(row.stationLatitude),lng=Number(row.stationLongitude);
  if(!Number.isInteger(id)||id<=0||!match||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<33||lat>39||lng<124||lng>132)return null;
  const raw=row.parkingBikeTotCnt;
  const bikes=typeof raw==='number'?raw:typeof raw==='string'&&/^\d+$/.test(raw.trim())?Number(raw):null;
  return {id,number:String(Number(match[1])),name:match[2],lat,lng,bikes:Number.isInteger(bikes)&&bikes>=0?bikes:null,fetched_at:stamp};
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
      body:'stationGrpSeq=ALL',mode:'cors',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(8000)
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

