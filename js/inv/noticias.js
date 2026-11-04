// Pestaña "Noticias": titulares de Finnhub (gratis, 60 consultas/min) del mercado, por sector, de tu lista y de empresas mexicanas.
// Cada noticia se clasifica por tema (investigación, resultados, fusiones, regulación, economía) con palabras clave.
import { UNIVERSO, SECTORES } from './ranking.js';

const BASE = 'https://finnhub.io/api/v1';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Clasificación por tema ----------
export const TEMAS = {
  inv: { n: 'Investigación y lanzamientos', k: /\b(research|study|trial|fda|approv|drug|vaccine|patent|breakthrough|discover|launch|unveil|new (chip|model|product)|prototype|innovation|ai model|clinical)\w*/i },
  res: { n: 'Resultados', k: /\b(earnings|revenue|profit|quarter(ly)?|guidance|eps|results|beats|misses|outlook|forecast|sales (rose|fell|jump|drop))\w*/i },
  fus: { n: 'Fusiones y compras', k: /\b(merger|acquir|acquisition|deal to buy|buyout|takeover|stake in|to buy|spin.?off)\w*/i },
  reg: { n: 'Regulación y juicios', k: /\b(lawsuit|antitrust|regulator|probe|investigation|sec |fined?|tariff|ban(s|ned)?|sanction|court|ruling|recall)\w*/i },
  eco: { n: 'Economía y tasas', k: /\b(fed|federal reserve|inflation|interest rate|rate cut|rate hike|jobs report|payroll|gdp|recession|treasury|powell|banxico|peso|cpi|bond yield)\w*/i },
};
const temasDe = (n) => { const t = `${n.headline} ${n.summary}`; return Object.keys(TEMAS).filter((k) => TEMAS[k].k.test(t)); };

// ---------- Datos ----------
let ultimo = 0;
async function fh(ruta, key) {
  const falta = ultimo + 1100 - Date.now(); if (falta > 0) await espera(falta);
  ultimo = Date.now();
  let r;
  try { r = await fetch(`${BASE}${ruta}${ruta.includes('?') ? '&' : '?'}token=${encodeURIComponent(key)}`); }
  catch { throw new Error('No se pudo conectar con Finnhub.'); }
  if (r.status === 401 || r.status === 403) throw new Error('Finnhub rechazó la llave (revisa que esté bien copiada en Ajustes).');
  if (r.status === 429) throw new Error('Llegaste al límite de Finnhub por minuto; espera un momento.');
  if (!r.ok) throw new Error(`Finnhub respondió ${r.status}.`);
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}
const limpiar = (arr, rel) => arr.filter((n) => n.headline && n.url).map((n) => ({
  id: n.id || n.url, t: (n.datetime || 0) * 1000, headline: n.headline, summary: n.summary || '', url: n.url, source: n.source || '',
  image: n.image || '', related: String(n.related || rel || '').split(',').map((x) => x.trim()).filter(Boolean),
}));

const CACHE = new Map(); // clave -> {t, datos}
const VIGENCIA = 30 * 60000;
function leerLS(k) { try { const x = JSON.parse(localStorage.getItem('inv_news_' + k) || 'null'); return x && Date.now() - x.t < VIGENCIA ? x : null; } catch { return null; } }
function guardarLS(k, x) { try { localStorage.setItem('inv_news_' + k, JSON.stringify(x)); } catch {} }

async function conCache(k, fn, forzar) {
  const c = !forzar && (CACHE.get(k) || leerLS(k));
  if (c && Date.now() - c.t < VIGENCIA) return c.datos;
  const datos = await fn();
  const x = { t: Date.now(), datos }; CACHE.set(k, x); guardarLS(k, x);
  return datos;
}

export function noticiasEmpresa(sim, key, dias = 7, forzar = false) {
  const hoy = Date.now();
  return conCache(`co_${sim}_${dias}`, async () => limpiar(await fh(`/company-news?symbol=${encodeURIComponent(sim)}&from=${iso(hoy - dias * 864e5)}&to=${iso(hoy)}`, key), sim), forzar);
}
async function noticiasVarias(simbolos, key, forzar, alAvanzar) {
  const out = []; const errores = [];
  for (const s of simbolos) {
    try { out.push(...(await noticiasEmpresa(s, key, 4, forzar)).slice(0, 12)); }
    catch (e) { errores.push(e.message); if (/límite|rechazó/.test(e.message)) break; }
    alAvanzar?.();
  }
  if (!out.length && errores.length) throw new Error(errores[0]);
  return out;
}
function unir(arr) {
  const vistos = new Set(); const out = [];
  for (const n of arr.sort((a, b) => b.t - a.t)) {
    const k = n.headline.toLowerCase().slice(0, 80);
    if (vistos.has(k)) continue; vistos.add(k); out.push({ ...n, temas: temasDe(n) });
  }
  return out;
}

