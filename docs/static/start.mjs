import {StaticService,fetchJSON} from './service.mjs?v=1f4d7b6151209262';
const base=new URL('../',import.meta.url);
try {
  const configUrl=new URL('config.json',base);
  configUrl.search=new URL(import.meta.url).search;
  const config=await fetchJSON(configUrl,AbortSignal.timeout(15000));
  window.BikeStatic=new StaticService(base,config);
  await import('../app.js?v=1f4d7b6151209262');
} catch(error) {
  const message=document.getElementById('error');message.textContent='The app could not be loaded. Please reload to try again.';message.hidden=false;
}
