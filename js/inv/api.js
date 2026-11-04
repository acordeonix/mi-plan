// Fuentes de datos: Twelve Data (EE.UU.), Alpha Vantage (BMV y respaldo), Banxico SIE (CETES y tipo de cambio).
// Las llaves se guardan en tus ajustes (Firestore / navegador), nunca en el código del repositorio.

const hoy = () => new Date().toISOString().slice(0, 10);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Cola simple para respetar los límites por minuto de los planes gratuitos
function cola(intervaloMs) {
  let ultimo = 0, cadena = Promise.resolve();
  return (fn) => {
    const p = cadena.then(async () => {
      const falta = ultimo + intervaloMs - Date.now();
      if (falta > 0) await espera(falta);
      ultimo = Date.now();
      return fn();
    });
    cadena = p.catch(() => {});
    return p;
  };
}
const colaTD = cola(8000);   // Twelve Data gratis: 8 por minuto
const colaAV = cola(13000);  // Alpha Vantage gratis: ~5 por minuto, 25 al día

export class ErrorDatos extends Error {
  constructor(msg, tipo = 'otro') { super(msg); this.tipo = tipo; }
}

async function getJSON(url) {
  let r;
  try { r = await fetch(url); }
  catch { throw new ErrorDatos('No se pudo conectar (red o el sitio bloquea consultas desde el navegador).', 'red'); }
  if (!r.ok) throw new ErrorDatos(`El servidor respondió ${r.status}.`, 'http');
  return r.json();
}

// ---------- Twelve Data ----------
export async function twelveSerie(simbolo, key, dias = 1300) {
  if (!key) throw new ErrorDatos('Falta tu llave de Twelve Data (Ajustes).', 'llave');
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(simbolo)}&interval=1day&outputsize=${dias}&order=ASC&apikey=${encodeURIComponent(key)}`;
  const j = await colaTD(() => getJSON(url));
  if (j.status === 'error') {
    const plan = /plan|available starting/i.test(j.message || '');
    throw new ErrorDatos(plan ? `${simbolo} no está en el plan gratuito de Twelve Data.` : (j.message || 'Error de Twelve Data'), plan ? 'plan' : (j.code === 429 ? 'limite' : 'otro'));
  }
  const serie = (j.values || []).map((v) => ({ d: v.datetime.slice(0, 10), c: Number(v.close) })).filter((p) => p.c > 0);
  serie.sort((a, b) => (a.d < b.d ? -1 : 1));
  return { serie, moneda: j.meta?.currency || 'USD', nombre: j.meta?.symbol || simbolo, fuente: 'Twelve Data' };
}

// ---------- Alpha Vantage ----------
function avError(j) {
  const m = j.Note || j.Information || j['Error Message'];
  if (!m) return null;
  if (/premium/i.test(m)) return new ErrorDatos('Esa consulta es de pago en Alpha Vantage.', 'plan');
  if (/frequency|rate limit|per day|25 requests/i.test(m)) return new ErrorDatos('Llegaste al límite diario de Alpha Vantage (25 consultas). Intenta mañana.', 'limite');
  return new ErrorDatos('Alpha Vantage no reconoce ese símbolo. Usa "Buscar" para encontrar el correcto.', 'simbolo');
}

export async function alphaSerie(simbolo, key) {
  if (!key) throw new ErrorDatos('Falta tu llave de Alpha Vantage (Ajustes).', 'llave');
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=${encodeURIComponent(simbolo)}&apikey=${encodeURIComponent(key)}`;
  const j = await colaAV(() => getJSON(url));
  const e = avError(j); if (e) throw e;
  const datos = j['Weekly Adjusted Time Series'] || {};
  const serie = Object.entries(datos).map(([d, v]) => ({ d, c: Number(v['5. adjusted close'] || v['4. close']) }))
    .filter((p) => p.c > 0).sort((a, b) => (a.d < b.d ? -1 : 1));
  if (!serie.length) throw new ErrorDatos('Alpha Vantage no regresó datos para ese símbolo.', 'simbolo');
  return { serie, moneda: simbolo.toUpperCase().endsWith('.MEX') ? 'MXN' : 'USD', nombre: simbolo, fuente: 'Alpha Vantage (semanal, ajustado por dividendos)' };
}

export async function alphaBuscar(texto, key) {
  if (!key) throw new ErrorDatos('Falta tu llave de Alpha Vantage (Ajustes).', 'llave');
  const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(key)}`;
  const j = await colaAV(() => getJSON(url));
  const e = avError(j); if (e) throw e;
  return (j.bestMatches || []).map((m) => ({ simbolo: m['1. symbol'], nombre: m['2. name'], region: m['4. region'], moneda: m['8. currency'] }));
}

// ---------- Banxico SIE ----------
export const SERIES_BANXICO = { cetes28: 'SF43936', fix: 'SF43718' };

const fechaBx = (s) => { const [d, m, a] = s.split('/'); return `${a}-${m}-${d}`; };

export async function banxico(ids, token, desde = '2015-01-01') {
  if (!token) throw new ErrorDatos('Falta tu token de Banxico (Ajustes).', 'llave');
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${ids.join(',')}/datos/${desde}/${hoy()}?token=${encodeURIComponent(token)}`;
  const j = await getJSON(url);
  const out = {};
  for (const s of j?.bmx?.series || []) {
    out[s.idSerie] = (s.datos || []).filter((x) => !/N\/E/.test(x.dato))
      .map((x) => ({ d: fechaBx(x.fecha), c: Number(String(x.dato).replace(/,/g, '')) }))
      .filter((p) => Number.isFinite(p.c));
  }
  return out;
}

// ---------- CSV manual (respaldo para cualquier símbolo) ----------
// Acepta archivos de Yahoo Finance, Investing.com o cualquier CSV con columnas de fecha y cierre.
export function leerCSV(texto) {
  const lineas = texto.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lineas.length < 3) throw new ErrorDatos('El CSV no tiene suficientes filas.');
  const sep = (lineas[0].match(/;/g) || []).length > (lineas[0].match(/,/g) || []).length ? ';' : ',';
  const partir = (l) => l.match(new RegExp(`("([^"]*)"|[^${sep}]+)`, 'g'))?.map((x) => x.replace(/^"|"$/g, '').trim()) || [];
  const cab = partir(lineas[0]).map((h) => h.toLowerCase());
  const iF = cab.findIndex((h) => /date|fecha/.test(h));
  let iC = cab.findIndex((h) => /adj/.test(h));
  if (iC < 0) iC = cab.findIndex((h) => /^close|cierre|último|ultimo|price|precio/.test(h));
  if (iF < 0 || iC < 0) throw new ErrorDatos('No encontré columnas de fecha y cierre en el CSV.');
  const num = (s) => {
    s = s.replace(/[^0-9.,-]/g, '');
    if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (s.includes(',')) s = s.replace(',', '.');
    return Number(s);
  };
  const fecha = (s) => {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; // día/mes/año
    const t = Date.parse(s); return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
  };
  const serie = lineas.slice(1).map((l) => { const c = partir(l); return { d: fecha(c[iF] || ''), c: num(c[iC] || '') }; })
    .filter((p) => p.d && p.c > 0).sort((a, b) => (a.d < b.d ? -1 : 1));
  if (serie.length < 3) throw new ErrorDatos('No pude leer precios válidos en el CSV.');
  return serie;
}
