// Guardado del módulo de inversiones. Usa el mismo Firebase y el mismo correo autorizado que tu plan financiero.
// Rutas: users/<uid>/inversiones/estado (ajustes, lista, operaciones) y users/<uid>/inv_series/<símbolo> (precios en caché).
import { firebaseConfig, ALLOWED_EMAILS } from '../firebase-config.js';

const configurado = () => Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId);
const LS = 'inversiones_v1';
const LS_SERIE = 'inv_serie_';
const limpio = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)));
const idDoc = (s) => s.replace(/[\/#\[\]]/g, '_');

class LocalStore {
  constructor() { this.modo = 'local'; this.user = { email: 'modo local', displayName: 'Modo local' }; }
  async init(onUser) { onUser(this.user); }
  async signIn() {} async signOut() {}
  async load() { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch { return null; } }
  async save(estado) { try { localStorage.setItem(LS, JSON.stringify(limpio(estado))); } catch (e) { console.warn(e); } }
  async loadSerie(id) { try { return JSON.parse(localStorage.getItem(LS_SERIE + id) || 'null'); } catch { return null; } }
  async saveSerie(id, obj) { try { localStorage.setItem(LS_SERIE + id, JSON.stringify(obj)); } catch (e) { console.warn('caché llena', e); } }
  async deleteSerie(id) { try { localStorage.removeItem(LS_SERIE + id); } catch {} }
  // Datos de tu plan de ahorro en modo local (misma llave que usa la app del plan)
  async loadPlan() { try { return JSON.parse(localStorage.getItem('plan_recapitalizacion_v1') || 'null'); } catch { return null; } }
}

class FirebaseStore {
  constructor() { this.modo = 'firebase'; this.user = null; }
  async init(onUser, onError) {
    // Usa el Firebase empaquetado de tu plan; si le falta alguna función, usa el oficial de Google.
    const necesita = ['initializeApp', 'getAuth', 'onAuthStateChanged', 'GoogleAuthProvider', 'signInWithPopup', 'getFirestore', 'doc', 'getDoc', 'setDoc', 'collection', 'getDocs'];
    let F = null;
    try { F = await import('../../vendor/firebase.js'); } catch { F = null; }
    if (!F || necesita.some((n) => !F[n])) {
      const v = '10.12.5', b = `https://www.gstatic.com/firebasejs/${v}`;
      const [a, au, fs] = await Promise.all([import(`${b}/firebase-app.js`), import(`${b}/firebase-auth.js`), import(`${b}/firebase-firestore.js`)]);
      F = { ...a, ...au, ...fs };
    }
    this.F = F;
    this.app = F.initializeApp(firebaseConfig);
    this.auth = F.getAuth(this.app);
    try {
      this.db = F.initializeFirestore(this.app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
    } catch { this.db = F.getFirestore(this.app); }
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
    try { await this.F.signInWithPopup(this.auth, p); }
    catch (e) { if (String(e.code).includes('popup')) await this.F.signInWithRedirect(this.auth, p); else throw e; }
  }
  async signOut() { await this.F.signOut(this.auth); }
  _doc(ruta) { return this.F.doc(this.db, `users/${this.user.uid}/${ruta}`); }
  async load() { const d = await this.F.getDoc(this._doc('inversiones/estado')); return d.exists() ? d.data() : null; }
  async save(estado) { await this.F.setDoc(this._doc('inversiones/estado'), limpio(estado)); }
  async loadSerie(id) {
    const d = await this.F.getDoc(this._doc(`inv_series/${idDoc(id)}`));
    if (!d.exists()) return null;
    const x = d.data();
    // Se guarda compacto: fechas y cierres en dos arreglos
    return { ...x, serie: (x.f || []).map((f, i) => ({ d: f, c: x.c[i] })), f: undefined, c: undefined };
  }
  async saveSerie(id, obj) {
    const { serie, ...resto } = obj;
    await this.F.setDoc(this._doc(`inv_series/${idDoc(id)}`), limpio({ ...resto, f: serie.map((p) => p.d), c: serie.map((p) => p.c) }));
  }
  // Lee tu plan de ahorro tal como lo guarda la app del plan (solo lectura)
  async loadPlan() {
    const d = await this.F.getDoc(this._doc('meta/datos'));
    if (!d.exists()) return null;
    const l = await this.F.getDoc(this._doc('meta/listas'));
    const out = { datos: d.data().datos, ...(l.exists() ? l.data() : {}) };
    for (const c of ['semanas', 'cargos', 'suscripciones']) {
      const snap = await this.F.getDocs(this.F.collection(this.db, `users/${this.user.uid}/${c}`));
      out[c] = snap.docs.map((x) => x.data());
    }
    return out;
  }
  async deleteSerie(id) { if (this.F.deleteDoc) await this.F.deleteDoc(this._doc(`inv_series/${idDoc(id)}`)); }
}

export function crearStore() { return configurado() ? new FirebaseStore() : new LocalStore(); }
