// Cálculos de rendimiento y riesgo. Todas las series son [{d:'YYYY-MM-DD', c:Number}] en orden ascendente.

const DIA = 86400000;
const toT = (d) => Date.parse(d + 'T00:00:00Z');

export function periodosPorAnio(serie) {
  if (serie.length < 3) return 252;
  const dias = (toT(serie.at(-1).d) - toT(serie[0].d)) / DIA;
  const p = (serie.length - 1) / (dias / 365.25);
  if (p > 150) return 252;
  if (p > 30) return 52;
  return 12;
}

// Último precio en o antes de una fecha
export function precioEn(serie, fechaT) {
  let lo = 0, hi = serie.length - 1, r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (toT(serie[m].d) <= fechaT) { r = m; lo = m + 1; } else hi = m - 1;
  }
  return r >= 0 ? serie[r] : null;
}

export function rendimiento(serie, dias) {
  if (serie.length < 2) return null;
  const fin = serie.at(-1);
  const objetivo = toT(fin.d) - dias * DIA;
  if (toT(serie[0].d) > objetivo + 7 * DIA) return null; // historia insuficiente
  const ini = precioEn(serie, objetivo) || serie[0];
  return fin.c / ini.c - 1;
}

export function rendimientoAnualizado(serie, anios) {
  const r = rendimiento(serie, Math.round(anios * 365.25));
  return r == null ? null : Math.pow(1 + r, 1 / anios) - 1;
}

export function rendimientoYTD(serie) {
  if (serie.length < 2) return null;
  const fin = serie.at(-1);
  const y = fin.d.slice(0, 4);
  const ini = precioEn(serie, toT(`${Number(y) - 1}-12-31`));
  return ini ? fin.c / ini.c - 1 : null;
}

export function recortar(serie, dias) {
  if (!dias || !serie.length) return serie;
  const desde = toT(serie.at(-1).d) - dias * DIA;
  return serie.filter((p) => toT(p.d) >= desde);
}

export function volatilidad(serie) {
  if (serie.length < 10) return null;
  const r = [];
  for (let i = 1; i < serie.length; i++) r.push(Math.log(serie[i].c / serie[i - 1].c));
  const m = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v * periodosPorAnio(serie));
}

export function drawdowns(serie) {
  let pico = -Infinity, max = 0, picoD = null, maxIni = null, maxFin = null, picoMax = null;
  const curva = serie.map((p) => {
    if (p.c > pico) { pico = p.c; picoD = p.d; }
    const dd = p.c / pico - 1;
    if (dd < max) { max = dd; maxFin = p.d; maxIni = picoD; picoMax = pico; }
    return { d: p.d, c: dd };
  });
  // fecha de recuperación de la peor caída
  let recup = null;
  if (maxFin) {
    const i = serie.findIndex((p) => p.d === maxFin);
    for (let j = i; j < serie.length; j++) if (serie[j].c >= picoMax) { recup = serie[j].d; break; }
  }
  return { curva, max, actual: curva.length ? curva.at(-1).c : 0, ini: maxIni, fin: maxFin, recup };
}

// Rendimientos mensuales (último cierre de cada mes)
export function mensuales(serie) {
  const fin = new Map();
  for (const p of serie) fin.set(p.d.slice(0, 7), p);
  const arr = [...fin.values()];
  const out = [];
  for (let i = 1; i < arr.length; i++) out.push({ m: arr[i].d.slice(0, 7), r: arr[i].c / arr[i - 1].c - 1 });
  return out;
}

export function anuales(serie) {
  const fin = new Map();
  for (const p of serie) fin.set(p.d.slice(0, 4), p);
  const arr = [...fin.entries()];
  const out = [];
  for (let i = 1; i < arr.length; i++) out.push({ a: arr[i][0], r: arr[i][1].c / arr[i - 1][1].c - 1, parcial: i === arr.length - 1 });
  return out;
}

