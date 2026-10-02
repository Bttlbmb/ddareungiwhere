const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("panning preserves visible station markers and refreshed coordinates", () => {
  const h = harness();
  let created = 0;
  const removed = [];
  h.context.bounds = {
    pad() {
      return this;
    },
    contains() {
      return true;
    },
  };
  h.context.layer = {
    removeLayer(marker) {
      removed.push(marker);
    },
  };
  h.context.L = {
    circleMarker(point) {
      created++;
      return {
        point,
        bindPopup() {
          return this;
        },
        addTo() {
          return this;
        },
        getLatLng() {
          return { lat: this.point[0], lng: this.point[1] };
        },
        setLatLng(point) {
          this.point = point;
        },
      };
    },
  };
  h.run(
    "map={getBounds:()=>bounds};baseStations=layer;state.stations.push({...fixture.station,id:2});renderBaseStations()",
  );
  const marker = h.run("stationMarkers.get(2)");
  h.run("renderBaseStations()");
  assert.equal(h.run("stationMarkers.get(2)"), marker);
  assert.equal(created, 1);
  h.run("state.stations[1].lat=37.6;renderBaseStations()");
  assert.equal(marker.getLatLng().lat, 37.6);
  h.context.bounds.contains = () => false;
  h.run("renderBaseStations()");
  assert.equal(removed[0], marker);
  assert.equal(h.run("stationMarkers.size"), 0);
});

// A small DOM model exercises real rendering functions and reproduces focus loss
// when innerHTML removes a focused descendant. No browser/network dependency.
function harness() {
  const elements = new Map(),
    timers = new Map();
  let now = Date.parse("2026-09-30T00:00:00Z"),
    nextTimer = 0;
  const document = {
    documentElement: {lang: "en"},
    activeElement: null,
    hidden: false,
    addEventListener() {},
  };
  class Element {
    constructor(id) {
      this.id = id;
      this.dataset = {};
      this.children = [];
      this.textContent = "";
      this.writes = 0;
      this.classes = new Set();
      this.classList = {
        toggle: (name, on) =>
          on ? this.classes.add(name) : this.classes.delete(name),
      };
    }
    set innerHTML(html) {
      this.writes++;
      if (this.children.includes(document.activeElement))
        document.activeElement = null;
      this.html = html;
      this.children = [...html.matchAll(/data-select="(\d+)"/g)].map(
        (match) => {
          const child = new Element();
          child.dataset.select = match[1];
          return child;
        },
      );
    }
    get innerHTML() {
      return this.html || "";
    }
    focus() {
      document.activeElement = this;
    }
    setAttribute(name, value) {
      this.attributes ||= {};
      this.attributes[name] = value;
    }
    getAttribute(name) {
      return this.attributes?.[name] ?? null;
    }
  }
  document.getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  };
  document.querySelectorAll = (selector) =>
    selector === "[data-select]"
      ? document.getElementById("station-rows").children
      : [...elements.values()].filter(element =>
          selector.startsWith("[data-i18n") && element.getAttribute(selector.slice(1, -1)) !== null);
  document.querySelector = (selector) =>
    document
      .querySelectorAll("[data-select]")
      .find((e) => selector === `[data-select="${e.dataset.select}"]`);
  class Clock extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const context = vm.createContext({
    document,
    window: {
      location: new URL("https://example.test/ddareungiwhere/"),
      history: {pushState(_state, _unused, url) {context.window.location = new URL(url);}},
      addEventListener() {},
    },
    Date: Clock,
    Intl,
    URL,
    URLSearchParams,
    console,
    setTimeout(fn, delay) {
      const id = ++nextTimer;
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    setInterval() {},
    getComputedStyle: () => ({getPropertyValue: name => ({"--bike-good":"#24553f","--bike-good-soft":"#c4e3d4"})[name] || ""}),
    AbortController,
    fetch: async () => {
      throw new Error("offline");
    },
  });
  const source = fs
    .readFileSync(require("node:path").join(__dirname, "../web/app.js"), "utf8")
    .replace('/*__KOREAN_TRANSLATIONS__*/ {}', fs.readFileSync(require("node:path").join(__dirname, "../web/i18n.json"), "utf8").trim())
    .replace(/start\(\);\s*$/, "");
  // UI fixtures supply command results through the browser coordinator. The
  // response-shaped stubs below are test data, never a production HTTP API.
  context.window.BikeStatic = {request: async (path, options) => {
    const response = await context.fetch(path, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'offline');
    return data;
  }};
  vm.runInContext(source, context);
  const run = (code) => vm.runInContext(code, context);
  const station = {
    id: 1,
    number: "4760",
    name: "First station",
    lat: 37.5,
    lng: 127,
    bikes: 4,
    fetched_at: new Date(now).toISOString(),
    distance_m: 20,
    availability: { observations: 0, zero: 0 },
  };
  const history = {
    start: "2026-04-01",
    end: "2026-06-30",
    availability_start: "2025-10-01",
    availability_end: "2025-12-31",
  };
  context.fixture = { station, history };
  run(
    `state.stations=[fixture.station];state.history=fixture.history;state.selectedId=1;state.plan={departures:[fixture.station],return_station:fixture.station,suggested_id:1,immediate:true,live:{refreshing:false,fetched_at:fixture.station.fetched_at},};`,
  );
  return {
    context,
    run,
    e: (id) => document.getElementById(id),
    document,
    timers,
    advance: (ms) => {
      now += ms;
    },
    station,
    history,
    Element,
  };
}

