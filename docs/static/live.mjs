import {timeoutSignal} from './data.mjs?v=91042991f1612db2';

/** Fixed official public feed; no account, cookies, caller URLs or API key. */
const LIVE_URL = 'https://www.bikeseoul.com/app/station/getStationRealtimeStatus.do';
const COUNT_FIELDS = ['parkingBikeTotCnt', 'parkingQRBikeCnt', 'parkingELECBikeCnt'];

function quantity(value) {
  const count = typeof value === 'number' ? value :
    typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : null;
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function normalized(row, stamp, bikes = row?.parkingBikeTotCnt) {
  if (!row || typeof row !== 'object') return null;
  const id = Number(String(row.stationId || '').replace(/^ST-/, ''));
  const match = String(row.stationName || '').match(/^(\d+)\.\s*(.*)$/);
  const lat = Number(row.stationLatitude), lng = Number(row.stationLongitude);
  if (!Number.isInteger(id) || id <= 0 || !match || !Number.isFinite(lat) ||
      !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) return null;
  return {id, number: String(Number(match[1])), name: match[2], lat, lng,
    bikes: quantity(bikes), fetched_at: stamp};
}

export async function fetchWebsiteInventory(fetcher = fetch) {
  let payload;
  try {
    const response = await fetcher(LIVE_URL, {
      method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'stationGrpSeq=ALL', mode: 'cors', credentials: 'omit',
      redirect: 'error', signal: timeoutSignal(8000)
    });
    if (!response.ok) throw new Error('Provider failed.');
    payload = await response.json();
  } catch {
    throw new Error('Live bike counts are unavailable. Try refreshing shortly.');
  }
  // A dated size floor detects obvious partial lists, not every provider error.
  if (payload?.checkResult !== true || payload.stationVO?.stationGrpSeq !== 'ALL' ||
      !Array.isArray(payload.realtimeList) || payload.realtimeList.length < 2500 ||
      payload.realtimeList.length > 10000) {
    throw new Error('The bike service returned an incomplete station list.');
  }
  const stamp = new Date().toISOString(), stations = new Map();
  for (const row of payload.realtimeList) {
    // The website separates legacy, regular QR and smaller 새싹 quantities.
    // Its all-bike map sums them. A missing category makes the total unknown.
    let total = 0;
    for (const field of COUNT_FIELDS) {
      const count = quantity(row?.[field]);
      if (count === null) {total = null; break;}
      total += count;
    }
    const station = normalized(row, stamp, total);
    if (!station || stations.has(station.id)) throw new Error('The bike service returned an invalid station list.');
    stations.set(station.id, station);
  }
  // Discard the upstream session object; receipt time is not observation time.
  return {stations: [...stations.values()], live: {refreshing: false, error: null, fetched_at: stamp}};
}
