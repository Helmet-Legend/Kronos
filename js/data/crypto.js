// Chiffrement des sauvegardes : AES-GCM 256 bits, clé dérivée du mot de passe par PBKDF2-SHA256.
// Sel (16 octets) et IV (12 octets) aléatoires, stockés en clair dans l'en-tête du fichier.
// Fonctionne dans le navigateur et dans Node 20+ (WebCrypto).

export const KDF_ITER = 600000;
const subtle = () => globalThis.crypto && globalThis.crypto.subtle;
const enc = new TextEncoder(), dec = new TextDecoder();

function b64(bytes) {
  let s = '';
  const u = new Uint8Array(bytes);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(str) {
  const s = atob(str), u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

async function deriveKey(password, salt, iter) {
  const base = await subtle().importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export const cryptoAvailable = () => !!subtle();

/** Le texte est-il une sauvegarde chiffrée ? */
export function isEncrypted(text) {
  try { const o = JSON.parse(text); return !!(o && o.app === 'kronos' && o.enc && o.data); } catch (e) { return false; }
}

/**
 * Chiffre une sauvegarde (texte JSON). Renvoie le texte du fichier chiffré.
 * @param {string} plain @param {string} password @param {object} [meta] champs en clair (schema, exportedAt)
 */
export async function encryptBackup(plain, password, meta = {}, iter = KDF_ITER) {
  if (!cryptoAvailable()) throw new Error('Chiffrement indisponible dans ce navigateur');
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iter);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain));
  return JSON.stringify({ app: 'kronos', ...meta, enc: { alg: 'AES-GCM-256', kdf: 'PBKDF2-SHA256', iter, salt: b64(salt), iv: b64(iv) }, data: b64(ct) }, null, 2);
}

/** Déchiffre un fichier chiffré. Lève « Mot de passe incorrect » si l'authentification échoue. */
export async function decryptBackup(text, password) {
  if (!cryptoAvailable()) throw new Error('Chiffrement indisponible dans ce navigateur');
  let o;
  try { o = JSON.parse(text); } catch (e) { throw new Error('Fichier illisible (JSON invalide)'); }
  if (!o || !o.enc || !o.data) throw new Error('Ce fichier n’est pas chiffré');
  if (o.enc.alg !== 'AES-GCM-256' || o.enc.kdf !== 'PBKDF2-SHA256') throw new Error('Chiffrement non reconnu');
  const key = await deriveKey(password, unb64(o.enc.salt), o.enc.iter);
  try {
    return dec.decode(await subtle().decrypt({ name: 'AES-GCM', iv: unb64(o.enc.iv) }, key, unb64(o.data)));
  } catch (e) {
    throw new Error('Mot de passe incorrect ou fichier modifié');
  }
}
