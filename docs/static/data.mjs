/** Preserve cancellation on browsers without AbortSignal.throwIfAborted(). */
export function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
  }
}

/** Older module-capable browsers can still initialize the map. */
export function timeoutSignal(milliseconds) {
  if (typeof globalThis.AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(milliseconds);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), milliseconds);
  return controller.signal;
}

/** Read explicit gzip assets: GitHub Pages does not negotiate our gzip siblings. */
export async function fetchBytes(url, signal) {
  throwIfAborted(signal);
  const response = await fetch(url, {signal, credentials: 'omit'});
  if (!response.ok) {
    const error = new Error('Data could not be loaded. Please try again.');
    error.status = response.status;
    throw error;
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  throwIfAborted(signal);
  // Some hosts decode Content-Encoding themselves; never decompress twice.
  if (bytes[0] !== 31 || bytes[1] !== 139) return bytes;
  if (typeof globalThis.DecompressionStream !== 'function') {
    const error = new Error('Your browser cannot load compressed map data. Please update your browser and try again.');
    error.code = 'UNSUPPORTED_GZIP';
    throw error;
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const decoded = new Uint8Array(await new Response(stream).arrayBuffer());
  throwIfAborted(signal);
  return decoded;
}

export async function fetchJSON(url, signal) {
  return JSON.parse(new TextDecoder().decode(await fetchBytes(url, signal)));
}

/** Exact little-endian [observations, zero] uint16 pairs, never probabilities. */
export async function loadHistory(base, signal, existingMetadata) {
  throwIfAborted(signal);
  const indexURL = new URL('data/history.json', base);
  indexURL.search = base.search;
  const metadata = existingMetadata ?? await fetchJSON(indexURL, signal);
  const bytes = await fetchBytes(new URL(`data/${metadata.counts_url}`, base), signal);
  if (metadata.schema !== 2 || bytes.byteLength !== metadata.stations.length * 48 * 4) {
    throw new Error('Historical data is incomplete. Please reload.');
  }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  throwIfAborted(signal);
  const hash = Array.from(digest, n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== metadata.counts_sha256) throw new Error('Historical data did not match its index.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const counts = new Uint16Array(bytes.byteLength / 2);
  for (let i = 0; i < counts.length; i++) counts[i] = view.getUint16(i * 2, true);
  return {...metadata, counts};
}
