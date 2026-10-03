export class StreetLabels {
  constructor(base, fetchJSON) {
    this.base = base;
    this.fetchJSON = fetchJSON;
    this.cache = new Map();
  }

  shard(key, signal) {
    if (this.cache.has(key)) {
      const task = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, task);
      return task;
    }
    const url = new URL(`data/streets/${key}.json.gz`, this.base);
    url.search = this.base.search;
    const task = this.fetchJSON(url, signal).catch(error => {
      // A versioned release cannot gain a missing shard mid-session. Cache its
      // absence; transient failures remain retryable without evicting a retry.
      if (error.status === 404) return null;
      if (this.cache.get(key) === task) this.cache.delete(key);
      throw error;
    });
    this.cache.set(key, task);
    if (this.cache.size > 32) this.cache.delete(this.cache.keys().next().value);
    return task;
  }

  async lookup(lat, lng, signal) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132)
      throw new Error('Choose a location in or around Seoul.');
    const scale = 111195 * Math.cos(lat * Math.PI / 180);
    const latRadius = 250 / 111195, lngRadius = 250 / scale;
    const cells = [];
    for (let row = Math.floor((lat - latRadius) / .005); row <= Math.floor((lat + latRadius) / .005); row++) {
      for (let col = Math.floor((lng - lngRadius) / .005); col <= Math.floor((lng + lngRadius) / .005); col++) {
        cells.push({key: `${row},${col}`, shard: `${Math.floor(row / 10)}_${Math.floor(col / 10)}`});
      }
    }
    const keys = [...new Set(cells.map(cell => cell.shard))];
    const shards = new Map(await Promise.all(keys.map(async key => [key, await this.shard(key, signal)])));
    // Index only segments in the searched cells, rather than every road in each
    // 0.05° shard. Reuse the ID set below to inspect duplicated segments once.
    const candidates = new Set(cells.flatMap(cell => shards.get(cell.shard)?.cells[cell.key] || []));
    const segments = new Map();
    for (const shard of shards.values()) {
      for (const segment of shard?.segments || []) {
        if (candidates.has(segment[0])) segments.set(segment[0], segment);
      }
    }
    let best = 250, label = null, label_ko = null;
    for (const cell of cells) {
      for (const id of shards.get(cell.shard)?.cells[cell.key] || []) {
        if (!candidates.delete(id)) continue;
        const [, name, aLat, aLng, bLat, bLng, nameKo] = segments.get(id);
        const ax = (aLng - lng) * scale, ay = (aLat - lat) * 111195;
        const bx = (bLng - lng) * scale, by = (bLat - lat) * 111195;
        const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
        const fraction = length ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length)) : 0;
        const metres = Math.hypot(ax + fraction * dx, ay + fraction * dy);
        if (metres <= best) {
          best = metres;
          label = name;
          label_ko = nameKo || name;
        }
      }
    }
    return {label, label_ko, distance_m: label ? Math.round(best) : null,
      source: 'OpenStreetMap', kind: label ? 'nearest_street' : null};
  }
}
