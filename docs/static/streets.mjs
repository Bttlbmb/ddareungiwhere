export class StreetLabels {
  constructor(base, fetchJSON) { this.base=base; this.fetchJSON=fetchJSON; this.cache=new Map(); }
  shard(key, signal) {
    if (!this.cache.has(key)) {
      const url = new URL(`data/streets/${key}.json.gz`,this.base);
      url.search = this.base.search;
      const task=this.fetchJSON(url,signal).catch(error=>{this.cache.delete(key);throw error;});
      this.cache.set(key,task);
      if(this.cache.size>32) this.cache.delete(this.cache.keys().next().value);
    }
    return this.cache.get(key);
  }
  async lookup(lat,lng,signal) {
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<33||lat>39||lng<124||lng>132) throw new Error('Choose a location in or around Seoul.');
    const scale=111195*Math.cos(lat*Math.PI/180), latRadius=250/111195, lngRadius=250/scale;
    const cells=[];
    for(let row=Math.floor((lat-latRadius)/.005);row<=Math.floor((lat+latRadius)/.005);row++)
      for(let col=Math.floor((lng-lngRadius)/.005);col<=Math.floor((lng+lngRadius)/.005);col++)
        cells.push({key:`${row},${col}`,shard:`${Math.floor(row/10)}_${Math.floor(col/10)}`});
    const shards=new Map(await Promise.all([...new Set(cells.map(c=>c.shard))].map(async key=>{
      try {return [key,await this.shard(key,signal)];} catch(error) {if(error.status===404)return [key,null];throw error;}
    })));
    const segments=new Map();
    for(const shard of shards.values()) for(const segment of shard?.segments||[]) segments.set(segment[0],segment);
    let best=250,label=null,label_ko=null;
    const seen=new Set();
    for(const cell of cells) for(const id of shards.get(cell.shard)?.cells[cell.key]||[]) {
      if(seen.has(id))continue;seen.add(id);
      const [,name,aLat,aLng,bLat,bLng,nameKo]=segments.get(id);
      const ax=(aLng-lng)*scale,ay=(aLat-lat)*111195,bx=(bLng-lng)*scale,by=(bLat-lat)*111195;
      const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
      const t=length?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/length)):0;
      const d=Math.hypot(ax+t*dx,ay+t*dy);
      if(d<=best){best=d;label=name;label_ko=nameKo||name;}
    }
    return {label,label_ko,distance_m:label?Math.round(best):null,source:'OpenStreetMap',kind:label?'nearest_street':null};
  }
}