// ---------- Estado de la vista ----------
let modo = 'mercado', sector = 'tec', tema = 'todos', datos = [], cargando = false, error = '', clave = '', avance = '';

async function cargar(ctx, forzar = false) {
  const key = ctx.E.ajustes.fhKey; if (!key) return;
  const k = `${modo}|${sector}|${ctx.E.lista.map((a) => a.simbolo).join(',')}`;
  if (!forzar && k === clave) return;
  clave = k; cargando = true; error = ''; avance = ''; ctx.refrescarNoticias();
  try {
    let arr;
    if (modo === 'mercado') {
      const [g, m] = await Promise.all([
        conCache('general', async () => limpiar(await fh('/news?category=general', key)), forzar),
        conCache('merger', async () => limpiar(await fh('/news?category=merger', key)), forzar),
      ]);
      arr = [...g, ...m];
    } else {
      const sims = modo === 'sector' ? UNIVERSO.filter((u) => u.sec === sector).map((u) => u.s)
        : modo === 'mexico' ? UNIVERSO.filter((u) => u.m === 'MX').map((u) => u.s)
        : ctx.E.lista.filter((a) => a.mercado === 'US' && a.fuente !== 'csv').map((a) => a.simbolo);
      if (!sims.length) throw new Error('Tu lista no tiene acciones de EE.UU. para buscar noticias. Agrega alguna desde Resumen o Ranking.');
      let n = 0;
      arr = await noticiasVarias(sims, key, forzar, () => { avance = `${++n}/${sims.length}`; ctx.refrescarNoticias(); });
    }
    if (k === clave) datos = unir(arr).slice(0, 120);
  } catch (e) { if (k === clave) { error = e.message; datos = []; } }
  if (k === clave) { cargando = false; ctx.refrescarNoticias(); }
}

// ---------- Vista ----------
const nombreDe = (s) => UNIVERSO.find((u) => u.s === s)?.n;
const hace = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 60) return `hace ${Math.max(m, 1)} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24); return d === 1 ? 'ayer' : `hace ${d} días`;
};
const traducir = (url) => `https://translate.google.com/translate?sl=en&tl=es&u=${encodeURIComponent(url)}`;

