// Pestaña "Ranking": compara empresas grandes de EE.UU. y empresas mexicanas que cotizan en Nueva York,
// agrupadas por sector. Ordena por datos históricos; no es una lista de compras.
import * as API from './api.js';
import * as M from './metrics.js';
import { mini } from './charts.js';

// ---------- Sectores ----------
export const SECTORES = {
  tec: { n: 'Tecnología', d: 'Software, chips y equipos. Ha sido el sector de más crecimiento, pero también de caídas fuertes cuando suben las tasas o se enfría la economía.' },
  com: { n: 'Comunicación y medios', d: 'Buscadores, redes sociales, streaming y televisión. Viven de publicidad y suscripciones.' },
  cdi: { n: 'Consumo discrecional', d: 'Lo que la gente compra cuando le sobra dinero: autos, ropa, restaurantes, tiendas en línea. Sube y baja con la economía.' },
  cbs: { n: 'Consumo básico', d: 'Lo que se compra siempre: comida, bebidas, limpieza, supermercados. Suele caer menos en crisis, pero crece más lento.' },
  sal: { n: 'Salud y medicina', d: 'Farmacéuticas, aseguradoras médicas y equipo médico. Dependen de patentes, aprobaciones de medicamentos y regulación.' },
  fin: { n: 'Financiero', d: 'Bancos y empresas de pagos con tarjeta. Les va mejor con tasas altas y economía sana; sufren en crisis de crédito.' },
  ene: { n: 'Energía', d: 'Petroleras y gas. Su precio sigue mucho al del petróleo: años muy buenos y años muy malos.' },
  ind: { n: 'Industrial y transporte', d: 'Maquinaria, aviones, trenes, aerolíneas y aeropuertos. Ligados a la actividad económica y al comercio.' },
  min: { n: 'Minería y materiales', d: 'Cobre, oro, acero, cemento y químicos. Dependen del precio de las materias primas; muy cíclicos.' },
  tel: { n: 'Telecomunicaciones', d: 'Telefonía e internet. Ingresos estables por suscripciones, crecimiento moderado y suelen pagar dividendos.' },
};

