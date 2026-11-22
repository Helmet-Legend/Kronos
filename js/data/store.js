// Persistance locale : IndexedDB (une seule clé « state »), repli sur localStorage.

const DB = 'kronos', STORE = 'kv', KEY = 'state';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB indisponible')); return; }
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function load() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const q = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => reject(q.error);
    });
  } catch (e) {
    try { const t = localStorage.getItem('kronos.' + KEY); return t ? JSON.parse(t) : null; } catch (e2) { return null; }
  }
}

export async function save(state) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(state, KEY);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    try { localStorage.setItem('kronos.' + KEY, JSON.stringify(state)); } catch (e2) { /* stockage plein ou interdit */ }
  }
}

/** Demande au navigateur de ne pas effacer les données en cas de manque de place. */
export async function persist() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* ignoré */ }
  return false;
}