test("counts and availability keep the last snapshot despite elapsed time and failed refresh", async () => {
  const h = harness();
  h.run("renderResults();renderLive(state.plan.live);updateLiveDisplay()");
  assert.ok(![...h.timers.values()].some(t => t.delay === 120001));
  await h.run("refreshLive()");
  let failRequest;
  h.context.fetch = () => new Promise((_, reject) => {failRequest = reject;});
  const pending = h.run("refreshLive()");
  h.advance(86400000);
  h.run("updateLiveDisplay()");
  assert.match(h.e("station-rows").innerHTML,/class="stat bikes ">4</);
  assert.match(h.e("station-rows").innerHTML,/Available now/);
  assert.doesNotMatch(h.e("station-rows").innerHTML,/Nearest|Bikes now|small-tag/);
  failRequest(new Error("offline"));
  await pending;
  assert.match(h.e("station-rows").innerHTML,/class="stat bikes ">4</);
  assert.equal(h.e("live-error").hidden, false);
  assert.equal(h.e("live-error").textContent, "Live bike refresh failed. Showing last received counts.");
});

test("marker selection changes styling without panning or replacing popup layers", () => {
  const h = harness();
  let pans = 0,
    changes = 0;
  h.context.mapStub = {
    panTo() {
      pans++;
    },
  };
  h.context.markers = [1, 2].map((id) => ({
    id,
    selected: id === 1,
    getElement() {
      return {
        querySelector: () => ({
          classList: {
            toggle: (_name, selected) => {
              this.selected = selected;
              changes++;
            },
          },
        }),
      };
    },
    setZIndexOffset(n) {
      this.z = n;
    },
  }));
  h.run(
    "map=mapStub;markers.forEach(m=>departureMarkers.set(m.id,m));selectDeparture(2,false)",
  );
  assert.equal(pans, 0);
  assert.equal(changes, 2);
  assert.equal(h.context.markers[0].selected, false);
  assert.equal(h.context.markers[1].selected, true);
  assert.equal(h.context.markers[1].z, 300);
});

test("station focus survives selection and live result redraw", () => {
  const h = harness();
  h.run("renderResults()");
  h.e("station-rows").children[0].focus();
  const old = h.document.activeElement;
  h.run("selectDeparture(1,false)");
  assert.notEqual(h.document.activeElement, old);
  assert.equal(h.document.activeElement.dataset.select, "1");
  h.run("renderResults()");
  assert.equal(h.document.activeElement.dataset.select, "1");
});

test("failed bootstrap recovers metadata without selecting a journey", async () => {
  const h = harness();
  h.run("state.history=null;state.plan=null");
  await h.run("loadBootstrap()");
  assert.match(h.e("error").textContent, /offline/);
  const requested = [];
  h.context.fetch = async (path) => {
    requested.push(path);
    return {
      ok: true,
      json: async () => ({
        stations: [h.station, { ...h.station, id: 2, number: "4796" }],
        history: h.history,
        live: { refreshing: false },
      }),
    };
  };
  await h.run("refreshLive()");
  assert.equal(requested[0], "/api/bootstrap");
  assert.equal(h.run("state.history.start"), "2026-04-01");
  assert.equal(h.run("state.origin"), null);
  assert.equal(h.run("state.destination"), null);
  assert.equal(h.e("compare-button").disabled, true);
  assert.equal(h.e("error").hidden, true);
  assert.equal(
    requested.some((path) => path.startsWith("/api/plan")),
    false,
  );
  assert.equal(h.run("state.plan"), null);
});

test("table shows station, current bikes, walk and cycling durations, and historical risk", () => {
  const h = harness();
  h.run("state.plan.immediate=false;renderResults()");
  assert.equal(h.e("availability-heading").textContent, "Historical no-bike risk");
  assert.equal((h.e("station-rows").innerHTML.match(/<td(?: [^>]*)?>/g) || []).length, 5);
  assert.doesNotMatch(
    h.e("station-rows").innerHTML,
    /Matching dates|records|rides<|past-count|<small>min|2026-06-01|zero in archive/,
  );
  assert.match(h.e("station-rows").innerHTML, /Unknown/);
});