// ---------- Universo ----------
// m: 'US' (empresa de EE.UU.) o 'MX' (empresa mexicana que cotiza en Nueva York; mismo negocio, precio en dólares)
export const UNIVERSO = [
  ['AAPL', 'Apple', 'tec', 'US', 'iPhone, Mac y servicios'],
  ['MSFT', 'Microsoft', 'tec', 'US', 'Windows, Office y la nube Azure'],
  ['NVDA', 'Nvidia', 'tec', 'US', 'Chips para videojuegos e inteligencia artificial'],
  ['AVGO', 'Broadcom', 'tec', 'US', 'Chips de comunicación y software'],
  ['ORCL', 'Oracle', 'tec', 'US', 'Bases de datos y nube para empresas'],
  ['AMD', 'AMD', 'tec', 'US', 'Procesadores y chips gráficos'],
  ['GOOGL', 'Alphabet (Google)', 'com', 'US', 'Buscador, YouTube, Android y nube'],
  ['META', 'Meta', 'com', 'US', 'Facebook, Instagram y WhatsApp'],
  ['NFLX', 'Netflix', 'com', 'US', 'Streaming de series y películas'],
  ['AMZN', 'Amazon', 'cdi', 'US', 'Tienda en línea y nube AWS'],
  ['TSLA', 'Tesla', 'cdi', 'US', 'Autos eléctricos y baterías'],
  ['MCD', "McDonald's", 'cdi', 'US', 'Restaurantes de comida rápida'],
  ['HD', 'Home Depot', 'cdi', 'US', 'Tiendas de mejoras para el hogar'],
  ['NKE', 'Nike', 'cdi', 'US', 'Ropa y calzado deportivo'],
  ['WMT', 'Walmart', 'cbs', 'US', 'Supermercados (dueña de Walmex)'],
  ['COST', 'Costco', 'cbs', 'US', 'Clubes de precio por membresía'],
  ['KO', 'Coca-Cola', 'cbs', 'US', 'Bebidas'],
  ['PG', 'Procter & Gamble', 'cbs', 'US', 'Productos de limpieza y cuidado personal'],
  ['LLY', 'Eli Lilly', 'sal', 'US', 'Medicamentos (diabetes, obesidad)'],
  ['JNJ', 'Johnson & Johnson', 'sal', 'US', 'Medicamentos y equipo médico'],
  ['UNH', 'UnitedHealth', 'sal', 'US', 'Seguros de gastos médicos'],
  ['ABBV', 'AbbVie', 'sal', 'US', 'Medicamentos (inmunología)'],
  ['MRK', 'Merck', 'sal', 'US', 'Medicamentos y vacunas'],
  ['JPM', 'JPMorgan Chase', 'fin', 'US', 'El banco más grande de EE.UU.'],
  ['BAC', 'Bank of America', 'fin', 'US', 'Banco'],
  ['V', 'Visa', 'fin', 'US', 'Red de pagos con tarjeta'],
  ['MA', 'Mastercard', 'fin', 'US', 'Red de pagos con tarjeta'],
  ['XOM', 'Exxon Mobil', 'ene', 'US', 'Petróleo y gas'],
  ['CVX', 'Chevron', 'ene', 'US', 'Petróleo y gas'],
  ['CAT', 'Caterpillar', 'ind', 'US', 'Maquinaria pesada y de construcción'],
  ['GE', 'GE Aerospace', 'ind', 'US', 'Motores de avión'],
  ['UNP', 'Union Pacific', 'ind', 'US', 'Ferrocarriles (conecta con México)'],
  ['FCX', 'Freeport-McMoRan', 'min', 'US', 'Minería de cobre y oro'],
  ['NEM', 'Newmont', 'min', 'US', 'Minería de oro'],
  ['LIN', 'Linde', 'min', 'US', 'Gases industriales'],
  ['TMUS', 'T-Mobile', 'tel', 'US', 'Telefonía móvil'],
  ['VZ', 'Verizon', 'tel', 'US', 'Telefonía e internet'],
  // Empresas mexicanas que también cotizan en Nueva York
  ['AMX', 'América Móvil', 'tel', 'MX', 'Telcel y Claro en América Latina'],
  ['FMX', 'Femsa', 'cbs', 'MX', 'Oxxo y participación en Coca-Cola Femsa'],
  ['KOF', 'Coca-Cola Femsa', 'cbs', 'MX', 'Embotelladora de Coca-Cola'],
  ['CX', 'Cemex', 'min', 'MX', 'Cemento y concreto'],
  ['SCCO', 'Southern Copper (Grupo México)', 'min', 'MX', 'Minería de cobre; filial de Grupo México'],
  ['SIM', 'Grupo Simec', 'min', 'MX', 'Acero'],
  ['PAC', 'Grupo Aeroportuario del Pacífico', 'ind', 'MX', 'Aeropuertos: Tijuana, Guadalajara, Los Cabos…'],
  ['ASR', 'Grupo Aeroportuario del Sureste', 'ind', 'MX', 'Aeropuertos: Cancún, Mérida…'],
  ['OMAB', 'Grupo Aeroportuario Centro Norte', 'ind', 'MX', 'Aeropuertos: Monterrey, Chihuahua…'],
  ['VLRS', 'Volaris', 'ind', 'MX', 'Aerolínea de bajo costo'],
  ['TV', 'Televisa', 'com', 'MX', 'Televisión y cable (Izzi, Sky)'],
].map(([s, n, sec, m, d]) => ({ s, n, sec, m, d }));

const CRITERIOS = {
  r3a: ['Rendimiento 3 años (anual)', 'desc'],
  r1a: ['Rendimiento 1 año', 'desc'],
  r5a: ['Rendimiento 5 años (anual)', 'desc'],
  eficiencia: ['Eficiencia (rendimiento vs. riesgo)', 'desc'],
  ddMax: ['Menor caída máxima', 'desc'],
  vol: ['Menor volatilidad', 'asc'],
};

// ---------- Datos ----------
const VIGENCIA = 24 * 3600000;
const RK = {}; // símbolo -> {serie, moneda, actualizado, error}
let cargando = false, progreso = { hechos: 0, total: 0 }, cacheLeida = false;
let filtro = { m: 'todos', sec: 'todos', orden: 'r3a' };