// CETES: serie de tasas anuales en % ([{d, c: 10.5}]) -> índice acumulado (base 1)
// Cada tasa se aplica desde su fecha hasta la siguiente, con capitalización por días (base 360, como CETES).
export function indiceCetes(tasas, hasta) {
  if (!tasas.length) return [];
  const out = [{ d: tasas[0].d, c: 1 }];
  let v = 1;
  for (let i = 0; i < tasas.length; i++) {
    const ini = toT(tasas[i].d);
    const fin = i + 1 < tasas.length ? toT(tasas[i + 1].d) : (hasta ? toT(hasta) : ini);
    const dias = Math.max(0, (fin - ini) / DIA);
    v *= 1 + (tasas[i].c / 100) * (dias / 360);
    if (dias > 0) out.push({ d: new Date(fin).toISOString().slice(0, 10), c: v });
  }
  return out;
}

export function tasaPromedio(tasas, dias) {
  const t = recortar(tasas, dias);
  if (!t.length) return null;
  return t.reduce((a, b) => a + b.c, 0) / t.length / 100;
}

// Convierte una serie en USD a MXN con el tipo de cambio FIX
export function aPesos(serie, fx) {
  if (!fx?.length) return serie;
  return serie.map((p) => { const f = precioEn(fx, toT(p.d)); return f ? { d: p.d, c: p.c * f.c } : null; }).filter(Boolean);
}

// Normaliza a base 100 desde una fecha común
export function base100(serie, desdeD) {
  const s = serie.filter((p) => p.d >= desdeD);
  if (!s.length) return [];
  const b = s[0].c;
  return s.map((p) => ({ d: p.d, c: (p.c / b) * 100 }));
}

// Simulación de ahorro mensual (aportación fija el primer día hábil de cada mes)
export function simularAportaciones(serie, montoMensual, inicial = 0) {
  if (serie.length < 2) return null;
  let unidades = 0, aportado = 0, mesPrevio = null;
  const curva = [];
  serie.forEach((p, i) => {
    const mes = p.d.slice(0, 7);
    if (i === 0 && inicial > 0) { unidades += inicial / p.c; aportado += inicial; }
    if (mes !== mesPrevio) { unidades += montoMensual / p.c; aportado += montoMensual; mesPrevio = mes; }
    curva.push({ d: p.d, valor: unidades * p.c, aportado });
  });
  const f = curva.at(-1);
  return { curva, final: f.valor, aportado: f.aportado, ganancia: f.valor - f.aportado };
}

export function resumen(serie, tasasCetes) {
  if (!serie || serie.length < 2) return null;
  const dd = drawdowns(serie);
  const vol = volatilidad(recortar(serie, 365 * 3)) ?? volatilidad(serie);
  const r1a = rendimiento(serie, 365);
  const r3a = rendimientoAnualizado(serie, 3);
  const r5a = rendimientoAnualizado(serie, 5);
  const cetes1a = tasasCetes?.length ? tasaPromedio(tasasCetes, 365) : null;
  const cetes3a = tasasCetes?.length ? tasaPromedio(tasasCetes, 365 * 3) : null;
  const mens = mensuales(serie);
  const positivos = mens.length ? mens.filter((m) => m.r > 0).length / mens.length : null;
  const base = r3a ?? r1a;
  const libre = r3a != null ? cetes3a : cetes1a;
  return {
    precio: serie.at(-1).c, fecha: serie.at(-1).d,
    r1d: serie.length > 1 ? serie.at(-1).c / serie.at(-2).c - 1 : null,
    r1m: rendimiento(serie, 30), r3m: rendimiento(serie, 91), ytd: rendimientoYTD(serie),
    r1a, r3a, r5a, vol, ddMax: dd.max, ddActual: dd.actual, ddIni: dd.ini, ddFin: dd.fin, ddRecup: dd.recup,
    positivos, cetes1a,
    vsCetes1a: r1a != null && cetes1a != null ? r1a - cetes1a : null,
    // Rendimiento extra sobre CETES por cada unidad de volatilidad (tipo Sharpe)
    eficiencia: base != null && libre != null && vol > 0.01 ? (base - libre) / vol : null,
  };
}
