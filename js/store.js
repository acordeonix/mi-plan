// Capa de datos: Firebase (Auth con Google + Firestore) o, si no hay configuración, modo local en este navegador.
import { firebaseConfig, ALLOWED_EMAILS } from './firebase-config.js';

const configurado = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const COLS = ['semanas', 'cargos', 'suscripciones', 'movimientos'];
const LS_KEY = 'plan_recapitalizacion_v1';

export function mensajeAuth(e) {
  const c = String((e && e.code) || '');
  const host = location.hostname;
  if (c.includes('unauthorized-domain')) return `Falta autorizar el dominio: en Firebase › Authentication › Configuración › Dominios autorizados agrega "${host}".`;
  if (c.includes('api-key-not-valid') || c.includes('invalid-api-key')) return 'La apiKey de js/firebase-config.js no es válida. Cópiala otra vez de la consola de Firebase.';
  if (c.includes('popup-closed') || c.includes('cancelled-popup')) return 'Se cerró la ventana de Google antes de terminar. Intenta otra vez.';
  if (c.includes('operation-not-allowed')) return 'El acceso con Google no está habilitado en Firebase › Authentication › Método de acceso.';
  if (c.includes('network')) return 'Sin conexión. Revisa tu internet e intenta otra vez.';
  return 'No se pudo entrar: ' + ((e && (e.code || e.message)) || e);
}

function clean(o) { return JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v))); }

// ---------------- Modo local ----------------
class LocalStore {
  constructor() { this.modo = 'local'; this.user = { email: 'modo local', displayName: 'Modo local' }; }
  async init(onUser) { onUser(this.user); }
  async signIn() {} async signOut() {}
  _read() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; } }
  _write(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) { console.warn(e); } }
  async load() { return this._read(); }
  async saveAll(state) { this._write(clean(state)); }
  async saveDatos(datos) { const s = this._read() || {}; s.datos = datos; this._write(clean(s)); }
  async saveListas(listas) { const s = this._read() || {}; Object.assign(s, listas); this._write(clean(s)); }
  async saveItem(col, item, key) { const s = this._read() || {}; s[col] = s[col] || []; const i = s[col].findIndex((x) => x[key] === item[key]); if (i >= 0) s[col][i] = item; else s[col].push(item); this._write(clean(s)); }
  async deleteItem(col, id, key) { const s = this._read() || {}; s[col] = (s[col] || []).filter((x) => x[key] !== id); this._write(clean(s)); }
  async saveItems(col, items, key) { const s = this._read() || {}; s[col] = s[col] || []; items.forEach((it) => { const i = s[col].findIndex((x) => x[key] === it[key]); if (i >= 0) s[col][i] = it; else s[col].push(it); }); this._write(clean(s)); }
}

// ---------------- Firebase ----------------
class FirebaseStore {
  constructor() { this.modo = 'firebase'; this.user = null; }
  async init(onUser, onError) {
    const F = await import('../vendor/firebase.js');
    this.F = F;
    this.app = F.initializeApp(firebaseConfig);
    this.auth = F.getAuth(this.app);
    try {
      this.db = F.initializeFirestore(this.app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
    } catch { this.db = F.getFirestore(this.app); }
    if (F.getRedirectResult) F.getRedirectResult(this.auth).catch((e) => onError(mensajeAuth(e)));
    F.onAuthStateChanged(this.auth, async (u) => {
      if (u && !ALLOWED_EMAILS.map((e) => e.toLowerCase()).includes(String(u.email).toLowerCase())) {
        await F.signOut(this.auth);
        onError(`La cuenta ${u.email} no tiene acceso a esta app.`);
        onUser(null); return;
      }
      this.user = u; onUser(u);
    });
  }
  async signIn() {
    const p = new this.F.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    try { await this.F.signInWithPopup(this.auth, p); }
    catch (e) {
      const c = String(e.code || '');
      if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') await this.F.signInWithRedirect(this.auth, p);
      else throw e;
    }
  }
  async signOut() { await this.F.signOut(this.auth); }
  _base() { return `users/${this.user.uid}`; }
  async load() {
    const { doc, getDoc, collection, getDocs } = this.F;
    const d = await getDoc(doc(this.db, `${this._base()}/meta/datos`));
    if (!d.exists()) return null;
    const l = await getDoc(doc(this.db, `${this._base()}/meta/listas`));
    const out = { datos: d.data().datos, ...(l.exists() ? l.data() : {}) };
    for (const c of COLS) {
      const snap = await getDocs(collection(this.db, `${this._base()}/${c}`));
      out[c] = snap.docs.map((x) => x.data());
    }
    return out;
  }
  async saveDatos(datos) { await this.F.setDoc(this.F.doc(this.db, `${this._base()}/meta/datos`), { datos: clean(datos), actualizado: this.F.serverTimestamp() }); }
  async saveListas(listas) { await this.F.setDoc(this.F.doc(this.db, `${this._base()}/meta/listas`), clean(listas), { merge: true }); }
  async saveItem(col, item, key) { await this.F.setDoc(this.F.doc(this.db, `${this._base()}/${col}/${item[key]}`), clean(item)); }
  async saveItems(col, items, key) {
    for (let i = 0; i < items.length; i += 400) {
      const b = this.F.writeBatch(this.db);
      items.slice(i, i + 400).forEach((it) => b.set(this.F.doc(this.db, `${this._base()}/${col}/${it[key]}`), clean(it)));
      await b.commit();
    }
  }
  async deleteItem(col, id) { await this.F.deleteDoc(this.F.doc(this.db, `${this._base()}/${col}/${id}`)); }
  async saveAll(state) {
    const { writeBatch, doc, collection, getDocs } = this.F;
    // borra colecciones actuales y escribe todo (importar respaldo)
    for (const c of COLS) {
      const snap = await getDocs(collection(this.db, `${this._base()}/${c}`));
      const b = writeBatch(this.db); snap.docs.forEach((x) => b.delete(x.ref)); await b.commit();
    }
    await this.saveDatos(state.datos);
    await this.saveListas({ pendientes: state.pendientes || [], consejos: state.consejos || [], listaEspera: state.listaEspera || [], ui: state.ui || {}, reglas: state.reglas || [], cierres: state.cierres || {} });
    const keys = { semanas: 'fecha', cargos: 'id', suscripciones: 'id', movimientos: 'id' };
    for (const c of COLS) {
      const items = state[c] || [];
      for (let i = 0; i < items.length; i += 400) {
        const b = writeBatch(this.db);
        items.slice(i, i + 400).forEach((it) => b.set(doc(this.db, `${this._base()}/${c}/${it[keys[c]]}`), clean(it)));
        await b.commit();
      }
    }
  }
}

export function crearStore() { return configurado() ? new FirebaseStore() : new LocalStore(); }
export const KEYS = { semanas: 'fecha', cargos: 'id', suscripciones: 'id', movimientos: 'id' };
