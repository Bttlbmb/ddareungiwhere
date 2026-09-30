import {StaticService,fetchJSON} from './service.mjs';
const base=new URL('../',import.meta.url);
try {
  const config=await fetchJSON(new URL('config.json',base),AbortSignal.timeout(15000));
  window.BikeStatic=new StaticService(base,config);
  await import('../app.js');
} catch(error) {
  const message=document.getElementById('error');message.textContent='The app could not be loaded. Please reload to try again.';message.hidden=false;
}
