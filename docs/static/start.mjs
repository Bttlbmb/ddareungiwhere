import {StaticService} from './service.mjs?v=baa26a99b15cc88a';
import {fetchJSON} from './data.mjs?v=baa26a99b15cc88a';
const base=new URL('../',import.meta.url);
base.search=new URL(import.meta.url).search;
try {
  const configUrl=new URL('config.json',base);
  configUrl.search=new URL(import.meta.url).search;
  const config=await fetchJSON(configUrl,AbortSignal.timeout(15000));
  window.BikeStatic=new StaticService(base,config);
  await import('../app.js?v=baa26a99b15cc88a');
} catch(error) {
  const message=document.getElementById('error');message.textContent='The app could not be loaded. Please reload to try again.';message.hidden=false;
}