async function leerCache(store) {
  if (cacheLeida) return; cacheLeida = true;
  await Promise.all(UNIVERSO.map(async (u) => {
    try { const c = await store.loadSerie('rk_' + u.s); if (c?.serie?.length) RK[u.s] = c; } catch {}
  }));
}

export async function cargarRanking(ctx, forzar = false) {
  if (cargando) return;
  const { store, E } = ctx;
  if (!E.ajustes.tdKey) return;
  cargando = true;
  await leerCache(store);
  const pend = UNIVERSO.filter((u) => forzar || !RK[u.s]?.serie?.length || Date.now() - (RK[u.s].actualizado || 0) > VIGENCIA);
  progreso = { hechos: 0, total: pend.length };
  ctx.refrescar();
  for (const u of pend) {
    // Si ya lo tienes en tu lista con datos frescos, reutiliza esos precios
    const propio = ctx.seriePropia(u.s);
    try {
      const r = propio && Date.now() - (propio.actualizado || 0) < VIGENCIA ? propio : await API.twelveSerie(u.s, E.ajustes.tdKey);
      RK[u.s] = { serie: r.serie, moneda: r.moneda || 'USD', actualizado: Date.now(), error: null };
      store.saveSerie('rk_' + u.s, RK[u.s]).catch(() => {});
    } catch (e) {
      RK[u.s] = { ...(RK[u.s] || { serie: [] }), error: e.message };
      if (e.tipo === 'limite') { progreso.hechos++; break; }
    }
    progreso.hechos++;
    ctx.refrescar();
  }
  cargando = false; ctx.refrescar();
}

function filas(ctx) {
  const tasas = ctx.tasasCetes();
  return UNIVERSO.map((u) => {
    const d = RK[u.s];
    if (!d?.serie?.length) return { u, r: null, error: d?.error };
    const s = ctx.aPesos(d.serie, d.moneda);
    return { u, r: M.resumen(s, tasas), s, d };
  });
}

