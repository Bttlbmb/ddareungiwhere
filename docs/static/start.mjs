import {StaticService} from './service.mjs?v=85107cd7e901a9b5';
import {fetchJSON, timeoutSignal} from './data.mjs?v=85107cd7e901a9b5';
const base=new URL('../',import.meta.url);
base.search=new URL(import.meta.url).search;
try {
  const configUrl=new URL('config.json',base);
  configUrl.search=new URL(import.meta.url).search;
  const config=await fetchJSON(configUrl,timeoutSignal(15000));
  window.BikeStatic=new StaticService(base,config);
  await import('../app.js?v=85107cd7e901a9b5');
  await window.BikeAppReady;
} catch(error) {
  const message=document.getElementById('error');message.textContent=message.dataset.loadError || 'The app could not be loaded. Please reload to try again.';message.hidden=false;
  const status=document.getElementById('station-data-status');if(status)status.hidden=true;
  const instruction=document.getElementById('map-instruction');if(instruction)instruction.textContent=message.textContent;
}
