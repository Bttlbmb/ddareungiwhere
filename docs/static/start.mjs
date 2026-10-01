import {StaticService} from './service.mjs?v=2aa1fb2d5e4c8f2a';
import {fetchJSON} from './data.mjs?v=2aa1fb2d5e4c8f2a';
const base=new URL('../',import.meta.url);
base.search=new URL(import.meta.url).search;
try {
  const configUrl=new URL('config.json',base);
  configUrl.search=new URL(import.meta.url).search;
  const config=await fetchJSON(configUrl,AbortSignal.timeout(15000));
  window.BikeStatic=new StaticService(base,config);
  await import('../app.js?v=2aa1fb2d5e4c8f2a');
} catch(error) {
  const message=document.getElementById('error');message.textContent='The app could not be loaded. Please reload to try again.';message.hidden=false;
}
