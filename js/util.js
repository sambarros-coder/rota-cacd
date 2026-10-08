export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = s => String(s).toLowerCase().replace(/(^|\s)[-\u2212](?=\d)/g, '$1neg').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9/., ]/g, '').replace(/\s+/g, ' ').trim();
export function embaralhar(arr, semente) {
  let h = 2166136261; for (const c of semente) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  const a = arr.map((v, i) => [v, i]);
  for (let tent = 0; tent < 8; tent++) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.length < 2 || a.some(([, i], k) => i !== k)) break;
  }
  return a;
}
export function falar(texto, lang) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(texto); u.lang = lang || 'es-ES'; u.rate = 0.9;
  speechSynthesis.speak(u); return true;
}