test("historical risk requires sufficient valid observations and respects band boundaries", () => {
  const h = harness();
  for (const value of [
    undefined,
    {},
    { observations: 19, zero: 0 },
    { observations: 20 },
    { observations: 20, zero: -1 },
    { observations: 20, zero: 21 },
    { observations: 20.5, zero: 0 },
  ]) {
    h.context.availability = value;
    assert.equal(h.run("historicalRisk(availability).label"), "Unknown");
  }
  for (const [zero, expected] of [
    [0, "Low"],
    [4, "Low"],
    [5, "Moderate"],
    [19, "Moderate"],
    [20, "High"],
    [100, "High"],
  ]) {
    h.context.availability = { observations: 100, zero };
    assert.equal(h.run("historicalRisk(availability).label"), expected);
  }
  assert.equal(h.run("historicalRisk({observations:20,zero:0}).label"), "Low");
});

test("live emptiness, stale counts and comparison context do not rewrite historical risk", () => {
  const h = harness();
  h.station.availability = {
    observations: 60,
    zero: 12,
  };
  h.station.bikes = 0;
  h.run("renderResults()");
  assert.match(h.e("station-rows").innerHTML, /stat bikes empty/);
  assert.match(h.e("station-rows").innerHTML, /risk-high/);
  h.advance(121000);
  h.run(
    "state.plan.immediate=false;state.plan.day_group='Weekends';state.plan.hour=8;state.plan.return_station={id:2};renderResults()",
  );
  assert.doesNotMatch(h.e("station-rows").innerHTML, /Stale report/);
  assert.match(h.e("station-rows").innerHTML, /risk-high/);
  h.station.availability = { observations: 26, zero: 0 };
  h.run("renderResults()");
  assert.match(h.e("station-rows").innerHTML, /risk-low/);
  h.run(
    "state.plan.history={};fixture.station.availability=undefined;renderResults()",
  );
});

test("GPS is one-shot, handles denied access and ignores a late fix after manual selection", () => {
  const h = harness();
  let callbacks;
  h.context.navigator = {
    geolocation: {
      getCurrentPosition(success, error, options) {
        callbacks = { success, error, options };
      },
    },
  };
  h.run("useCurrentLocation()");
  assert.equal(callbacks.options.enableHighAccuracy, true);
  assert.equal(callbacks.options.timeout, 15000);
  callbacks.error({ code: 1 });
  assert.match(h.e("location-status").textContent, /denied/);
  assert.equal(h.e("use-location").disabled, false);
  h.run(
    'useCurrentLocation();setPoint("origin",{lat:37.55,lng:127.02},"Manual place")',
  );
  callbacks.success({
    coords: { latitude: 37.6, longitude: 127.1, accuracy: 20 },
  });
  assert.equal(h.run("state.origin.lat"), 37.55);
  assert.equal(h.e("origin-label").textContent, "Manual place");
});

test("GPS success changes only the origin without extra text; timeout keeps the journey", () => {
  const h = harness();
  let callbacks;
  h.context.navigator = {
    geolocation: {
      getCurrentPosition(success, error) {
        callbacks = { success, error };
      },
    },
  };
  h.run("state.destination={lat:37.53,lng:127.08};useCurrentLocation()");
  callbacks.success({
    coords: { latitude: 37.54, longitude: 127.04, accuracy: 25 },
  });
  assert.equal(h.run("state.origin.lat"), 37.54);
  assert.equal(h.run("state.destination.lat"), 37.53);
  assert.equal(h.e("location-status").textContent, "");
  h.run("useCurrentLocation()");
  callbacks.error({ code: 3 });
  assert.match(h.e("location-status").textContent, /too long/);
  assert.equal(h.run("state.origin.lat"), 37.54);
  h.run("useCurrentLocation()");
  callbacks.success({ coords: { latitude: 51, longitude: 0, accuracy: 10 } });
  assert.match(h.e("location-status").textContent, /outside the Seoul/);
  assert.equal(h.run("state.origin.lat"), 37.54);
});

test("late street lookup cannot rename a newer map point; fallback uses station name", async () => {
  const h = harness();
  let resolveFirst;
  h.context.fetch = () =>
    new Promise((resolve) => {
      resolveFirst = resolve;
    });
  const first = h.run('lookupPointLabel("origin",{lat:37.5,lng:127},0)');
  h.context.fetch = async () => ({
    ok: true,
    json: async () => ({ label: "New street", distance_m: 5 }),
  });
  h.run("state.labelRequests.origin=1");
  await h.run('lookupPointLabel("origin",{lat:37.6,lng:127},1)');
  resolveFirst({
    ok: true,
    json: async () => ({ label: "Old street", distance_m: 10 }),
  });
  await first;
  assert.equal(h.e("origin-label").textContent, "New street");
  h.context.fetch = async () => {
    throw new Error("offline");
  };
  h.run('setPoint("origin",{lat:37.5,lng:127})');
  assert.equal(h.e("origin-label").textContent, "Near First station");
});

