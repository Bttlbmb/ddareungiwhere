import {StaticPlanner} from './planner.mjs?v=91042991f1612db2';
import {StreetLabels} from './streets.mjs?v=91042991f1612db2';
import {BrowserRoutes} from './routes.mjs?v=91042991f1612db2';
import {fetchWebsiteInventory} from './live.mjs?v=91042991f1612db2';
import {fetchJSON, loadHistory, throwIfAborted} from './data.mjs?v=91042991f1612db2';

/** Browser-only coordinator. Command paths are internal, never HTTP endpoints. */
export class StaticService {
  constructor(base, config) {
    this.base = base;
    this.loaded = null;
    this.loadSignal = null;
    this.history = null;
    this.historyReady = null;
    this.historySignal = null;
    this.stations = [];
    this.live = {refreshing: false, error: null, fetched_at: null};
    this.pendingLive = null;
    this.lastLiveAttempt = 0;
    this.streets = new StreetLabels(base, fetchJSON);
    this.routes = new BrowserRoutes(config, base);
  }

  /** Station bootstrap is independent of lazy history metadata/counts and WASM. */
  async load(signal) {
    throwIfAborted(signal);
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!this.loaded) {
        this.loadSignal = signal;
        this.loaded = fetchJSON(this.assetURL('data/stations.json.gz'), signal)
          .then(stations => {
            throwIfAborted(signal);
            this.stations = stations.map(station => ({...station, bikes: null, fetched_at: null}));
          }).catch(error => {this.loaded = null; throw error;});
      }
      const ownerSignal = this.loadSignal;
      try { return await this.loaded; }
      catch (error) {
        // A new caller may still be awaiting the canceled caller's shared load.
        if (attempt || !ownerSignal?.aborted || signal?.aborted) throw error;
      }
    }
  }

  assetURL(path) {
    const url = new URL(path, this.base);
    url.search = this.base.search;
    return url;
  }

  async loadPlanner(signal) {
    throwIfAborted(signal);
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!this.historyReady) {
        this.historySignal = signal;
        this.historyReady = loadHistory(this.base, signal, this.history)
          .then(history => {
            throwIfAborted(signal);
            const {counts, ...metadata} = history;
            this.history = metadata;
            this.planner = new StaticPlanner(this.stations, history);
          })
          .catch(error => {this.historyReady = null; throw error;});
      }
      const ownerSignal = this.historySignal;
      try { return await this.historyReady; }
      catch (error) {
        if (attempt || !ownerSignal?.aborted || signal?.aborted) throw error;
      }
    }
  }

  /** One in-flight request and one attempt/minute, only following user actions. */
  refresh() {
    if (this.pendingLive) return this.pendingLive;
    if (Date.now() - this.lastLiveAttempt < 60000) return;
    this.lastLiveAttempt = Date.now();
    this.live = {...this.live, refreshing: true, error: null};
    this.pendingLive = fetchWebsiteInventory().then(response => {
      const incoming = new Map(response.stations.map(station => [station.id, station]));
      // Mutate the catalogue in place: the planner retains this same array.
      // Consuming matches leaves only new stations to append, using one index.
      for (const station of this.stations) {
        const value = incoming.get(station.id);
        if (value) {
          Object.assign(station, value);
          incoming.delete(station.id);
        } else {
          station.bikes = null;
          station.fetched_at = null;
        }
      }
      for (const station of incoming.values()) this.stations.push(station);
      this.live = {...response.live, refreshing: false};
    }).catch(() => {
      // Preserve the last count snapshot and its receipt time on failure.
      this.live = {...this.live, refreshing: false,
        error: 'Live bike counts are unavailable. Try refreshing shortly.'};
    }).finally(() => {this.pendingLive = null;});
    return this.pendingLive;
  }

  snapshot() {
    return {stations: this.stations.map(station => ({...station})), live: {...this.live}};
  }

  async request(path, {signal} = {}) {
    await this.load(signal);
    throwIfAborted(signal);
    const url = new URL(path, 'https://local.invalid');
    switch (url.pathname) {
      case '/api/bootstrap':
        return {...this.snapshot(), history: this.history,
          now: new Date().toISOString()};
      case '/api/place-label':
        return this.streets.lookup(Number(url.searchParams.get('lat')), Number(url.searchParams.get('lng')), signal);
      case '/api/live':
        if (url.searchParams.get('refresh') !== '0') this.refresh();
        return this.snapshot();
      case '/api/plan':
        await this.loadPlanner(signal);
        throwIfAborted(signal);
        return this.compare(url.searchParams, signal);
      default:
        throw new Error('Unknown operation.');
    }
  }

  async compare(query, signal) {
    throwIfAborted(signal);
    const plan = this.planner.plan(query, {...this.live}); // Validate before live fetch.
    this.refresh();
    // The single WASM worker handles route jobs serially. Keep results bounded.
    for (const station of plan.departures) {
      throwIfAborted(signal);
      station.cycling_route = await this.routes.estimate(station, plan.return_station, 'bicycle', signal);
      station.walking_route = await this.routes.estimate(plan.origin, station, 'pedestrian', signal);
    }
    throwIfAborted(signal);
    plan.destination_walking_route = await this.routes.estimate(
      plan.return_station, plan.destination, 'pedestrian', signal, {stationAtOrigin: true});
    const byId = new Map(this.stations.map(station => [station.id, station]));
    for (const station of plan.departures) {
      const fresh = byId.get(station.id);
      station.bikes = fresh?.bikes ?? null;
      station.fetched_at = fresh?.fetched_at ?? null;
    }
    plan.suggested_id = plan.immediate ? plan.departures.find(station => {
      const age = Date.now() - Date.parse(station.fetched_at);
      return station.bikes > 0 && age >= -60000 && age <= 120000 && station.id !== plan.return_station.id;
    })?.id ?? null : null;
    plan.live = {...this.live};
    return plan;
  }
}
