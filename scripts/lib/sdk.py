"""Install the pinned SDK with narrowly scoped, checked transport patches.

WASM is unmodified. Every JavaScript patch must match exactly once; SDK upgrades
require explicit review of endpoint correlation and decoded tile validation.
"""
import hashlib
import gzip
import json
import shutil


def install_sdk(sdk, destination):
    runtime = json.loads((sdk / 'runtime.json').read_text())
    expected = runtime['artifacts']['public/wasm/valhalla.wasm']['sha256']
    if runtime['sdk'] != 'valhalla-browser@0.2.1' or hashlib.sha256((sdk / 'valhalla-browser.wasm').read_bytes()).hexdigest() != expected:
        raise ValueError('Unexpected SDK/runtime; use valhalla-browser 0.2.1.')
    destination.mkdir(parents=True)
    for name in ['index.js', 'worker.js', 'runtime.json']:
        shutil.copyfile(sdk / name, destination / name)
    wasm = (sdk / 'valhalla-browser.wasm').read_bytes()
    (destination / 'valhalla-browser.wasm.gz').write_bytes(gzip.compress(wasm, mtime=0))
    shutil.copytree(sdk / 'licenses', destination / 'licenses')
    shutil.copyfile(sdk.parent / 'LICENSE', destination / 'LICENSE')
    # Propagate the importing module revision to worker/WASM HTTP URLs.
    client = destination / 'index.js'
    client_text = client.read_text()
    for filename in ['worker.js', 'valhalla-browser.wasm']:
        old_url = f'new URL("{filename}", import.meta.url).href'
        new_url = f'new URL("{filename}" + new URL(import.meta.url).search, import.meta.url).href'
        if client_text.count(old_url) != 1:
            raise ValueError('SDK runtime URL patch no longer matches.')
        client_text = client_text.replace(old_url, new_url)
    # Carry only the app's boolean station role through request normalization.
    old = 'locations: r.map(({ lat: e, lon: t }) => ({\n\t\t\tlat: e,\n\t\t\tlon: t,'
    new = 'locations: r.map(({ lat: e, lon: t, station }) => ({\n\t\t\tlat: e,\n\t\t\tlon: t,\n\t\t\t...(typeof station === "boolean" ? {station} : {}),'
    if client_text.count(old) != 1:
        raise ValueError('SDK station role patch no longer matches.')
    client_text = client_text.replace(old, new)
    client.write_text(client_text)
    # Upstream fixes correlation for every profile. Preserve this app's existing
    # pedestrian origin/station matching instead. Native WASM is unchanged.
    worker = destination / 'worker.js'
    text = worker.read_text()
    old = 'r.map(({lat:e,lon:t})=>({lat:e,lon:t,radius:30,minimum_reachability:0}))'
    new = 'r.map(({lat:e,lon:n,station},i)=>{const s=typeof station===`boolean`?station:!!i;return {lat:e,lon:n,...(t===`pedestrian`?{radius:s?50:30,rank_candidates:s,search_cutoff:100,...(s?{search_filter:{exclude_bridge:true}}:{})}:{})}})'
    if text.count(old) != 1:
        raise ValueError('SDK correlation patch no longer matches; inspect before upgrading.')
    text = text.replace(old, new)
    # Full tiles are pinned and SHA-256 verified by TileLoader. Accept ordinary
    # static hosts' ETags and transparent HTTP compression for FULL GETs only;
    # bounded decoded length + SHA-256 + native GraphId checks remain mandatory.
    # Range transport retains every upstream validator/encoding check.
    replacements = {
        'o=await fetch(e,{headers:r?{Range:i}:{},...p,signal:n})': 'o=await fetch(!r&&e.endsWith(`.gph`)?e+`.gz`:e,{headers:r?{Range:i}:{},...p,signal:n})',
        'o.headers.get(`ETag`)!==t.etag&&m(': 'r&&o.headers.get(`ETag`)!==t.etag&&m(',
        'e&&e!==`identity`&&m(`DATASET`,`Encoded graph responses are unsupported.`)': 'r&&e&&e!==`identity`&&m(`DATASET`,`Encoded graph responses are unsupported.`)',
        'i!==null&&i!==String(t.length)&&m(`DATASET`,`Content-Length mismatch.`)': 'r&&i!==null&&i!==String(t.length)&&m(`DATASET`,`Content-Length mismatch.`)',
    }
    for old, new in replacements.items():
        if text.count(old) != 1:
            raise ValueError('SDK full-tile delivery patch no longer matches; inspect before upgrading.')
        text = text.replace(old, new)
    old = 'let e=o.headers.get(`Content-Encoding`);r&&e&&e!==`identity`'
    new = 'let encoding=o.headers.get(`Content-Encoding`);r&&encoding&&encoding!==`identity`'
    if text.count(old) != 1:
        raise ValueError('SDK content-encoding patch no longer matches.')
    text = text.replace(old, new)
    old = 'bytes:await a(o,t.length,n),headers:Object.fromEntries'
    new = 'bytes:!r&&e.endsWith(`.gph`)?await(async()=>{const b=await a(o,t.length+65536,n,{exact:false});return b[0]===31&&b[1]===139?await a(new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream(`gzip`))),t.length,n):b})():await a(o,t.length,n),headers:Object.fromEntries'
    if text.count(old) != 1:
        raise ValueError('SDK compressed-tile patch no longer matches.')
    text = text.replace(old, new)
    # Pages serves WASM as a standalone asset. Compress it explicitly too;
    # validate decoded size/hash before compiling the unchanged pinned binary.
    old = 'let a=await fetch(T);if(!a.ok)throw new n(`RUNTIME`,`WASM download failed: HTTP ${a.status}.`);return t(e,typeof WebAssembly.compileStreaming==`function`&&a.headers.get(`content-type`)?.split(`;`)[0].trim()===`application/wasm`?await WebAssembly.compileStreaming(a):await WebAssembly.compile(await a.arrayBuffer()),r,i)'
    new = f'const wasmURL=new URL(T);if(wasmURL.pathname.endsWith(`.wasm`))wasmURL.pathname+=`.gz`;const response=await fetch(wasmURL,{{credentials:`omit`}});if(!response.ok)throw new n(`RUNTIME`,`WASM download failed: HTTP ${{response.status}}.`);const signal=AbortSignal.timeout(15000);let bytes=await a(response,{len(wasm)}+65536,signal,{{exact:false}});if(bytes[0]===31&&bytes[1]===139)bytes=await a(new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream(`gzip`))),{len(wasm)},signal);if(bytes.length!=={len(wasm)}||Array.from(new Uint8Array(await crypto.subtle.digest(`SHA-256`,bytes)),n=>n.toString(16).padStart(2,`0`)).join(``)!==`{expected}`)throw new n(`RUNTIME`,`WASM integrity check failed.`);return t(e,await WebAssembly.compile(bytes),r,i)'
    if text.count(old) != 1:
        raise ValueError('SDK compressed-WASM patch no longer matches.')
    text = text.replace(old, new)
    worker.write_text('// Local correlation/gzip tile/WASM delivery patches: see scripts/lib/sdk.py; SDK licenses retained.\n' + text)