test("only an explicit query opens results; returning to map survives in-flight refresh", async () => {
  const h = harness();
  h.run(
    "state.origin={lat:37.5,lng:127};state.destination={lat:37.51,lng:127.01}",
  );
  h.context.result = h.run("state.plan");
  h.context.fetch = async () => ({
    ok: true,
    json: async () => h.context.result,
  });
  await h.run("compare()");
  assert.equal(
    h.run("state.view"),
    "map",
    "background comparison keeps the map visible",
  );
  await h.run("compare({preventDefault(){}})");
  assert.equal(h.e("journey-map").hidden, true);
  assert.equal(h.e("results").hidden, false);
  assert.equal(h.document.activeElement, h.e("back-to-map"));
  let finish;
  h.context.fetch = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = h.run("compare({preventDefault(){}})");
  h.context.invalidations = 0;
  h.run(
    "map={invalidateSize(){invalidations++}};showView('map');map=undefined",
  );
  finish({ ok: true, json: async () => h.context.result });
  await pending;
  assert.equal(h.e("journey-map").hidden, false);
  assert.equal(h.e("results").hidden, true);
  assert.equal(h.context.invalidations, 1);
  assert.equal(h.e("workspace").classes.has("show-results"), false);
  assert.equal(h.run("state.destination.lng"), 127.01);
});

test("the straight line follows both endpoints and never accumulates old lines", () => {
  const h = harness();
  const lines = [],
    layers = [];
  h.context.L = {
    polyline(points, options) {
      const line = {
        points,
        options,
        addTo() {
          lines.push(this);
          return this;
        },
      };
      return line;
    },
    marker() {
      return { on() {} };
    },
    divIcon(options) {
      return options;
    },
  };
  h.context.endpointLayer = {
    clearLayers() {
      lines.length = 0;
      layers.length = 0;
    },
    addLayer(marker) {
      layers.push(marker);
    },
  };
  h.run(
    "map={};endpointMarkers=endpointLayer;state.origin={lat:37.5,lng:127};state.destination={lat:37.51,lng:127.01};renderEndpoints()",
  );
  assert.equal(lines.length, 1);
  assert.equal(layers.length, 2);
  assert.equal(JSON.stringify(lines[0].points), "[[37.5,127],[37.51,127.01]]");
  assert.equal(lines[0].options.interactive, false);
  h.run("state.destination={lat:37.52,lng:127.02};renderEndpoints()");
  assert.equal(lines.length, 1);
  assert.equal(JSON.stringify(lines[0].points), "[[37.5,127],[37.52,127.02]]");
  h.run("state.destination=null;renderEndpoints()");
  assert.equal(lines.length, 0);
});

test("loading, choosing pins and editing pickup never request a comparison or live collection", async () => {
  const h = harness(),
    requests = [];
  const result = h.run("state.plan");
  let intervals = 0;
  h.context.setInterval = () => {
    intervals++;
  };
  h.context.fetch = async (path) => {
    requests.push(path);
    return {
      ok: true,
      json: async () =>
        path.startsWith("/api/plan")
          ? result
          : {
              stations: [h.station, { ...h.station, id: 2, number: "4796" }],
              history: h.history,
              live: { refreshing: false },
            },
    };
  };
  await h.run("start()");
  assert.equal(h.run("state.origin"), null);
  assert.equal(h.run("state.destination"), null);
  assert.equal(h.e("compare-button").disabled, true);
  assert.equal(h.e("fit-map").disabled, true);
  h.run('setPoint("origin",{lat:37.55,lng:127.03})');
  assert.equal(h.e("compare-button").disabled, true);
  h.run(
    'setPoint("origin",{lat:37.55,lng:127.03});setPoint("destination",{lat:37.56,lng:127.04})',
  );
  assert.equal(h.e("compare-button").disabled, false);
  assert.equal(h.e("fit-map").disabled, false);
  h.e("pickup").value = "2026-09-30T10:00";
  h.e("pickup").onchange();
  h.e("now-button").onclick();
  assert.equal(intervals, 0);
  assert.equal(
    requests.some(
      (p) => p.startsWith("/api/plan") || p.startsWith("/api/live"),
    ),
    false,
  );
  assert.equal(h.run("state.plan"), null);
  await h.e("planner-form").onsubmit({ preventDefault() {} });
  assert.equal(requests.filter((p) => p.startsWith("/api/plan")).length, 1);
  assert.equal(h.run("state.view"), "results");
});

test("metadata recovery preserves a single chosen pin and never fills the other endpoint", async () => {
  const h = harness();
  h.run('state.history=null;state.plan=null;state.origin={lat:37.56,lng:127.02}');
  h.context.fetch = async () => ({
    ok: true,
    json: async () => ({stations:[h.station],history:h.history,live:{refreshing:false}}),
  });
  await h.run("loadBootstrap()");
  assert.equal(h.run("state.origin.lng"), 127.02);
  assert.equal(h.run("state.destination"), null);
  assert.equal(h.e("compare-button").disabled, true);
  let requests = 0;
  h.context.fetch = async () => { requests++; throw new Error("unexpected request"); };
  await h.run("compare({preventDefault(){}})");
  assert.equal(requests, 0);
  assert.equal(h.run("state.view"), "map");
  assert.equal(h.run("state.mode"), "destination");
});

