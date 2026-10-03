"use strict";
const $ = (id) => document.getElementById(id);
// The static build embeds the catalog here, adding no translation request.
const korean = /*__KOREAN_TRANSLATIONS__*/ {};
function t(message, values = {}) {
  const text = state.language === "ko" ? korean[message] || message : message;
  return text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
function translatedError(message) {
  return state.language === "ko" && message && !korean[message]
    ? t("Something went wrong. Please try again.") : t(message || "");
}
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const state = {
  language: /\/ko\/(?:index\.html)?$/.test(window.location?.pathname || "") ? "ko" : "en",
  pointLabels: {},
  errorMessage: "",
  locationStatus: "",
  comparisonMessage: "",
  stations: [],
  bootstrapReady: false,
  stationLoading: false,
  stationError: "",
  // Points and pickup are a draft; only Compare stations creates an applied plan.
  origin: null,
  destination: null,
  mode: "origin",
  pickup: "now",
  returnId: null,
  departureId: null,
  selectedId: null,
  plan: null,
  // Reject late replies even when a canceled provider ignores its abort signal.
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
  bootstrapRequest,
  comparisonController,
  tileCredit;
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
  const age = Date.now() - Date.parse(station.fetched_at);
  // Freshness limits suggestions only; displayed snapshots never expire.
  return hasBikeCount(station) && age >= -60000 && age <= 120000;
}
function hasBikeCount(station) {
  return Number.isInteger(station?.bikes) && station.bikes >= 0 &&
    Number.isFinite(Date.parse(station.fetched_at));
}
async function api(path, { signal } = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 30000);
  try {
    // Local browser commands; these paths are never HTTP API requests.
    return await window.BikeStatic.request(path, { signal: controller.signal });
  } catch (error) {
    if (timedOut)
      throw new Error("The comparison took too long. Try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
function showError(message) {
  state.errorMessage = message;
  $("error").textContent = translatedError(message);
  $("error").hidden = !message;
}
function renderStationStatus() {
  $("station-data-status").hidden = !state.stationLoading && !state.stationError;
  $("station-data-message").textContent = state.stationLoading
    ? t("Loading stations…") : translatedError(state.stationError);
  $("retry-stations").hidden = !state.stationError;
  $("retry-stations").disabled = state.stationLoading;
}
function setLocationStatus(message) {
  state.locationStatus = message;
  $("location-status").textContent = t(message);
}
function languageURL(language) {
  const current = new URL(window.location?.href || "http://localhost/");
  const base = window.BikeStatic?.base?.pathname || current.pathname.replace(/(?:ko\/)?(?:index\.html)?$/, "");
  current.pathname = `${base}${language === "ko" ? "ko/" : ""}`;
  return current;
}
function updatePointLabel(type, point = state[type]) {
  const value = state.pointLabels[type];
  let label;
  if (value?.street) {
    const name = state.language === "ko" ? value.label_ko || value.label : value.label;
    label = value.distance_m > 35 ? t("Near {name}", { name }) : name;
  } else if (value?.near) label = t("Near {name}", { name: value.near });
  else label = value?.message ? t(value.message) : value?.name ||
    t(type === "origin" ? "Choose starting point" : "Choose destination");
  $(`${type}-label`).textContent = label;
  $(`${type}-label`).title = value?.street
    ? t("{label} · nearest named street, approximate", { label }) : label;
  if (type === "destination" && point && state.plan?.destination?.lat === point.lat && state.plan.destination.lng === point.lng)
    state.plan.destination_label = label;
}
function renderComparisonMessage(message) {
  state.comparisonMessage = message;
  $("station-rows").innerHTML = `<tr><td colspan="5" class="loading">${esc(t(message))}</td></tr>`;
}
function updateRefreshButton() {
  $("refresh-live").textContent = t(state.live.refreshing ? "↻ Refreshing…" : "↻ Refresh bikes");
}
function applyLanguage(language) {
  state.language = language === "ko" ? "ko" : "en";
  document.documentElement.lang = state.language;
  document.querySelectorAll("[data-i18n]").forEach(node => {
    node.textContent = t(node.getAttribute("data-i18n"));
  });
  for (const attribute of ["aria-label", "content"]) {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(node =>
      node.setAttribute(attribute, t(node.getAttribute(`data-i18n-${attribute}`))));
  }
  const next = state.language === "ko" ? "en" : "ko";
  const link = $("language-switch");
  link.dataset.language = state.language;
  link.href = languageURL(next).href;
  link.lang = next;
  link.hreflang = next;
  link.setAttribute("aria-label", t(next === "ko" ? "Switch to Korean" : "Switch to English"));
  $("home-link").href = languageURL(state.language).href;
  $("canonical-url").href = `https://bttlbmb.github.io/ddareungiwhere/${state.language === "ko" ? "ko/" : ""}`;
  for (const type of ["origin", "destination"]) updatePointLabel(type);
  $("current-location-label").textContent = t($("use-location").disabled ? "Locating…" : "Current location");
  setLocationStatus(state.locationStatus);
  showError(state.errorMessage);
  renderStationStatus();
  updateMapInstruction();
  updateRefreshButton();
  if (state.plan) renderResults();
  else if (state.comparisonMessage) {
    renderComparisonMessage(state.comparisonMessage);
    $("availability-heading").textContent = t("Availability");
  }
  // Update existing markers and controls without recreating or moving the map.
  endpointMarkers?.eachLayer(marker => {
    if (marker.pointType) {
      const title = t(marker.pointType === "origin" ? "Starting point. Drag to move." : "Destination. Drag to move.");
      marker.getElement()?.setAttribute("title", title);
      marker.getElement()?.setAttribute("aria-label", title);
    }
  });
  if (map?.attributionControl) {
    const credit = osmAttribution();
    if (credit !== tileCredit) {
      map.attributionControl.removeAttribution(tileCredit);
      map.attributionControl.addAttribution(credit);
      tileCredit = credit;
    }
  }
  translatePopupClose();
  const zoom = map?.zoomControl;
  if (zoom) {
    for (const [button, message] of [[zoom._zoomInButton, "Zoom in"], [zoom._zoomOutButton, "Zoom out"]]) {
      button?.setAttribute("title", t(message));
      button?.setAttribute("aria-label", t(message));
    }
  }
  syncMapSize();
}
function switchLanguage(event) {
  if (event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const next = state.language === "ko" ? "en" : "ko";
  window.history.pushState(null, "", languageURL(next));
  applyLanguage(next);
}
function setMode(mode) {
  showView("map");
  state.mode = mode;
  for (const name of ["origin", "destination"]) {
    $(`set-${name}`).classList.toggle("active", mode === name);
    $(`set-${name}`).setAttribute("aria-pressed", String(mode === name));
  }
  updateMapInstruction();
}
function syncMapSize() {
  if (state.view !== "map" || !map) return;
  const size = map.getSize(), container = $("map");
  if (!container.clientWidth || !container.clientHeight) return;
  if (size.x !== container.clientWidth || size.y !== container.clientHeight) {
    map.invalidateSize({ pan: false });
    if (state.bootstrapReady) renderBaseStations();
  }
}
function updateMapInstruction() {
  const origin = state.mode === "origin";
  const keyboard = document.activeElement === $("map") &&
    $("map").matches(":focus-visible");
  $("map-instruction").textContent = keyboard
    ? t(origin ? "Use arrow keys to move the map. Press Enter to set your starting point." : "Use arrow keys to move the map. Press Enter to set your destination.")
    : t(origin ? "Click the map to set your starting point" : "Click the map to set your destination");
  syncMapSize();
}
function chooseMapPoint(point) {
  const type = state.mode;
  setPoint(type, point);
  if (type === "origin") setMode("destination");
  else updateMapInstruction();
}
function handleMapKeydown(event) {
  // Ignore keys from station pins, popup buttons and Leaflet controls.
  if (event.target !== $("map")) return;
  updateMapInstruction();
  if (event.key !== "Enter" || event.repeat || event.isComposing || !map) return;
  event.preventDefault();
  // Freeze an arrow-key pan before reading its visible center.
  map.stop();
  chooseMapPoint(map.getCenter());
}
function configureMapKeyboard() {
  const container = $("map");
  container.onfocus = updateMapInstruction;
  container.onblur = updateMapInstruction;
  container.onkeydown = handleMapKeydown;
}
function showView(view) {
  state.view = view;
  $("journey-map").hidden = view !== "map";
  $("results").hidden = view !== "results";
  $("workspace").classList.toggle("show-results", view === "results");
  document.body?.classList.toggle("results-view", view === "results");
  syncMapSize();
}
function setPoint(type, point, label) {
  if (type === "origin") {
    state.locationRequest++;
    resetLocationButton();
    setLocationStatus("");
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
    state.pointLabels[type] = nearest && nearestDistance < 1000
      ? { near: nearest.name }
      : { message: type === "origin" ? "Selected starting point" : "Selected destination" };
  } else {
    state.pointLabels[type] = label === "Your current location"
      ? { message: label } : { name: label };
  }
  updatePointLabel(type);
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
    state.pointLabels[type] = { ...result, street: true };
    updatePointLabel(type, point);
    if (type === "destination" && state.plan?.destination?.lat === point.lat && state.plan.destination.lng === point.lng)
      $("return-destination").textContent = state.plan.destination_label;
  } catch (_) {
    // Keep the descriptive station/landmark label if the local lookup fails.
  }
}
function resetLocationButton() {
  $("use-location").disabled = false;
  $("current-location-label").textContent = t("Current location");
}
function useCurrentLocation() {
  const request = ++state.locationRequest;
  if (!navigator.geolocation) {
    setLocationStatus("Location is unavailable in this browser. Choose your starting point on the map.");
    return;
  }
  $("use-location").disabled = true;
  $("current-location-label").textContent = t("Locating…");
  setLocationStatus("");
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
        setLocationStatus("Your location is outside the Seoul area. Choose your starting point on the map.");
        return;
      }
      setPoint("origin", { lat, lng }, "Your current location");
      setLocationStatus("");
      if (map) map.setView([lat, lng], 16);
      setMode("destination");
    },
    (error) => {
      if (request !== state.locationRequest) return;
      resetLocationButton();
      setLocationStatus(error.code === 1
          ? "Location permission was denied. You can still choose a starting point on the map."
          : error.code === 3
            ? "Location took too long. Try again or choose a point on the map."
            : "Your location could not be found. Try again or choose a point on the map.");
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
        html: `<div class="map-pin">${letter}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
      title:
        type === "origin"
          ? t("Starting point. Drag to move.")
          : t("Destination. Drag to move."),
    });
    marker.pointType = type;
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
      `<p class="loading" data-i18n="The map library could not load. Try refreshing the page.">${esc(t("The map library could not load. Try refreshing the page."))}</p>`;
    throw new Error("The map library could not load. Try refreshing the page.");
  }
  const options = { preferCanvas: true, scrollWheelZoom: true };
  // Preserve the dots while making nearby taps easier on touch screens.
  if (L.canvas && window.matchMedia?.("(pointer: coarse)").matches)
    options.renderer = L.canvas({ tolerance: 12 });
  map = L.map("map", options).setView(
    [37.56, 126.98],
    14,
  );
  configureMapKeyboard();
  tileCredit = osmAttribution();
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: tileCredit,
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
    chooseMapPoint(event.latlng);
  });
  // Leaflet moves existing markers itself. Replacing them during focus/popup
  // panning can remove the click target before its activation completes.
  map.on("moveend", renderBaseStations);
  map.on("popupopen", translatePopupClose);
  if (typeof ResizeObserver === "function")
    new ResizeObserver(syncMapSize).observe($("map"));
  updateMapInstruction();
}
function translatePopupClose() {
  document.querySelectorAll(".leaflet-popup-close-button").forEach(button =>
    button.setAttribute("aria-label", t("Close popup")));
}
function osmAttribution() {
  return `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ${t("contributors")}`;
}
function stationPopup(station) {
  const box = document.createElement("div");
  box.innerHTML = `<div class="popup-title">#${esc(station.number)} · ${esc(station.name)}</div><div class="popup-buttons"><button type="button" data-role="departure" data-i18n="Use as departure">${esc(t("Use as departure"))}</button><button type="button" data-role="return" data-i18n="Use as destination">${esc(t("Use as destination"))}</button></div>`;
  box.querySelector("[data-role=departure]").onclick = () => {
    setPoint("origin", station, station.name);
    state.departureId = station.id;
    state.selectedId = station.id;
    map.closePopup();
    if (!state.destination) setMode("destination");
  };
  box.querySelector("[data-role=return]").onclick = () => {
    setPoint("destination", station, station.name);
    state.returnId = station.id;
    map.closePopup();
  };
  return box;
}
function stationMarkerStyle(radius = 5.5, weight = 1.5) {
  const colors = getComputedStyle($("map"));
  return {radius, weight,
    color: colors.getPropertyValue("--bike-good").trim(),
    fillColor: colors.getPropertyValue("--bike-good-soft").trim(),
    fillOpacity: 1};
}
function renderBaseStations() {
  if (!map) return;
  const highlighted = new Set((state.plan?.departures || []).map((s) => s.id));
  const bounds = map.getBounds().pad(0.15);
  const visible = new Set();
  const markerStyle = stationMarkerStyle();
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
    const marker = L.circleMarker([station.lat, station.lng], markerStyle)
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
      title: `#${station.number} · ${station.name}`,
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
    L.circleMarker([ret.lat, ret.lng], stationMarkerStyle(9, 3))
      .bindPopup(() => stationPopup(ret))
      .addTo(candidateMarkers);
}
function updatePickupBounds(n = new Date()) {
  $("pickup").min = localInput(n);
  $("pickup").max = localInput(new Date(n.getTime() + 7 * 86400000));
}
function setNow() {
  state.pickup = "now";
  const n = new Date();
  $("pickup").value = localInput(n);
  updatePickupBounds(n);
}
function syncPickupClock() {
  if (state.pickup === "now") setNow();
  else updatePickupBounds();
}
function setPickupOffset(minutes) {
  if (minutes === 0) setNow();
  else {
    const current = new Date();
    state.pickup = localInput(new Date(current.getTime() + minutes * 60000));
    $("pickup").value = state.pickup;
    updatePickupBounds(current);
  }
  invalidateComparison();
}
function invalidateComparison() {
  state.request++;
  comparisonController?.abort();
  comparisonController = null;
  state.plan = null;
  state.comparisonMessage = "";
  $("results").setAttribute("aria-busy", "false");
  showError("");
  $("return-section").hidden = true;
  $("results-footer").hidden = true;
  $("live-error").hidden = true;
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
  if (!state.bootstrapReady) {
    const draftRequest = state.request;
    await loadBootstrap();
    // Successful station recovery invalidates once. Any additional change is
    // a newer draft that requires its own explicit comparison.
    if (!state.bootstrapReady || state.request !== draftRequest + 1) return;
  }
  syncPickupClock();
  if (!state.origin || !state.destination) return;
  if (event) {
    showView("results");
    $("back-to-map").focus({ preventScroll: true });
  }
  state.awaitingLive = true;
  const request = ++state.request;
  comparisonController?.abort();
  const controller = new AbortController();
  comparisonController = controller;
  state.plan = null;
  clearTimeout(pollTimer);
  renderMapStations();
  $("results").setAttribute("aria-busy", "true");
  renderComparisonMessage("Preparing your station comparison…");
  $("fetch-time").textContent = "";
  $("availability-heading").textContent = t("Availability");
  $("return-section").hidden = true;
  $("results-footer").hidden = true;
  $("live-error").hidden = true;
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
    const result = await api(`/api/plan?${query}`, { signal: controller.signal });
    if (request !== state.request) return;
    state.plan = result;
    state.comparisonMessage = "";
    result.destination_label = $("destination-label").textContent;
    if (!result.departures.some((s) => s.id === state.selectedId))
      state.selectedId = result.suggested_id ?? result.departures[0]?.id;
    renderResults();
    renderMapStations();
    renderLive(result.live);
  } catch (error) {
    if (request !== state.request) return;
    state.plan = null;
    state.awaitingLive = false;
    renderMapStations();
    showError(error.message);
    renderComparisonMessage("Update your journey and try again.");
  } finally {
    if (comparisonController === controller) comparisonController = null;
    if (request === state.request) {
      $("results").setAttribute("aria-busy", "false");
      $("compare-button").disabled = !state.origin || !state.destination;
    }
  }
}
function renderLive(live) {
  state.live = live;
  $("refresh-live").disabled = live.refreshing;
  updateRefreshButton();
  renderLiveError(live);
  if (live.refreshing && state.awaitingLive) {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(() => refreshLive(false), 2000);
  }
}
function renderLiveError(live) {
  const message = $("live-error");
  const failed = state.plan && live.error && !live.refreshing;
  message.hidden = !failed;
  message.textContent = failed
    ? state.plan.departures.some(hasBikeCount)
      ? t("Live bike refresh failed. Showing last received counts.")
      : t("Live bike counts unavailable. Some networks may be restricted.")
    : "";
}
async function refreshLive(manual = true) {
  if (manual) state.awaitingLive = true;
  if (!state.bootstrapReady) {
    await loadBootstrap();
    return;
  }
  const request = state.request;
  try {
    const response = await api(manual ? "/api/live" : "/api/live?refresh=0");
    if (request !== state.request) return;
    state.stations = response.stations;
    if (state.plan) {
      const liveById = new Map(response.stations.map((s) => [s.id, s]));
      for (const station of state.plan.departures) {
        const latest = liveById.get(station.id);
        station.bikes = latest?.bikes ?? null;
        station.fetched_at = latest?.fetched_at ?? null;
      }
      state.plan.live = response.live;
      state.plan.suggested_id = state.plan.immediate
        ? state.plan.departures.find(
            (s) =>
              isFresh(s) &&
              s.bikes > 0 &&
              s.id !== state.plan.return_station.id,
          )?.id ?? null
        : null;
      renderResults();
    }
    if (!response.live.refreshing) state.awaitingLive = false;
    renderLive(response.live);
    renderMapStations();
  } catch (error) {
    if (request !== state.request) return;
    state.live = { ...state.live, refreshing: false, error: error.message };
    if (state.plan) {
      state.plan.live = state.live;
      renderResults();
    } else showError(error.message);
    state.awaitingLive = false;
    renderLive(state.live);
  }
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
    return { level: "unknown", label: t("Unknown") };
  const share = zero / n;
  if (share >= 0.2)
    return { level: "high", label: t("High") };
  if (share >= 0.05)
    return {
      level: "moderate",
      label: t("Moderate"),
    };
  return { level: "low", label: t("Low") };
}
function stationAvailability(station, plan) {
  if (!plan.immediate) return historicalRisk(station.availability);
  if (!hasBikeCount(station)) return { level: "unknown", label: t("Unknown") };
  if (station.bikes === 0) return { level: "high", label: t("Empty now") };
  if (station.bikes <= 2) return { level: "moderate", label: t("Few bikes") };
  return { level: "low", label: t("Available now") };
}
function formatDuration(minutes) {
  const rounded = minutes === 0 ? 0 : Math.max(1, Math.round(minutes));
  if (rounded <= 60) return t("{minutes} min", { minutes: rounded });
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return t(remainder ? "{hours}h {minutes}min" : "{hours}h", { hours, minutes: remainder });
}
function renderRows() {
  const data = state.plan;
  if (!data) return;
  const focusedStation = document.activeElement?.dataset?.select;
  $("station-rows").innerHTML = data.departures
    .map((station, index) => {
      const risk = stationAvailability(station, data),
        known = hasBikeCount(station);
      const route = station.cycling_route;
      const rideTime = Number.isFinite(route?.minutes) && route.minutes > 0
        ? formatDuration(route.minutes)
        : "—";
      const walk = station.walking_route;
      const walkTime = Number.isFinite(walk?.minutes) && walk.minutes >= 0
        ? formatDuration(walk.minutes)
        : "—";
      const selected = station.id === state.selectedId;
      return `<tr class="${selected ? "chosen" : ""}" data-station="${station.id}">
      <td><div class="station-cell"><span class="station-rank">${index + 1}</span><div><button class="station-name" type="button" data-select="${station.id}" aria-pressed="${selected}"><span class="station-title">${esc(station.name)}</span><span class="station-sub">${esc(t("Station #{number} · {distance} away", { number: station.number, distance: metres(station.distance_m) }))}</span></button></div></div></td>
      <td data-heading="${esc(t("Bikes"))}">${known ? `<span class="stat bikes ${station.bikes === 0 ? "empty" : station.bikes <= 2 ? "few" : ""}">${station.bikes}</span>` : `<span class="stat unknown" title="${esc(t("Live count unavailable"))}" role="img" aria-label="${esc(t("Live bike count unavailable"))}">/</span>`}</td>
      <td data-heading="${esc(t("Walk time"))}" class="ride-duration" title="${esc(walk?.error ? translatedError(walk.error) : t("Estimated walk from your starting point at 5.1 km/h"))}"><span class="metric-label">${esc(t("Walk"))} </span>${walkTime}</td>
      <td data-heading="${esc(t("Ride time"))}" class="ride-duration" title="${esc(route?.error ? translatedError(route.error) : t("Estimated cycling time to the destination station"))}"><span class="metric-label">${esc(t("Ride"))} </span>${rideTime}</td>
      <td data-heading="${esc(t(data.immediate ? "Availability now" : "Historical no-bike risk"))}">${data.immediate ? "" : `<span class="metric-label">${esc(t("Historical risk"))} </span>`}<span class="risk-badge risk-${risk.level}">${risk.label}</span></td>
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
  $("results-footer").hidden = false;
  $("availability-heading").textContent = data.immediate
    ? t("Availability now")
    : t("Historical no-bike risk");
  $("fetch-time").textContent = data.live.fetched_at
    ? t("Live refresh completed {time} KST", { time: clockTime(data.live.fetched_at) })
    : data.live.refreshing ? t("Fetching bike counts") : "";
  renderRows();
  renderLiveError(data.live);
  const station = data.return_station, walk = data.destination_walking_route;
  $("return-name").textContent = station.name;
  $("return-number").textContent = t("Station #{number}", { number: station.number });
  $("return-walk-time").textContent = Number.isFinite(walk?.minutes) && walk.minutes >= 0
    ? formatDuration(walk.minutes) : "—";
  $("return-walk-time").title = walk?.error ? translatedError(walk.error) : t("Estimated walk from the destination station to your selected point at 5.1 km/h");
  $("return-destination").textContent = data.destination_label || t("Chosen point");
  $("return-section").hidden = false;
}
async function loadBootstrap() {
  if (bootstrapRequest) return bootstrapRequest;
  state.stationLoading = true;
  renderStationStatus();
  bootstrapRequest = (async () => {
    try {
      const data = await api("/api/bootstrap");
      state.stations = data.stations;
      state.bootstrapReady = true;
      state.stationError = "";
      showError("");
      renderLive(data.live);
      invalidateComparison();
    } catch (error) {
      state.stationError = error.message;
      $("results").setAttribute("aria-busy", "false");
    } finally {
      state.stationLoading = false;
      renderStationStatus();
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
  applyLanguage(state.language);
  $("language-switch").onclick = switchLanguage;
  window.addEventListener("popstate", () => applyLanguage(/\/ko\/(?:index\.html)?$/.test(window.location.pathname) ? "ko" : "en"));
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
    updatePickupBounds();
    invalidateComparison();
  };
  $("pickup").onfocus = syncPickupClock;
  $("refresh-live").onclick = () => refreshLive();
  $("retry-stations").onclick = () => loadBootstrap();
  await loadBootstrap();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncPickupClock();
  });
}
window.BikeAppReady = start();
