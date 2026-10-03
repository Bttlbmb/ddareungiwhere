import {StaticService} from './service.mjs?v=91042991f1612db2';
import {fetchJSON, timeoutSignal} from './data.mjs?v=91042991f1612db2';

const base = new URL('../', import.meta.url);
base.search = new URL(import.meta.url).search;
try {
  const configUrl = new URL('config.json', base);
  configUrl.search = base.search;
  const config = await fetchJSON(configUrl, timeoutSignal(15000));
  window.BikeStatic = new StaticService(base, config);
  // Configure the coordinator before the app runs, then await its own startup
  // so both import failures and initialization failures reach the same surface.
  await import('../app.js?v=91042991f1612db2');
  await window.BikeAppReady;
} catch {
  const message = document.getElementById('error');
  message.textContent = message.dataset.loadError || 'The app could not be loaded. Please reload to try again.';
  message.hidden = false;
  const status = document.getElementById('station-data-status');
  if (status) status.hidden = true;
  const instruction = document.getElementById('map-instruction');
  if (instruction) instruction.textContent = message.textContent;
}
