// Armazenamento local (IndexedDB) com reserva em memória se o navegador bloquear.
const NAME = 'rota-cacd', ST = 'kv';
let dbp = null, mem = new Map(), memOnly = false;
function open() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open(NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
async function db() {
  if (memOnly) return null;
  if (!dbp) dbp = open().catch(() => { memOnly = true; return null; });
  return dbp;
}
export const semArmazenamento = () => memOnly;
export async function get(k) {
  const d = await db(); if (!d) return mem.get(k);
  return new Promise((res, rej) => { const q = d.transaction(ST).objectStore(ST).get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
export async function set(k, v) {
  const d = await db(); if (!d) { mem.set(k, v); return; }
  return new Promise((res, rej) => { const t = d.transaction(ST, 'readwrite'); t.objectStore(ST).put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
}
export async function keys() {
  const d = await db(); if (!d) return [...mem.keys()];
  return new Promise((res, rej) => { const q = d.transaction(ST).objectStore(ST).getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
