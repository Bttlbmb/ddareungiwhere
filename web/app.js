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
  bootstrapRequest,
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
  return (
    station.bikes !== null &&
    station.fetched_at &&
    Date.now() - Date.parse(station.fetched_at) <= 120000
  );
}
function hasBikeCount(station) {
  return Number.isInteger(station?.bikes) && station.bikes >= 0 &&
    Number.isFinite(Date.parse(station.fetched_at));
}
async function api(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    // Local browser commands; these paths are never HTTP API requests.
    return await window.BikeStatic.request(path, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("The comparison took too long. Try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
function showError(message) {
  state.errorMessage = message;
  $("error").textContent = translatedError(message);
  $("error").hidden = !message;
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
  link.href = languageURL(next).href;
  link.textContent = next === "ko" ? "한국어" : "English";
  link.lang = next;
  link.hreflang = next;
  link.setAttribute("aria-label", t(next === "ko" ? "Switch to Korean" : "Switch to English"));
  $("home-link").href = languageURL(state.language).href;
  $("canonical-url").href = `https://bttlbmb.github.io/ddareungiwhere/${state.language === "ko" ? "ko/" : ""}`;
  for (const type of ["origin", "destination"]) updatePointLabel(type);
  $("current-location-label").textContent = t($("use-location").disabled ? "Locating…" : "Current location");
  setLocationStatus(state.locationStatus);
  showError(state.errorMessage);
  if (typeof updateMapInstruction === "function") updateMapInstruction();
  else $("map-instruction").textContent = t(state.mode === "origin"
    ? "Click the map to set your starting point" : "Click the map to set your destination");
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
}
function switchLanguage(event) {
  if (event && (event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
  event?.preventDefault();
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
  $("map-instruction").textContent = t(mode === "origin"
    ? "Click the map to set your starting point" : "Click the map to set your destination");
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
        html: `<div class="map-pin ${type}">${letter}</div>`,
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
    return;
  }
  map = L.map("map", { preferCanvas: true, scrollWheelZoom: true }).setView(
    [37.56, 126.98],
    14,
  );
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
    const type = state.mode;
    setPoint(type, event.latlng);
    if (type === "origin") setMode("destination");
  });
  // Leaflet moves existing markers itself. Replacing them during focus/popup
  // panning can remove the click target before its activation completes.
  map.on("moveend", renderBaseStations);
  map.on("popupopen", translatePopupClose);
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
function invalidateComparison() {
  state.request++;
  state.plan = null;
  state.comparisonMessage = "";
  $("return-section").hidden = true;
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
  $("return-section").hidden = true;
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
    const result = await api(`/api/plan?${query}`);
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
    state.live = { ...state.live, refreshing: false, error: error.message };
    if (state.plan) {
      state.plan.live = state.live;
      renderResults();
    } else showError(error.message);
    state.awaitingLive = false;
  }
  updateLiveDisplay();
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
      <td><div class="station-cell"><span class="station-rank">${index + 1}</span><div><button class="station-name" type="button" data-select="${station.id}" aria-pressed="${selected}">${esc(station.name)}</button><span class="station-sub">${esc(t("Station #{number} · {distance} away", { number: station.number, distance: metres(station.distance_m) }))}</span></div></div></td>
      <td data-heading="${esc(t("Bikes"))}">${known ? `<span class="stat bikes ${station.bikes === 0 ? "empty" : station.bikes <= 2 ? "few" : ""}">${station.bikes}</span>` : `<span class="stat unknown" title="${esc(t("Live count unavailable"))}" role="img" aria-label="${esc(t("Live bike count unavailable"))}">/</span>`}</td>
      <td data-heading="${esc(t("Walk time"))}" class="ride-duration" title="${esc(walk?.error ? translatedError(walk.error) : t("Estimated walk from your starting point at 5.1 km/h"))}">${walkTime}</td>
      <td data-heading="${esc(t("Ride time"))}" class="ride-duration" title="${esc(route?.error ? translatedError(route.error) : t("Estimated cycling time to the destination station"))}">${rideTime}</td>
      <td data-heading="${esc(t(data.immediate ? "Availability now" : "Historical no-bike risk"))}"><span class="risk-badge risk-${risk.level}">${risk.label}</span></td>
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
function updateLiveDisplay() {
  renderRows();
  renderLive(state.live);
}
async function loadBootstrap() {
  if (bootstrapRequest) return bootstrapRequest;
  bootstrapRequest = (async () => {
    try {
      const data = await api("/api/bootstrap");
      state.stations = data.stations;
      state.history = data.history;
      showError("");
      renderLive(data.live);
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
    invalidateComparison();
  };
  $("refresh-live").onclick = () => refreshLive();
  await loadBootstrap();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateLiveDisplay();
  });
}
start();
