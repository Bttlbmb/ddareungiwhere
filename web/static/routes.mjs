/** Decode only first/last shape points, keeping retained geometry bounded. */
export function polylineEndpoints(shape) {
  let index = 0, lat = 0, lng = 0, first, last;
  const read = () => {
    let result = 0, shift = 0, byte;
    do {
      if (index >= shape.length || shift > 30) throw new Error('Invalid walking geometry.');
      byte = shape.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw new Error('Invalid walking geometry.');
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    return result & 1 ? ~(result >>> 1) : result >>> 1;
  };
  while (index < shape.length) {
    lat += read(); lng += read();
    last = [lat / 1e6, lng / 1e6];
    first ??= last;
  }
  return [first, last];
}

/** Preserve native time/distance and add only bounded pedestrian access gaps. */
export function routeEstimate(native, origin, destination, mode) {
  const summary = native?.trip?.summary;
  if (!summary || ![summary.time, summary.length].every(value => Number.isFinite(value) && value >= 0)) {
    throw new Error('Invalid route estimate.');
  }
  let seconds = summary.time, km = summary.length, access = 0;
  if (mode === 'pedestrian') {
    const legs = native.trip.legs;
    if (!legs?.length) throw new Error('Missing walking geometry.');
    const first = polylineEndpoints(legs[0].shape);
    const last = legs.length === 1 ? first : polylineEndpoints(legs.at(-1).shape);
    if (!first[0] || !last[1]) throw new Error('Missing walking geometry.');
    for (const [point, snapped] of [[origin, first[0]], [destination, last[1]]]) {
      const gap = 111195 * Math.hypot(point.lat - snapped[0], (point.lng - snapped[1]) * Math.cos(point.lat * Math.PI / 180));
      if (!Number.isFinite(gap) || gap > 100) throw new Error('Walking endpoint too far from mapped path.');
      access += gap;
    }
    seconds += access / 5100 * 3600;
    km += access / 1000;
  }
  return {provider: 'Valhalla', minutes: seconds / 60, distance_m: Math.round(km * 1000),
    ...(mode === 'pedestrian' ? {access_distance_m: Math.round(access)} : {})};
}

export class BrowserRoutes {
  constructor(config, base) {
    this.config = config;
    this.base = base;
    this.routerPromise = null;
    this.cache = new Map();
    this.samples = [];
  }

  /** Share initialization, including simultaneous callers; retry failed imports. */
  async getRouter() {
    if (!this.routerPromise) {
      this.routerPromise = (async () => {
        const {Router} = await import('../vendor/valhalla/index.js');
        return new Router({manifestUrl: new URL(this.config.manifestUrl, this.base).href,
          transport: 'individual-tiles', memoryBudgetBytes: 96 * 1024 * 1024,
          wasmMemory: {initialMiB: 64, maximumMiB: 512}, timeoutMs: 15000, retries: 1});
      })().catch(error => {this.routerPromise = null; throw error;});
    }
    return this.routerPromise;
  }

  async estimate(origin, destination, mode, signal, {stationAtOrigin = false} = {}) {
    if (mode === 'pedestrian' && origin.lat === destination.lat && origin.lng === destination.lng) {
      return {provider: 'Valhalla', minutes: 0, distance_m: 0};
    }
    if (mode === 'bicycle' && origin.id === destination.id) {
      return {provider: 'Valhalla', error: 'Choose different departure and destination stations.'};
    }
    const key = JSON.stringify([mode, origin.lat, origin.lng, destination.lat, destination.lng, stationAtOrigin]);
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this.cache.delete(key); this.cache.set(key, value);
      return {...value};
    }
    try {
      signal?.throwIfAborted();
      const router = await this.getRouter();
      const result = await router.route({
        locations: [origin, destination].map((point, index) => ({lat: point.lat, lon: point.lng,
          ...(mode === 'pedestrian' ? {station: stationAtOrigin ? index === 0 : index === 1} : {})})),
        costing: mode, costing_options: mode === 'bicycle'
          ? {bicycle: {bicycle_type: 'hybrid', cycling_speed: 15}}
          : {pedestrian: {walking_speed: 5.1}}
      }, {signal});
      const estimate = routeEstimate(result.native, origin, destination, mode);
      this.cache.set(key, estimate);
      if (this.cache.size > 2048) this.cache.delete(this.cache.keys().next().value);
      if (this.config.debugRoutes) {
        this.samples.push({mode, diagnostics: result.diagnostics});
        if (this.samples.length > 10) this.samples.shift();
      }
      return {...estimate};
    } catch (error) {
      if (signal?.aborted) throw error;
      if (this.config.debugRoutes) this.lastError = {code: error.code || 'ROUTE', message: error.message};
      return {provider: 'Valhalla', error: mode === 'pedestrian' ? 'Walking estimate unavailable.' : 'Cycling estimate unavailable.'};
    }
  }
}
