import {StaticPlanner} from './planner.mjs';
import {StreetLabels} from './streets.mjs';
import {BrowserRoutes} from './routes.mjs';
import {fetchWebsiteInventory} from './live.mjs';
import {fetchJSON, loadHistory} from './data.mjs';

/** Browser-only coordinator. Command paths are internal, never HTTP endpoints. */
export class StaticService {
  constructor(base, config) {
    this.base = base;
    this.loaded = null;
    this.historyReady = null;
    this.stations = [];
    this.live = {refreshing: false, error: null, fetched_at: null};
    this.pendingLive = null;
    this.lastLiveAttempt = 0;
    this.streets = new StreetLabels(base, fetchJSON);
    this.routes = new BrowserRoutes(config, base);
  }

  /** Initial map data is small; historical counts and WASM remain lazy. */
  async load(signal) {
    if (!this.loaded) {
      this.loaded = Promise.all(['stations', 'history', 'popular_routes'].map(name =>
        fetchJSON(this.assetURL(`data/${name}.json${name === 'stations' ? '.gz' : ''}`), signal)
      )).then(([stations, history, popular]) => {
        this.stations = stations.map(station => ({...station, bikes: null, fetched_at: null}));
        this.history = history;
        this.popular = popular;
      }).catch(error => {this.loaded = null; throw error;});
    }
    return this.loaded;
  }

  assetURL(path) {
    const url = new URL(path, this.base);
    url.search = this.base.search;
    return url;
  }

  async loadPlanner(signal) {
    if (!this.historyReady) {
      this.historyReady = loadHistory(this.base, signal, this.history)
        .then(history => {this.planner = new StaticPlanner(this.stations, history);})
        .catch(error => {this.historyReady = null; throw error;});
    }
    return this.historyReady;
  }

  /** One in-flight request and one attempt/minute, only following user actions. */
  refresh() {
    if (this.pendingLive) return this.pendingLive;
    if (Date.now() - this.lastLiveAttempt < 60000) return;
    this.lastLiveAttempt = Date.now();
    this.live = {...this.live, refreshing: true, error: null};
    this.pendingLive = fetchWebsiteInventory().then(response => {
      const incoming = new Map(response.stations.map(station => [station.id, station]));
      const existing = new Map(this.stations.map(station => [station.id, station]));
      for (const station of this.stations) {
        const value = incoming.get(station.id);
        station.bikes = value?.bikes ?? null;
        station.fetched_at = value?.fetched_at ?? null;
      }
      // Linear merge replaces repeated full-catalogue searches. Keep the same
      // station array so the planner sees metadata changes and new stations.
      for (const value of incoming.values()) {
        const station = existing.get(value.id);
        if (station) Object.assign(station, value);
        else this.stations.push(value);
      }
      this.live = {...response.live, refreshing: false};
    }).catch(() => {
      // Preserve receipt timestamps on failure; the UI enforces expiry.
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
    signal?.throwIfAborted();
    const url = new URL(path, 'https://local.invalid');
    switch (url.pathname) {
      case '/api/bootstrap':
        return {...this.snapshot(), history: this.history, popular_routes: this.popular,
          now: new Date().toISOString()};
      case '/api/place-label':
        return this.streets.lookup(Number(url.searchParams.get('lat')), Number(url.searchParams.get('lng')), signal);
      case '/api/live':
        if (url.searchParams.get('refresh') !== '0') this.refresh();
        return this.snapshot();
      case '/api/plan':
        await this.loadPlanner(signal);
        return this.compare(url.searchParams, signal);
      default:
        throw new Error('Unknown operation.');
    }
  }

  async compare(query, signal) {
    const plan = this.planner.plan(query, {...this.live}); // Validate before live fetch.
    this.refresh();
    // The single WASM worker handles route jobs serially. Keep results bounded.
    for (const station of plan.departures) {
      signal?.throwIfAborted();
      station.cycling_route = await this.routes.estimate(station, plan.return_station, 'bicycle', signal);
      station.walking_route = await this.routes.estimate(plan.origin, station, 'pedestrian', signal);
    }
    signal?.throwIfAborted();
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