export function tarjetaNoticia(n, enLista) {
  const rel = n.related.slice(0, 4).map((s) => `<span class="chip ${enLista?.has(s) ? 'mio' : ''}" title="${esc(nombreDe(s) || s)}">${esc(s)}</span>`).join('');
  return `<article class="noticia">
    ${n.image ? `<img src="${esc(n.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
    <div>
      <a class="titular" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.headline)}</a>
      ${n.summary ? `<p>${esc(n.summary.length > 260 ? n.summary.slice(0, 257) + '…' : n.summary)}</p>` : ''}
      <div class="meta-n">
        <span>${esc(n.source)} · ${hace(n.t)}</span>
        ${(n.temas || []).map((t) => `<span class="chip tema-${t}">${TEMAS[t].n}</span>`).join('')}
        ${rel}
        <a href="${traducir(n.url)}" target="_blank" rel="noopener noreferrer">Traducir</a>
      </div>
    </div>
  </article>`;
}

export function vNoticias(main, ctx) {
  const { E } = ctx;
  if (!E.ajustes.fhKey) {
    main.innerHTML = `<div class="card"><h3>Conecta las noticias</h3>
      <p>Las noticias vienen de <b>Finnhub</b>, gratis (60 consultas por minuto).</p>
      <ol class="lectura"><li>Entra a <a href="https://finnhub.io/register" target="_blank" rel="noopener">finnhub.io/register</a> y crea tu cuenta.</li>
      <li>En tu panel (Dashboard) copia tu <b>API key</b>.</li>
      <li>Pégala en <a href="#" data-ir="ajustes">Ajustes</a>, en el campo Finnhub, y da Guardar.</li></ol></div>`;
    return;
  }
  cargar(ctx);
  const enLista = new Set(E.lista.map((a) => a.simbolo));
  const cuenta = Object.fromEntries(Object.keys(TEMAS).map((k) => [k, datos.filter((n) => n.temas.includes(k)).length]));
  const visibles = tema === 'todos' ? datos : datos.filter((n) => n.temas.includes(tema));
  main.innerHTML = `
    <div class="barra">
      <div class="seg">${[['mercado', 'Mercado'], ['sector', 'Por sector'], ['lista', 'Mi lista'], ['mexico', 'México']].map(([v, l]) => `<button data-nmodo="${v}" class="${modo === v ? 'activa' : ''}">${l}</button>`).join('')}</div>
      <a href="#" data-naccion="actualizar">Actualizar</a>
    </div>
    ${modo === 'sector' ? `<div class="chips-sector">${Object.entries(SECTORES).map(([k, s]) => `<button data-nsec="${k}" class="chip sec-${k} ${sector === k ? 'sel' : ''}">${s.n}</button>`).join('')}</div>
      <p class="meta">${esc(SECTORES[sector].d)} Empresas: ${UNIVERSO.filter((u) => u.sec === sector).map((u) => esc(u.n)).join(', ')}.</p>` : ''}
    ${modo === 'mexico' ? '<p class="meta">Noticias de las empresas mexicanas que cotizan en Nueva York (América Móvil, Femsa, Cemex, aeropuertos, Southern Copper…).</p>' : ''}
    ${modo === 'lista' ? '<p class="meta">Noticias de las acciones de EE.UU. que tienes en tu lista. Los ETFs como VOO casi no tienen noticias propias.</p>' : ''}
    ${modo === 'mercado' ? '<p class="meta">Lo que está moviendo al mercado en general, más fusiones y compras de empresas.</p>' : ''}
    <div class="filtro-temas">
      <button data-ntema="todos" class="${tema === 'todos' ? 'sel' : ''}">Todas <small>${datos.length}</small></button>
      ${Object.entries(TEMAS).map(([k, t]) => `<button data-ntema="${k}" class="tema-${k} ${tema === k ? 'sel' : ''}">${t.n} <small>${cuenta[k]}</small></button>`).join('')}
    </div>
    ${cargando ? `<div class="banner">Buscando noticias${avance ? ` (${avance})` : ''}…</div>` : ''}
    ${error ? `<div class="banner error">${esc(error)}</div>` : ''}
    <div class="lista-noticias">${visibles.length ? visibles.slice(0, 60).map((n) => tarjetaNoticia(n, enLista)).join('') : !cargando && !error ? '<p class="vacio">No hay noticias con este filtro en los últimos días.</p>' : ''}</div>
    <div class="card"><h3>Cómo leer las noticias</h3><ul class="lectura">
      <li>Las noticias mueven el precio <b>en días</b>; lo que mueve tu inversión <b>en años</b> es si el negocio gana más. Pregúntate: ¿esto cambia cuánto va a ganar la empresa en 5 años?</li>
      <li>Para cuando lees un titular, el mercado ya lo reflejó en el precio. Comprar o vender por una noticia suele llegar tarde.</li>
      <li><b>Investigación y lanzamientos</b> (un medicamento aprobado, un chip nuevo) puede abrir ventas futuras, pero tarda en verse en resultados.</li>
      <li><b>Economía y tasas</b> mueve a todo el mercado a la vez: cuando suben las tasas, suelen caer más las empresas de crecimiento como tecnología.</li>
      <li>Usa la noticia como pregunta, no como orden: anótala en el motivo de tu operación de práctica y revisa después si importó.</li>
    </ul></div>
    <p class="nota">Titulares en inglés de Finnhub; usa "Traducir" para leerlos en español. La clasificación por tema es automática, por palabras clave.</p>`;
}

export function eventosNoticias(ev, ctx) {
  const b = ev.target.closest('[data-nmodo],[data-nsec],[data-ntema],[data-naccion]');
  if (!b || ev.type !== 'click') return false;
  ev.preventDefault();
  if (b.dataset.nmodo) { modo = b.dataset.nmodo; tema = 'todos'; }
  else if (b.dataset.nsec) { sector = b.dataset.nsec; tema = 'todos'; }
  else if (b.dataset.ntema) { tema = b.dataset.ntema; ctx.refrescarNoticias(); return true; }
  else if (b.dataset.naccion === 'actualizar') { cargar(ctx, true); return true; }
  cargar(ctx); ctx.refrescarNoticias(); return true;
}

// Bloque para la vista Detalle
export async function llenarDetalle(cont, sim, key, enLista) {
  if (!cont) return;
  if (!key) { cont.innerHTML = '<h3>Noticias recientes</h3><p class="vacio">Agrega tu llave de Finnhub en Ajustes para ver noticias de esta empresa.</p>'; return; }
  cont.innerHTML = '<h3>Noticias recientes</h3><p class="vacio">Buscando…</p>';
  try {
    const arr = unir(await noticiasEmpresa(sim, key, 14)).slice(0, 6);
    cont.innerHTML = `<h3>Noticias recientes <small>últimas 2 semanas</small></h3>${arr.length ? `<div class="lista-noticias compacta">${arr.map((n) => tarjetaNoticia(n, enLista)).join('')}</div>` : '<p class="vacio">Sin noticias recientes (los ETFs casi no tienen noticias propias).</p>'}`;
  } catch (e) { cont.innerHTML = `<h3>Noticias recientes</h3><p class="banner error">${esc(e.message)}</p>`; }
}