// ---------- Vista ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (v, dec = 1) => (v == null || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(dec)}%`);
const pctS = (v, dec = 0) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(dec)}%`);
const cls = (v) => (v == null ? '' : v >= 0 ? 'sube' : 'baja');
const prom = (arr) => { const a = arr.filter((x) => x != null && Number.isFinite(x)); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; };

export function vRanking(main, ctx) {
  const { E } = ctx;
  if (!E.ajustes.tdKey) { main.innerHTML = '<div class="banner">El ranking usa tu llave de Twelve Data. Agrégala en <a href="#" data-ir="ajustes">Ajustes</a>.</div>'; return; }
  if (!cargando && !cacheLeida) { cargarRanking(ctx); }
  const todas = filas(ctx);
  const conDatos = todas.filter((f) => f.r);
  const [nombreCrit, dir] = CRITERIOS[filtro.orden];
  const visibles = conDatos.filter((f) => (filtro.m === 'todos' || f.u.m === filtro.m) && (filtro.sec === 'todos' || f.u.sec === filtro.sec));
  visibles.sort((a, b) => { const x = a.r[filtro.orden], y = b.r[filtro.orden]; if (x == null) return 1; if (y == null) return -1; return dir === 'asc' ? x - y : y - x; });
  const enLista = new Set(E.lista.map((a) => a.simbolo));
  const cetes3 = M.tasaPromedio(ctx.tasasCetes(), 365 * 3);
  const faltan = todas.length - conDatos.length;
  const minutos = Math.ceil(((progreso.total - progreso.hechos) * 8) / 60);

  // Resumen por sector
  const porSector = Object.entries(SECTORES).map(([k, s]) => {
    const fs = conDatos.filter((f) => f.u.sec === k && (filtro.m === 'todos' || f.u.m === filtro.m));
    const orden = [...fs].sort((a, b) => (b.r.r3a ?? b.r.r1a ?? -9) - (a.r.r3a ?? a.r.r1a ?? -9));
    return { k, s, n: fs.length, r1a: prom(fs.map((f) => f.r.r1a)), r3a: prom(fs.map((f) => f.r.r3a)), vol: prom(fs.map((f) => f.r.vol)), dd: prom(fs.map((f) => f.r.ddMax)), mejor: orden[0], peor: orden.at(-1), total: UNIVERSO.filter((u) => u.sec === k && (filtro.m === 'todos' || u.m === filtro.m)).length };
  }).filter((x) => x.total);

  main.innerHTML = `
    ${cargando ? `<div class="banner">Descargando precios: <b>${progreso.hechos}/${progreso.total}</b> empresas${minutos > 0 ? ` · faltan unos ${minutos} min` : ''}. El plan gratuito permite 8 por minuto; después quedan guardados 24 horas. Puedes usar otras pestañas mientras tanto.
      <div class="progreso"><span style="width:${progreso.total ? (progreso.hechos / progreso.total) * 100 : 0}%"></span></div></div>` : ''}
    <div class="barra">
      <div class="seg">${[['todos', 'Todas'], ['US', 'EE.UU.'], ['MX', 'México']].map(([v, l]) => `<button data-rkm="${v}" class="${filtro.m === v ? 'activa' : ''}">${l}</button>`).join('')}</div>
      <div class="fila rk-filtros">
        <label>Sector<select id="rkSec"><option value="todos">Todos</option>${Object.entries(SECTORES).map(([k, s]) => `<option value="${k}" ${filtro.sec === k ? 'selected' : ''}>${s.n}</option>`).join('')}</select></label>
        <label>Ordenar por<select id="rkOrden">${Object.entries(CRITERIOS).map(([k, [n]]) => `<option value="${k}" ${filtro.orden === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
    </div>

    ${visibles.length >= 3 ? `<div class="podio">${visibles.slice(0, 3).map((f, i) => `
      <article class="card">
        <span class="lugar">${i + 1}</span>
        <div><b>${esc(f.u.n)}</b> <small>${esc(f.u.s)}</small></div>
        <span class="chip sec-${f.u.sec}">${SECTORES[f.u.sec].n}</span>${f.u.m === 'MX' ? ' <span class="chip">México</span>' : ''}
        <p class="valor ${filtro.orden === 'vol' || filtro.orden === 'ddMax' ? '' : cls(f.r[filtro.orden])}">${filtro.orden === 'eficiencia' ? (f.r.eficiencia?.toFixed(2) ?? '—') : filtro.orden === 'vol' || filtro.orden === 'ddMax' ? pctS(f.r[filtro.orden]) : pct(f.r[filtro.orden])}</p>
        <small>${esc(nombreCrit)}</small>
      </article>`).join('')}</div>` : ''}

    <div class="card tabla"><h3>Ranking por ${esc(nombreCrit.toLowerCase())} <small>${visibles.length} empresas${faltan && !cargando ? ` · ${faltan} sin datos` : ''}</small></h3>
      <div class="scroll"><table class="rk"><thead><tr><th>#</th><th>Empresa</th><th>Sector</th><th>1 año</th><th>3 años/año</th><th>5 años/año</th><th>Volatilidad</th><th>Caída máx.</th><th>Eficiencia</th><th>Último año</th><th></th></tr></thead>
      <tbody>${visibles.map((f, i) => `<tr>
        <td>${i + 1}</td>
        <td class="emp"><b>${esc(f.u.n)}</b><small>${esc(f.u.s)} · ${esc(f.u.d)}</small></td>
        <td><span class="chip sec-${f.u.sec}">${SECTORES[f.u.sec].n}</span>${f.u.m === 'MX' ? '<br><span class="chip">México</span>' : ''}</td>
        <td class="${cls(f.r.r1a)}">${pct(f.r.r1a)}</td><td class="${cls(f.r.r3a)}">${pct(f.r.r3a)}</td><td class="${cls(f.r.r5a)}">${pct(f.r.r5a)}</td>
        <td>${pctS(f.r.vol)}</td><td class="baja">${pctS(f.r.ddMax)}</td><td>${f.r.eficiencia?.toFixed(2) ?? '—'}</td>
        <td class="spark">${mini(M.recortar(f.s, 365), (f.r.r1a ?? 0) >= 0)}</td>
        <td>${enLista.has(f.u.s) ? `<a href="#" data-abrir="${esc(f.u.s)}">ver</a>` : `<button class="btn sec mini-btn" data-rkagregar="${esc(f.u.s)}">+ Lista</button>`}</td>
      </tr>`).join('')}</tbody></table></div>
      <p class="nota">${cetes3 != null ? `Como referencia, CETES dio en promedio ${pctS(cetes3, 1)} anual en 3 años sin caídas. ` : ''}<b>Eficiencia</b> = rendimiento extra sobre CETES ÷ volatilidad. Las empresas mexicanas se muestran con sus acciones que cotizan en Nueva York, convertidas a pesos. Los precios de Twelve Data no incluyen dividendos.</p>
    </div>

    <h2 class="sub">Por sector</h2>
    <p class="meta">Promedio de las empresas de cada sector en esta lista. Toca un sector para filtrar el ranking.</p>
    <div class="grid sectores">${porSector.map((x) => `
      <article class="card sector ${filtro.sec === x.k ? 'activo-sec' : ''}" data-rksec="${x.k}">
        <header><span class="chip sec-${x.k}">${x.s.n}</span><small>${x.n}/${x.total} empresas</small></header>
        <p class="nota">${x.s.d}</p>
        <dl class="kpis">
          <div><dt>1 año</dt><dd class="${cls(x.r1a)}">${pct(x.r1a)}</dd></div>
          <div><dt>3 años/año</dt><dd class="${cls(x.r3a)}">${pct(x.r3a)}</dd></div>
          <div><dt>Volatilidad</dt><dd>${pctS(x.vol)}</dd></div>
          <div><dt>Caída máx.</dt><dd class="baja">${pctS(x.dd)}</dd></div>
        </dl>
        ${x.mejor ? `<footer>Mejor en 3 años: <b>${esc(x.mejor.u.n)}</b>${x.peor && x.peor !== x.mejor ? ` · más baja: ${esc(x.peor.u.n)}` : ''}</footer>` : ''}
      </article>`).join('')}</div>

    <div class="card"><h3>Cómo usar este ranking</h3><ul class="lectura">
      <li>Que una empresa esté arriba significa que <b>le fue mejor en el pasado</b>, no que le vaya a ir mejor después. Las más altas a 1 año muchas veces son las más volátiles.</li>
      <li>Compara el rendimiento <b>con su caída máxima</b>: una empresa que dio 30% al año pero llegó a caer 60% exige mucho estómago.</li>
      <li>Mira si los sectores se mueven distinto: tener empresas de varios sectores te protege cuando a uno le va mal. Un ETF como VOO o NAFTRAC ya trae muchos sectores en uno solo.</li>
      <li>Usa <b>+ Lista</b> para seguir una empresa en Detalle o practicar con ella en la pestaña Práctica.</li>
      <li>Walmex, Bimbo, Banorte, Grupo México y otras emisoras solo cotizan en la BMV; agrégalas desde Resumen › Agregar › BMV.</li>
    </ul></div>
    <p class="nota">Lista de empresas elegida para cubrir los sectores principales; no es un índice oficial ni una recomendación. ${!cargando ? '<a href="#" data-accion="rkActualizar">Volver a descargar el ranking</a>' : ''}</p>`;
}

export function eventosRanking(ev, ctx) {
  const t = ev.target;
  const b = t.closest('[data-rkm],[data-rksec],[data-rkagregar],[data-accion="rkActualizar"]');
  if (b && ev.type === 'click') {
    ev.preventDefault();
    if (b.dataset.rkm) filtro.m = b.dataset.rkm;
    else if (b.dataset.rksec) filtro.sec = filtro.sec === b.dataset.rksec ? 'todos' : b.dataset.rksec;
    else if (b.dataset.rkagregar) {
      const u = UNIVERSO.find((x) => x.s === b.dataset.rkagregar);
      ctx.agregarDesdeRanking({ simbolo: u.s, nombre: u.n, mercado: 'US', fuente: 'td' }, RK[u.s]);
      return;
    } else if (b.dataset.accion === 'rkActualizar') { cargarRanking(ctx, true); return; }
    ctx.refrescar(); return true;
  }
  if (ev.type === 'change' && (t.id === 'rkSec' || t.id === 'rkOrden')) {
    if (t.id === 'rkSec') filtro.sec = t.value; else filtro.orden = t.value;
    ctx.refrescar(); return true;
  }
  return false;
}
