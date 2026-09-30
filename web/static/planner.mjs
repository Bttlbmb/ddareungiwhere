export function distance(a, b) {
  const rad = n => n * Math.PI / 180;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2)));
}

export function pickupTime(value, now = Date.now()) {
  // A datetime-local value represents Seoul wall time, independent of device TZ.
  const stamp = !value || value === 'now' ? now : Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}+09:00`);
  if (!Number.isFinite(stamp) || stamp < now - 60000 || stamp > now + 7 * 86400000)
    throw new Error('Choose a pickup time from now through the next seven days (Seoul time).');
  const seoul = new Date(stamp + 9 * 3600000);
  return { stamp, hour: seoul.getUTCHours(), weekday: seoul.getUTCDay() > 0 && seoul.getUTCDay() < 6 };
}

export class StaticPlanner {
  constructor(stations, history) {
    this.stations = stations;
    this.history = history;
    this.historyIndex = new Map(history.stations.map((n, i) => [n, i]));
  }
  plan(query, live, now = Date.now()) {
    const point = prefix => {
      if (!query.has(`${prefix}_lat`) || !query.has(`${prefix}_lng`)) throw new Error('Choose both points on the map.');
      const lat = Number(query.get(`${prefix}_lat`)), lng = Number(query.get(`${prefix}_lng`));
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132)
        throw new Error('Choose map points in or around Seoul.');
      return {lat, lng};
    };
    if ((query.get('count') || '5') !== '5') throw new Error('Compare five nearby stations.');
    const origin = point('origin'), destination = point('destination');
    const pickup = pickupTime(query.get('pickup'), now);
    if (!this.stations.length) throw new Error('Station locations are unavailable.');
    const stations = this.stations.map(s => ({...s}));
    const departures = [...stations].sort((a,b) => distance(origin,a)-distance(origin,b)).slice(0,5);
    let returnStation = stations.reduce((a,b) => distance(destination,a)<=distance(destination,b)?a:b);
    for (const key of ['return', 'departure']) {
      if (!query.get(key)) continue;
      const selected = stations.find(s => s.id === Number(query.get(key)));
      if (!selected) throw new Error('That station is unavailable. Choose another station.');
      if (key === 'return') returnStation = selected;
      else if (!departures.some(s => s.id === selected.id)) {
        departures[departures.length-1] = selected;
        departures.sort((a,b) => distance(origin,a)-distance(origin,b));
      }
    }
    for (const station of departures) {
      station.distance_m = Math.round(distance(origin,station));
      const index = this.historyIndex.get(station.number);
      const [observations, zero] = index === undefined ? [0,0] : this.history.counts[index*48+Number(pickup.weekday)*24+pickup.hour];
      station.availability = {observations, zero};
      const age = now - Date.parse(station.fetched_at);
      station.fresh = station.bikes !== null && Number.isFinite(age) && age >= -60000 && age <= 120000;
    }
    const immediate = pickup.stamp-now <= 900000;
    const eligible = departures.find(s => s.fresh && s.bikes > 0 && s.id !== returnStation.id);
    return {departures, return_station: {...returnStation, distance_m: Math.round(distance(destination,returnStation))},
      origin, pickup: new Date(pickup.stamp).toISOString(), hour: pickup.hour,
      day_group: pickup.weekday ? 'Weekdays' : 'Weekends', immediate, suggested_id: immediate ? eligible?.id ?? null : null, live};
  }
}