test("manual bike refresh updates counts without rerunning history; completion polling only reads a snapshot", async () => {
  const h = harness(),
    requests = [];
  h.context.fetch = async (path) => {
    requests.push(path);
    return {
      ok: true,
      json: async () => ({
        stations: [{ ...h.station, bikes: 7 }],
        live: { refreshing: false },
      }),
    };
  };
  h.run("fixture.station.walking_route={minutes:3.2};fixture.station.cycling_route={minutes:7.8};state.plan.destination_walking_route={minutes:4.4};state.plan.destination_label='Applied road'");
  await h.run("refreshLive()");
  assert.equal(h.run("state.plan.departures[0].bikes"), 7);
  assert.equal(h.run("state.plan.departures[0].walking_route.minutes"), 3.2);
  assert.equal(h.run("state.plan.departures[0].cycling_route.minutes"), 7.8);
  assert.equal(h.run("state.plan.destination_walking_route.minutes"),4.4);
  assert.equal(h.e("return-destination").textContent,"Applied road");
  assert.equal(h.run("state.awaitingLive"), false);
  await h.run("refreshLive(false)");
  assert.deepEqual(requests, ["/api/live", "/api/live?refresh=0"]);
});

test("known snapshot counts keep their colors and never turn missing data into zero", () => {
  const h = harness();
  for (const [bikes, expected] of [
    [0, "empty"],
    [1, "few"],
    [2, "few"],
    [3, ""],
    [20, ""],
  ]) {
    h.station.bikes = bikes;
    h.run("renderRows()");
    assert.ok(
      h.e("station-rows").innerHTML.includes(`class="stat bikes ${expected}"`),
    );
    assert.doesNotMatch(h.e("station-rows").innerHTML, /Fetched|None reported/);
  }
  h.advance(121000);
  h.run("renderRows()");
  assert.match(h.e("station-rows").innerHTML, /class="stat bikes ">20</);
  for (const bikes of [null, undefined, -1, 1.5, NaN]) {
    h.station.bikes = bikes;
    h.run("renderRows()");
    assert.doesNotMatch(h.e("station-rows").innerHTML, /class="stat bikes/);
    assert.match(h.e("station-rows").innerHTML, /aria-label="Live bike count unavailable">\//);
  }
});

test("live failure notice follows refresh completion, clears on success and preserves routes and history", async () => {
  const h = harness();
  h.station.bikes = null;
  h.station.fetched_at = null;
  h.station.availability = {observations:60,zero:0};
  h.run('fixture.station.walking_route={minutes:3};fixture.station.cycling_route={minutes:8};state.plan.immediate=false;state.plan.live={refreshing:false,error:null,fetched_at:null};renderResults();renderLive(state.plan.live)');
  assert.equal(h.e('live-error').hidden,true);
  let live = {refreshing:true,error:null,fetched_at:null};
  let incoming = {...h.station};
  h.context.fetch = async () => ({ok:true,json:async()=>({stations:[incoming],live})});
  await h.run('refreshLive()');
  assert.equal(h.e('live-error').hidden,true);
  live = {refreshing:false,error:'Provider request timed out.',fetched_at:null};
  await h.run('refreshLive(false)');
  assert.equal(h.e('live-error').hidden,false);
  assert.equal(h.e('live-error').textContent,'Live bike counts unavailable. Some networks may be restricted.');
  assert.equal(h.e('fetch-time').textContent,'');
  assert.match(h.e('station-rows').innerHTML,/aria-label="Live bike count unavailable">\//);
  assert.match(h.e('station-rows').innerHTML,/>3 min<.*>8 min<.*>Low</s);
  incoming = {...h.station,bikes:0,fetched_at:'2026-09-30T00:01:00Z'};
  live = {refreshing:false,error:null,fetched_at:incoming.fetched_at};
  await h.run('refreshLive()');
  assert.equal(h.e('live-error').hidden,true);
  assert.equal(h.e('live-error').textContent,'');
  assert.match(h.e('station-rows').innerHTML,/stat bikes empty">0</);
  const stamp = h.run('state.plan.departures[0].fetched_at');
  live = {...live,error:'Provider blocked request.'};
  await h.run('refreshLive()');
  assert.equal(h.e('live-error').textContent,'Live bike refresh failed. Showing last received counts.');
  assert.equal(h.run('state.plan.departures[0].fetched_at'),stamp);
  assert.match(h.e('station-rows').innerHTML,/stat bikes empty">0</);
  assert.match(h.e('station-rows').innerHTML,/>3 min<.*>8 min<.*>Low</s);
  h.run('invalidateComparison()');
  assert.equal(h.e('live-error').hidden,true);
});

test("immediate availability follows the retained snapshot while future risk and unknown counts stay distinct", () => {
  const h = harness();
  h.station.availability = { observations: 60, zero: 0 };
  for (const [bikes, label] of [
    [0, "Empty now"],
    [1, "Few bikes"],
    [2, "Few bikes"],
    [3, "Available now"],
  ]) {
    h.station.bikes = bikes;
    assert.equal(
      h.run("stationAvailability(fixture.station,state.plan).label"),
      label,
    );
  }
  h.station.bikes = 0;
  h.advance(121000);
  assert.equal(
    h.run("stationAvailability(fixture.station,state.plan).label"),
    "Empty now",
  );
  h.station.bikes = null;
  assert.equal(h.run("stationAvailability(fixture.station,state.plan).label"), "Unknown");
  h.run("state.plan.immediate=false");
  assert.equal(
    h.run("stationAvailability(fixture.station,state.plan).label"),
    "Low",
  );
});

test("time shortcuts are relative to the click time and do not query", () => {
  const h = harness();
  h.run("setPickupOffset(30)");
  assert.equal(h.run("state.pickup"), "2026-09-30T09:30");
  h.advance(600000);
  h.run("setPickupOffset(60)");
  assert.equal(h.run("state.pickup"), "2026-09-30T10:10");
  h.run("setPickupOffset(0)");
  assert.equal(h.run("state.pickup"), "now");
  assert.equal(h.e("pickup").value, "2026-09-30T09:10");
  assert.equal(h.run("state.plan"), null);
});


test("each station shows its own rounded local cycling time and handles missing routes", () => {
  const h = harness();
  h.run('fixture.station.cycling_route={minutes:7.8};state.plan.departures.push({...fixture.station,id:2,cycling_route:{minutes:12.3}});renderResults()');
  assert.match(h.e("station-rows").innerHTML, />8 min<.*>12 min</s);
  h.run('fixture.station.cycling_route={minutes:120.2};renderResults()');
  assert.match(h.e("station-rows").innerHTML, />2h</);
  h.run('fixture.station.cycling_route={error:"Local cycling route unavailable"};renderResults()');
  assert.match(h.e("station-rows").innerHTML, /title="Local cycling route unavailable">—/);
  assert.match(h.e("station-rows").innerHTML, />12 min</);
});

test("walk times are independent of cycling and handle zero and missing routes", () => {
  const h = harness();
  h.run('fixture.station.walking_route={minutes:2.6};fixture.station.cycling_route={minutes:7.8};renderResults()');
  assert.match(h.e("station-rows").innerHTML, /Estimated walk from your starting point at 5.1 km\/h">3 min/);
  assert.match(h.e("station-rows").innerHTML, />8 min</);
  h.run('fixture.station.walking_route={minutes:0};renderResults()');
  assert.match(h.e("station-rows").innerHTML, /5.1 km\/h">0 min/);
  h.run('fixture.station.walking_route={minutes:.2};renderResults()');
  assert.match(h.e("station-rows").innerHTML, /5.1 km\/h">1 min/);
  for (const [minutes, label] of [[60, "60 min"], [60.6, "1h 1min"], [72.4, "1h 12min"]]) {
    h.station.walking_route = {minutes};
    h.run('renderResults()');
    assert.ok(h.e("station-rows").innerHTML.includes(`5.1 km/h">${label}<`));
  }
  h.run('fixture.station.walking_route={error:"Local walking route unavailable"};renderResults()');
  assert.match(h.e("station-rows").innerHTML, /Local walking route unavailable">—/);
  assert.match(h.e("station-rows").innerHTML, />8 min</);
});

test("station popup shows a prefixed number without inventory; choices update pins without comparing", async () => {
  const h = harness(), buttons = {}, requests = [];
  h.document.createElement = () => ({
    innerHTML: "",
    querySelector: selector => buttons[selector] ||= {},
  });
  h.context.fetch = async path => {
    requests.push(path);
    return {ok:true,json:async()=>({label:path.includes('lat=37.5&') ? 'Departure road' : 'Return road',distance_m:5})};
  };
  const popup = h.run('map={closePopup(){},invalidateSize(){}};renderEndpoints=()=>{};renderMapStations=()=>{};state.origin={lat:37.51,lng:127.01};state.destination={lat:37.52,lng:127.02};stationPopup(fixture.station)');
  assert.ok(popup.innerHTML.includes(`>#${h.station.number} · `));
  assert.doesNotMatch(popup.innerHTML, /data-live-station|Live count|\d+ bikes/);
  h.run('fixture.station.bikes=null');
  assert.doesNotMatch(h.run('stationPopup(fixture.station)').innerHTML, /data-live-station|Live count|\d+ bikes/);
  buttons['[data-role=departure]'].onclick();
  await new Promise(setImmediate);
  assert.equal(h.run('state.origin.lat'), h.station.lat);
  assert.equal(h.run('state.origin.lng'), h.station.lng);
  assert.equal(h.run('state.departureId'), h.station.id);
  assert.equal(h.run('state.selectedId'), h.station.id);
  assert.equal(h.e('origin-label').textContent,'Departure road');
  h.run('stationPopup({...fixture.station,id:2,lat:37.6,lng:127.1,name:"Return station"})');
  buttons['[data-role=return]'].onclick();
  await new Promise(setImmediate);
  assert.equal(h.run('state.destination.lat'),37.6);
  assert.equal(h.run('state.destination.lng'),127.1);
  assert.equal(h.run('state.returnId'),2);
  assert.equal(h.e('destination-label').textContent,'Return road');
  assert.equal(h.e('origin-label').textContent,'Departure road');
  assert.equal(h.run('state.plan'),null);
  assert.ok(requests.every(path=>path.startsWith('/api/place-label?')));
});


test("a hanging browser comparison times out and restores the compare control", async () => {
  const h = harness();
  h.run("state.origin={lat:37.5,lng:127};state.destination={lat:37.51,lng:127.01}");
  h.context.window.BikeStatic = {request: (_path, {signal}) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  })};
  const pending = h.run("compare({preventDefault(){}})");
  const timeout = [...h.timers.values()].find(timer => timer.delay === 30000);
  assert.ok(timeout);
  timeout.fn();
  await pending;
  assert.match(h.e('error').textContent, /took too long/);
  assert.equal(h.e('compare-button').disabled, false);
  assert.equal(h.e('results').attributes['aria-busy'], 'false');
  assert.equal(h.run('state.awaitingLive'), false);
});

test("return station and final walk share duration rules and hide when the journey changes", () => {
  const h=harness();
  h.run('state.plan.return_station={id:2,name:"Return <station>",number:"200"};state.plan.destination_label="Road <B>";state.plan.destination_walking_route={minutes:3.6};renderResults()');
  assert.equal(h.e('return-name').textContent,'Return <station>');
  assert.equal(h.e('return-number').textContent,'Station #200');
  assert.equal(h.e('return-destination').textContent,'Road <B>');
  assert.equal(h.e('return-section').hidden,false);
  for(const [minutes,label] of [[3.6,'4 min'],[0,'0 min'],[.2,'1 min'],[72.4,'1h 12min'],[120,'2h'],[-1,'—'],[NaN,'—']]) {
    h.context.finalMinutes=minutes;
    h.run('state.plan.destination_walking_route={minutes:finalMinutes};renderResults()');
    assert.equal(h.e('return-walk-time').textContent,label);
  }
  h.run('state.plan.destination_walking_route={error:"Walking estimate unavailable."};renderResults()');
  assert.equal(h.e('return-walk-time').textContent,'—');
  assert.equal(h.e('return-walk-time').title,'Walking estimate unavailable.');
  h.run('invalidateComparison()');
  assert.equal(h.e('return-section').hidden,true);
});

test("a late destination street label updates only the matching applied destination", async () => {
  const h=harness();
  h.context.fetch=async()=>({ok:true,json:async()=>({label:'Final road',distance_m:5})});
  h.run('state.plan.destination={lat:37.5,lng:127};state.plan.destination_label="Near station";state.labelRequests.destination=1');
  await h.run('lookupPointLabel("destination",{lat:37.5,lng:127},1)');
  assert.equal(h.run('state.plan.destination_label'),'Final road');
  assert.equal(h.e('return-destination').textContent,'Final road');
  h.run('state.plan.destination_label="Applied road";state.plan.destination={lat:37.6,lng:127};state.labelRequests.destination=2');
  await h.run('lookupPointLabel("destination",{lat:37.5,lng:127},2)');
  assert.equal(h.run('state.plan.destination_label'),'Applied road');
});

test('language switches preserve the journey, counts, routes, focus and cached street labels without commands', () => {
  const h = harness();
  let commands = 0;
  h.context.window.BikeStatic.request = () => {commands++; throw new Error('Language change must not query');};
  h.run(`state.origin={lat:37.5,lng:127};state.destination={lat:37.51,lng:127.01};
    state.pickup="2026-10-02T17:30";state.plan.destination={...state.destination};
    state.pointLabels.origin={street:true,label:"Sejong-daero",label_ko:"세종대로",distance_m:5};
    state.pointLabels.destination={street:true,label:"Eulji-ro",label_ko:"을지로",distance_m:50};
    state.plan.departures[0].walking_route={minutes:72};state.plan.departures[0].cycling_route={minutes:20};
    state.plan.destination_walking_route={minutes:4};state.live=state.plan.live;state.view="results";
    renderResults();`);
  const before = h.run('JSON.stringify({origin:state.origin,destination:state.destination,pickup:state.pickup,departures:state.plan.departures,live:state.live,selected:state.selectedId,request:state.request})');
  h.e('pickup').value = '2026-10-02T17:30';
  h.e('language-ko').focus();
  h.e('station-rows').scrollTop = 75;
  h.run('switchLanguage({currentTarget:{dataset:{language:"ko"}},preventDefault(){}})');
  assert.equal(h.context.window.location.pathname, '/ddareungiwhere/ko/');
  assert.equal(h.document.documentElement.lang, 'ko');
  assert.equal(h.e('language-switch').dataset.language, 'ko');
  assert.equal(h.e('language-ko').getAttribute('aria-current'), 'true');
  assert.equal(h.e('language-en').getAttribute('aria-current'), 'false');
  assert.equal(h.e('language-en').href, 'https://example.test/ddareungiwhere/');
  assert.equal(h.e('language-ko').href, 'https://example.test/ddareungiwhere/ko/');
  assert.match(h.e('station-rows').innerHTML, /1시간 12분/);
  assert.match(h.e('station-rows').innerHTML, /최근 조회 현황/);
  assert.match(h.e('station-rows').innerHTML, /직선거리 20 m/);
  assert.equal(h.e('origin-label').textContent, '세종대로');
  assert.equal(h.e('return-destination').textContent, '을지로 근처');
  assert.equal(h.document.activeElement, h.e('language-ko'));
  assert.equal(h.e('station-rows').scrollTop, 75);
  assert.equal(h.e('pickup').value, '2026-10-02T17:30');
  assert.equal(h.run('JSON.stringify({origin:state.origin,destination:state.destination,pickup:state.pickup,departures:state.plan.departures,live:state.live,selected:state.selectedId,request:state.request})'), before);
  h.run('switchLanguage({currentTarget:{dataset:{language:"en"}},preventDefault(){}})');
  assert.equal(h.context.window.location.pathname, '/ddareungiwhere/');
  assert.match(h.e('station-rows').innerHTML, /1h 12min/);
  assert.equal(h.e('return-destination').textContent, 'Near Eulji-ro');
  assert.equal(commands, 0);
});

test('the selected language is a no-op and modified language clicks keep native navigation', () => {
  const h = harness();
  let history = 0, prevented = 0;
  h.context.window.history.pushState = () => {history++;};
  h.context.preventLanguageClick = () => {prevented++;};
  h.run('applyLanguage("en")');
  const writes = h.e('station-rows').writes;
  h.run('switchLanguage({currentTarget:{dataset:{language:"en"}},preventDefault:preventLanguageClick})');
  assert.equal(history, 0);
  assert.equal(prevented, 1);
  assert.equal(h.e('station-rows').writes, writes);
  for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey', 'button']) {
    h.context.languageClick = {currentTarget:{dataset:{language:'ko'}},preventDefault:h.context.preventLanguageClick,[modifier]:modifier === 'button' ? 1 : true};
    h.run('switchLanguage(languageClick)');
  }
  assert.equal(history, 0);
  assert.equal(prevented, 1);
  assert.equal(h.run('state.language'), 'en');
});

test('Korean keeps zero distinct from missing counts and describes archive frequency and receipt time', () => {
  const h = harness();
  h.run('state.live=state.plan.live;state.plan.departures[0].bikes=null;applyLanguage("ko")');
  assert.match(h.e('station-rows').innerHTML, /aria-label="자전거 수를 확인할 수 없음"/);
  assert.match(h.e('station-rows').innerHTML, /알 수 없음/);
  h.run('state.plan.departures[0].bikes=0;renderResults()');
  assert.match(h.e('station-rows').innerHTML, /자전거 없음/);
  h.run('state.plan.immediate=false;state.plan.departures[0].availability={observations:30,zero:0};renderResults()');
  assert.equal(h.e('availability-heading').textContent, '과거 자전거 없음 빈도');
  assert.match(h.e('station-rows').innerHTML, /낮음/);
  assert.match(h.e('fetch-time').textContent, /갱신 완료 .*한국 시간/);
  assert.doesNotMatch(h.e('fetch-time').textContent, /기준/);
  h.run('showError("Choose a pickup time from now through the next seven days (Seoul time).")');
  assert.match(h.e('error').textContent, /한국 시간.*자전거 대여 시각/);
});

test('language can change during comparison and location lookup without canceling either request', async () => {
  const h = harness();
  let finish;
  h.context.window.BikeStatic.request = () => new Promise(resolve => {finish=resolve;});
  h.run('state.origin={lat:37.5,lng:127};state.destination={lat:37.51,lng:127.01};state.live=state.plan.live');
  const pending = h.run('compare({preventDefault(){}})');
  const request = h.run('state.request');
  h.run('switchLanguage({currentTarget:{dataset:{language:"ko"}},preventDefault(){}})');
  assert.equal(h.run('state.request'), request);
  assert.match(h.e('station-rows').innerHTML, /최근 조회 현황/);
  finish({departures:[{...h.station,walking_route:{minutes:5},cycling_route:{minutes:10}}],return_station:h.station,destination:{lat:37.51,lng:127.01},immediate:true,live:{refreshing:false,fetched_at:h.station.fetched_at}});
  await pending;
  assert.match(h.e('station-rows').innerHTML, /5분/);
  let label;
  h.context.window.BikeStatic.request = () => new Promise(resolve => {label=resolve;});
  h.run('state.labelRequests.destination=2');
  const lookup = h.run('lookupPointLabel("destination",state.destination,2)');
  h.run('applyLanguage("en")');
  label({label:'Eulji-ro',label_ko:'을지로',distance_m:5});
  await lookup;
  assert.equal(h.e('destination-label').textContent, 'Eulji-ro');
  h.run('applyLanguage("ko")');
  assert.equal(h.e('destination-label').textContent, '을지로');
});
