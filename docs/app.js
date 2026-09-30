"use strict";
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const state = {
  stations: [],
  history: null,
  origin: null,
  destination: null,
  mode: "origin",
  pickup: "now",
  returnId: null,
  departureId: null,
  selectedId: null,
  plan: null,
  request: 0,
  live: { refreshing: false },
  labelRequests: { origin: 0, destination: 0 },
  locationRequest: 0,
  view: "map",
  awaitingLive: false,
};
let map,
  baseStations,
  candidateMarkers,
  endpointMarkers,
  pollTimer,
  expiryTimer,
  bootstrapRequest;
const departureMarkers = new Map();
const stationMarkers = new Map();
const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const clockTime = (date) => clockFormatter.format(new Date(date));
function localInput(date) {
  return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 16);
}
function distance(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  return (
    12742000 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
            Math.cos(rad(a.lat)) *
              Math.cos(rad(b.lat)) *
              Math.sin(rad(b.lng - a.lng) / 2) ** 2,
        ),
      ),
    )
  );
}
function metres(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${value} m`;
}
function isFresh(station) {
  return (
    station.bikes !== null &&
    station.fetched_at &&
    Date.now() - Date.parse(station.fetched_at) <= 120000
  );
}
async function api(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    if (window.BikeStatic) return await window.BikeStatic.request(path, { signal: controller.signal });
    const response = await fetch(path, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(window.BikeStatic ? "The comparison took too long. Try again." : "The local service took too long. Try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
function showError(message) {
  $("error").textContent = message;
  $("error").hidden = !message;
}
function setMode(mode) {
  showView("map");
  state.mode = mode;
  for (const name of ["origin", "destination"]) {
    $(`set-${name}`).classList.toggle("active", mode === name);
    $(`set-${name}`).setAttribute("aria-pressed", String(mode === name));
  }
  $("map-instruction").textContent =
    mode === "origin"
      ? "Click the map to set your starting point"
      : "Click the map to set your destination";
}
function showView(view) {
  state.view = view;
  $("journey-map").hidden = view !== "map";
  $("results").hidden = view !== "results";
  $("workspace").classList.toggle("show-results", view === "results");
  if (view === "map" && map) map.invalidateSize({ pan: false });
}
function setPoint(type, point, label) {
  if (type === "origin") {
    state.locationRequest++;
    resetLocationButton();
    $("location-status").textContent = "";
  }
  const request = ++state.labelRequests[type];
  state[type] = { lat: point.lat, lng: point.lng };
  if (type === "destination") state.returnId = null;
  else state.departureId = null;
  if (!label) {
    let nearest, nearestDistance = Infinity;
    for (const station of state.stations) {
      const d = distance(station, point);
      if (d < nearestDistance) {
        nearest = station;
        nearestDistance = d;
      }
    }
    label =
      nearest && nearestDistance < 1000
        ? `Near ${nearest.name}`
        : type === "origin"
          ? "Selected starting point"
          : "Selected destination";
  }
  $(`${type}-label`).textContent = label;
  $(`${type}-label`).title = label;
  invalidateComparison();
  renderEndpoints();
  lookupPointLabel(type, point, request);
}
async function lookupPointLabel(type, point, request) {
  try {
    const result = await api(
      `/api/place-label?${new URLSearchParams({ lat: point.lat, lng: point.lng })}`,
    );
    if (state.labelRequests[type] !== request || !result.label) return;
    const label =
      result.distance_m > 35 ? `Near ${result.label}` : result.label;
    $(`${type}-label`).textContent = label;
    $(`${type}-label`).title = `${label} · nearest named street, approximate`;
  } catch (_) {
    // Keep the descriptive station/landmark label if the local lookup fails.
  }
}
function resetLocationButton() {
  $("use-location").disabled = false;
  $("current-location-label").textContent = "Current location";
}
function useCurrentLocation() {
  const request = ++state.locationRequest;
  if (!navigator.geolocation) {
    $("location-status").textContent =
      "Location is unavailable in this browser. Choose your starting point on the map.";
    return;
  }
  $("use-location").disabled = true;
  $("current-location-label").textContent = "Locating…";
  $("location-status").textContent = "";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (request !== state.locationRequest) return;
      resetLocationButton();
      const { latitude: lat, longitude: lng } = position.coords;
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < 37.35 ||
        lat > 37.8 ||
        lng < 126.7 ||
        lng > 127.3
      ) {
        $("location-status").textContent =
          "Your location is outside the Seoul area. Choose your starting point on the map.";
        return;
      }
      setPoint("origin", { lat, lng }, "Your current location");
      $("location-status").textContent = "";
      if (map) map.setView([lat, lng], 16);
      setMode("destination");
    },
    (error) => {
      if (request !== state.locationRequest) return;
      resetLocationButton();
      $("location-status").textContent =
        error.code === 1
          ? "Location permission was denied. You can still choose a starting point on the map."
          : error.code === 3
            ? "Location took too long. Try again or choose a point on the map."
            : "Your location could not be found. Try again or choose a point on the map.";
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
  );
}
function renderEndpoints() {
  if (!map) return;
  endpointMarkers.clearLayers();
  if (state.origin && state.destination) {
    L.polyline(
      [
        [state.origin.lat, state.origin.lng],
        [state.destination.lat, state.destination.lng],
      ],
      {
        color: "#577778",
        weight: 3,
        opacity: 0.8,
        dashArray: "8 7",
        interactive: false,
      },
    ).addTo(endpointMarkers);
  }
  for (const [type, letter] of [
    ["origin", "A"],
    ["destination", "B"],
  ]) {
    const p = state[type];
    if (!p) continue;
    const marker = L.marker([p.lat, p.lng], {
      draggable: true,
      zIndexOffset: 500,
      icon: L.divIcon({
        className: "",
        html: `<div class="map-pin ${type}">${letter}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
      title:
        type === "origin"
          ? "Starting point. Drag to move."
          : "Destination. Drag to move.",
    });
    marker.on("dragend", () => {
      setPoint(type, marker.getLatLng());
    });
    endpointMarkers.addLayer(marker);
  }
}
function fitMap() {
  if (map && state.origin && state.destination)
    map.fitBounds(
      [
        [state.origin.lat, state.origin.lng],
        [state.destination.lat, state.destination.lng],
      ],
      { padding: [60, 60], maxZoom: 16 },
    );
}
function initializeMap() {
  if (!window.L) {
    $("map").innerHTML =
      '<p class="loading">The map library could not load. Try refreshing the page.</p>';
    return;
  }
  map = L.map("map", { preferCanvas: true, scrollWheelZoom: false }).setView(
    [37.56, 126.98],
    14,
  );
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  tiles.on("tileerror", () => {
    $("map-error").hidden = false;
  });
  tiles.on("tileload", () => {
    $("map-error").hidden = true;
  });
  baseStations = L.layerGroup().addTo(map);
  candidateMarkers = L.layerGroup().addTo(map);
  endpointMarkers = L.layerGroup().addTo(map);
  map.on("click", (event) => {
    const type = state.mode;
    setPoint(type, event.latlng);
    if (type === "origin") setMode("destination");
  });
  // Leaflet moves existing markers itself. Replacing them during focus/popup
  // panning can remove the click target before its activation completes.
  map.on("moveend", renderBaseStations);
}
function stationPopup(station) {
  const box = document.createElement("div");
  const fresh = isFresh(station);
  box.innerHTML = `<div class="popup-title">${esc(station.number)} · ${esc(station.name)}</div><div data-live-station="${station.id}">${fresh ? `${station.bikes} bikes now` : "Live count unavailable"}</div><div class="popup-buttons"><button type="button" data-role="departure">Use as departure</button><button type="button" data-role="return">Use as return</button></div>`;
  box.querySelector("[data-role=departure]").onclick = () => {
    setPoint("origin", station, station.name);
    state.departureId = station.id;
    state.selectedId = station.id;
    map.closePopup();
  };
  box.querySelector("[data-role=return]").onclick = () => {
    setPoint("destination", station, station.name);
    state.returnId = station.id;
    map.closePopup();
  };
  return box;
}
function renderBaseStations() {
  if (!map) return;
  const highlighted = new Set((state.plan?.departures || []).map((s) => s.id));
  const bounds = map.getBounds().pad(0.15);
  const visible = new Set();
  for (const station of state.stations) {
    if (
      !bounds.contains([station.lat, station.lng]) ||
      highlighted.has(station.id)
    )
      continue;
    visible.add(station.id);
    const existing = stationMarkers.get(station.id);
    if (existing) {
      const location = existing.getLatLng();
      if (location.lat !== station.lat || location.lng !== station.lng) {
        existing.setLatLng([station.lat, station.lng]);
      }
      continue;
    }
    const marker = L.circleMarker([station.lat, station.lng], {
      radius: 4,
      weight: 1,
      color: "#77888a",
      fillColor: "#a1afb0",
      fillOpacity: 0.8,
    })
      .bindPopup(() =>
        stationPopup(
          state.stations.find((s) => s.id === station.id) || station,
        ),
      )
      .addTo(baseStations);
    stationMarkers.set(station.id, marker);
  }
  for (const [id, marker] of stationMarkers) {
    if (!visible.has(id)) {
      baseStations.removeLayer(marker);
      stationMarkers.delete(id);
    }
  }
}
function renderMapStations() {
  if (!map) return;
  renderBaseStations();
  candidateMarkers.clearLayers();
  departureMarkers.clear();
  (state.plan?.departures || []).forEach((station, index) => {
    const selected = station.id === state.selectedId;
    const marker = L.marker([station.lat, station.lng], {
      zIndexOffset: selected ? 300 : 100,
      title: `${station.number}. ${station.name}`,
      icon: L.divIcon({
        className: "",
        html: `<div class="number-pin ${selected ? "selected" : ""}">${index + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    });
    marker.bindPopup(() => stationPopup(station));
    marker.on("click", () => selectDeparture(station.id, false));
    marker.on("keypress", (event) => {
      if (event.originalEvent.key === "Enter")
        selectDeparture(station.id, false);
    });
    candidateMarkers.addLayer(marker);
    departureMarkers.set(station.id, marker);
  });
  const ret = state.plan?.return_station;
  if (ret)
    L.circleMarker([ret.lat, ret.lng], {
      radius: 9,
      weight: 3,
      color: "#577778",
      fillColor: "#b6c7c7",
      fillOpacity: 1,
    })
      .bindPopup(() => stationPopup(ret))
      .addTo(candidateMarkers);
}
function setNow() {
  state.pickup = "now";
  const n = new Date();
  $("pickup").value = localInput(n);
  $("pickup").min = localInput(n);
  $("pickup").max = localInput(new Date(n.getTime() + 7 * 86400000));
}
function setPickupOffset(minutes) {
  if (minutes === 0) setNow();
  else {
    const current = new Date();
    state.pickup = localInput(new Date(current.getTime() + minutes * 60000));
    $("pickup").value = state.pickup;
    $("pickup").min = localInput(current);
    $("pickup").max = localInput(new Date(current.getTime() + 7 * 86400000));
  }
  invalidateComparison();
}
function renderPopularRoutes(routes) {
  const usable = routes.filter(route =>
    state.stations.some(s => s.id === route.origin) &&
    state.stations.some(s => s.id === route.destination));
  $("popular-journeys").hidden = !usable.length;
  $("popular-route-buttons").innerHTML = usable.map((route, index) => {
    const a = state.stations.find(s => s.id === route.origin);
    const b = state.stations.find(s => s.id === route.destination);
    return `<button type="button" data-popular="${index}" title="${route.rides.toLocaleString('en-GB')} historical rides"><span>${esc(a.name)} → ${esc(b.name)}</span></button>`;
  }).join("");
  document.querySelectorAll("[data-popular]").forEach(button => {
    button.onclick = () => choosePopularRoute(usable[Number(button.dataset.popular)]);
  });
}
function choosePopularRoute(route) {
  const a = state.stations.find(s => s.id === route.origin);
  const b = state.stations.find(s => s.id === route.destination);
  if (!a || !b) return;
  state.departureId = null;
  state.returnId = null;
  state.selectedId = null;
  setPoint("origin", a, a.name);
  setPoint("destination", b, b.name);
  state.departureId = a.id;
  state.returnId = b.id;
  setMode("origin");
  fitMap();
}
function invalidateComparison() {
  state.request++;
  state.plan = null;
  state.awaitingLive = false;
  clearTimeout(pollTimer);
  const incomplete = !state.origin || !state.destination;
  $("compare-button").disabled = incomplete;
  $("fit-map").disabled = incomplete;
  showView("map");
  renderMapStations();
}
async function compare(event) {
  if (event) event.preventDefault();
  if (!state.origin || !state.destination) {
    setMode(state.origin ? "destination" : "origin");
    showError("Choose a starting point and destination on the map.");
    return;
  }
  if (!state.history) await loadBootstrap();
  if (state.pickup === "now") setNow();
  if (!state.origin || !state.destination) return;
  if (event) {
    showView("results");
    $("back-to-map").focus({ preventScroll: true });
  }
  state.awaitingLive = true;
  const request = ++state.request;
  $("results").setAttribute("aria-busy", "true");
  $("compare-button").disabled = true;
  showError("");
  const query = new URLSearchParams({
    origin_lat: state.origin.lat,
    origin_lng: state.origin.lng,
    destination_lat: state.destination.lat,
    destination_lng: state.destination.lng,
    pickup: state.pickup,
    count: 5,
  });
  if (state.returnId !== null) query.set("return", state.returnId);
  if (state.departureId !== null) query.set("departure", state.departureId);
  try {
    const result = await api(`/api/plan?${query}`);
    if (request !== state.request) return;
    state.plan = result;
    if (!result.departures.some((s) => s.id === state.selectedId))
      state.selectedId = result.suggested_id ?? result.departures[0]?.id;
    renderResults();
    renderMapStations();
    renderLive(result.live);
    scheduleExpiry();
  } catch (error) {
    if (request !== state.request) return;
    state.plan = null;
    state.awaitingLive = false;
    renderMapStations();
    showError(error.message);
    $("station-rows").innerHTML =
      '<tr><td colspan="5" class="loading">Update your journey and try again.</td></tr>';
  } finally {
    if (request === state.request) {
      $("results").setAttribute("aria-busy", "false");
      $("compare-button").disabled = !state.origin || !state.destination;
    }
  }
}
function renderLive(live) {
  state.live = live;
  $("refresh-live").disabled = live.refreshing;
  $("refresh-live").textContent = live.refreshing
    ? "↻ Refreshing…"
    : "↻ Refresh bikes";
  if (live.refreshing && state.awaitingLive) {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(() => refreshLive(false), 2000);
  }
}
async function refreshLive(manual = true) {
  if (manual) state.awaitingLive = true;
  if (!state.history) {
    await loadBootstrap();
    return;
  }
  try {
    const response = await api(manual ? "/api/live" : "/api/live?refresh=0");
    state.stations = response.stations;
    renderLive(response.live);
    if (state.plan) {
      const liveById = new Map(response.stations.map((s) => [s.id, s]));
      for (const station of state.plan.departures) {
        const latest = liveById.get(station.id);
        station.bikes = latest?.bikes ?? null;
        station.fetched_at = latest?.fetched_at ?? null;
      }
      state.plan.live = response.live;
      const available = state.plan.immediate
        ? state.plan.departures.filter(
            (s) =>
              isFresh(s) &&
              s.bikes > 0 &&
              s.id !== state.plan.return_station.id,
          )
        : [];
      state.plan.suggested_id = available[0]?.id ?? null;
      renderResults();
    }
    if (!response.live.refreshing) state.awaitingLive = false;
    renderMapStations();
  } catch (error) {
    showError(error.message);
    state.live = { ...state.live, refreshing: false };
    state.awaitingLive = false;
  }
  updateFreshness();
}
function selectDeparture(id, pan = true) {
  state.selectedId = id;
  renderRows();
  for (const [stationId, marker] of departureMarkers) {
    marker
      .getElement()
      ?.querySelector(".number-pin")
      ?.classList.toggle("selected", stationId === id);
    marker.setZIndexOffset(stationId === id ? 300 : 100);
  }
  if (pan) {
    const station = state.plan?.departures.find((s) => s.id === id);
    if (station && map) map.panTo([station.lat, station.lng]);
  }
}
// Descriptive archive heuristic, not a calibrated chance of an empty station.
// Use each station's own dates so adding a candidate cannot change its rating.
function historicalRisk(availability) {
  const { observations: n, zero } = availability || {};
  if (
    !Number.isInteger(n) ||
    n < 20 ||
    !Number.isInteger(zero) ||
    zero < 0 ||
    zero > n
  )
    return { level: "unknown", label: "Unknown" };
  const share = zero / n;
  if (share >= 0.2)
    return { level: "high", label: "High" };
  if (share >= 0.05)
    return {
      level: "moderate",
      label: "Moderate",
    };
  return { level: "low", label: "Low" };
}
function stationAvailability(station, plan) {
  if (!plan.immediate) return historicalRisk(station.availability);
  if (!isFresh(station)) return { level: "unknown", label: "Unknown" };
  if (station.bikes === 0) return { level: "high", label: "Empty now" };
  if (station.bikes <= 2) return { level: "moderate", label: "Few bikes" };
  return { level: "low", label: "Available now" };
}
function renderRows() {
  const data = state.plan;
  if (!data) return;
  const focusedStation = document.activeElement?.dataset?.select;
  $("station-rows").innerHTML = data.departures
    .map((station, index) => {
      const risk = stationAvailability(station, data),
        fresh = isFresh(station);
      const route = station.cycling_route;
      const rideTime = Number.isFinite(route?.minutes) && route.minutes > 0
        ? `${Math.max(1, Math.round(route.minutes))} min`
        : "—";
      const walk = station.walking_route;
      const walkTime = Number.isFinite(walk?.minutes) && walk.minutes >= 0
        ? `${walk.minutes === 0 ? 0 : Math.max(1, Math.round(walk.minutes))} min`
        : "—";
      const selected = station.id === state.selectedId;
      return `<tr class="${selected ? "chosen" : ""}" data-station="${station.id}">
      <td><div class="station-cell"><span class="station-rank">${index + 1}</span><div><button class="station-name" type="button" data-select="${station.id}" aria-pressed="${selected}">${esc(station.name)}</button><span class="station-sub">Station #${esc(station.number)} · ${metres(station.distance_m)} away${index === 0 ? '<span class="small-tag">Nearest</span>' : ""}${fresh && station.bikes > 0 && data.suggested_id === station.id ? '<span class="small-tag">Bikes now</span>' : ""}</span></div></div></td>
      <td data-heading="Bikes now">${fresh ? `<span class="stat bikes ${station.bikes === 0 ? "empty" : station.bikes <= 2 ? "few" : ""}">${station.bikes}</span>` : `<span class="stat unknown" title="Live count unavailable">—</span>`}</td>
      <td data-heading="Est. walk time" class="ride-duration" title="${esc(walk?.error || "Estimated walk from your starting point at 5.1 km/h")}">${walkTime}</td>
      <td data-heading="Est. ride time" class="ride-duration" title="${esc(route?.error || "Estimated cycling time to the return station")}">${rideTime}</td>
      <td data-heading="${data.immediate ? "Availability now" : "Historical no-bike risk"}"><span class="risk-badge risk-${risk.level}">${risk.label}</span></td>
      </tr>`;
    })
    .join("");
  document
    .querySelectorAll("[data-select]")
    .forEach(
      (button) =>
        (button.onclick = () => selectDeparture(Number(button.dataset.select))),
    );
  if (focusedStation)
    document
      .querySelector(`[data-select="${focusedStation}"]`)
      ?.focus({ preventScroll: true });
}
function renderResults() {
  const data = state.plan;
  if (!data) return;
  $("availability-heading").textContent = data.immediate
    ? "Availability now"
    : "Historical no-bike risk";
  $("fetch-time").textContent = data.live.fetched_at
    ? `Live refresh completed ${clockTime(data.live.fetched_at)} KST`
    : "Live counts unavailable · History remains usable";
  renderRows();
}
// Expire displayed reports even when the next network request fails or hangs.
function scheduleExpiry() {
  clearTimeout(expiryTimer);
  const reports = [...state.stations, ...(state.plan?.departures || [])];
  const expiries = reports
    .filter(isFresh)
    .map((s) => Date.parse(s.fetched_at) + 120001);
  if (expiries.length)
    expiryTimer = setTimeout(
      updateFreshness,
      Math.max(1, Math.min(...expiries) - Date.now()),
    );
}
function updateFreshness() {
  renderRows();
  renderLive(state.live);
  document.querySelectorAll("[data-live-station]").forEach((node) => {
    const id = Number(node.dataset.liveStation);
    const station = state.stations.find((s) => s.id === id);
    node.textContent =
      station && isFresh(station)
        ? `${station.bikes} bikes now`
        : "Live count unavailable";
  });
  scheduleExpiry();
}
async function loadBootstrap() {
  if (bootstrapRequest) return bootstrapRequest;
  bootstrapRequest = (async () => {
    try {
      const data = await api("/api/bootstrap");
      state.stations = data.stations;
      state.history = data.history;
      renderPopularRoutes(data.popular_routes || []);
      showError("");
      renderLive(data.live);
      scheduleExpiry();
      invalidateComparison();
    } catch (error) {
      showError(error.message);
      $("results").setAttribute("aria-busy", "false");
    }
  })();
  try {
    await bootstrapRequest;
  } finally {
    bootstrapRequest = null;
  }
}
async function start() {
  initializeMap();
  setNow();
  $("set-origin").onclick = () => setMode("origin");
  $("use-location").onclick = useCurrentLocation;
  $("set-destination").onclick = () => setMode("destination");
  $("fit-map").onclick = fitMap;
  $("planner-form").onsubmit = compare;
  $("back-to-map").onclick = () => {
    showView("map");
    $("compare-button").focus({ preventScroll: true });
  };
  $("now-button").onclick = () => setPickupOffset(0);
  $("plus-30").onclick = () => setPickupOffset(30);
  $("plus-60").onclick = () => setPickupOffset(60);
  $("pickup").onchange = () => {
    state.pickup = $("pickup").value;
    invalidateComparison();
  };
  $("refresh-live").onclick = () => refreshLive();
  await loadBootstrap();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateFreshness();
  });
}
start();
