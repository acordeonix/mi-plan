// Gráficas SVG ligeras (sin librerías). Colores vía variables CSS.
const NS = 'http://www.w3.org/2000/svg';
const el = (t, a = {}) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
const t = (d) => Date.parse(d + 'T00:00:00Z');
export const PALETA = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];

function ticksBonitos(min, max, n = 4) {
  const paso0 = (max - min) / n || 1;
  const mag = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= paso0);
  const out = [];
  for (let v = Math.ceil(min / paso) * paso; v <= max + 1e-9; v += paso) out.push(+v.toFixed(10));
  return out;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const etiquetaFecha = (d, largo) => { const [a, m, dd] = d.split('-'); return largo ? `${+dd} ${MESES[+m - 1]} ${a}` : `${MESES[+m - 1]} ${a.slice(2)}`; };

/**
 * series: [{nombre, datos:[{d,c}], color, area?, punteada?}]
 * opts: {alto, formatoY:(v)=>string, linea0?:number}
 */
export function lineas(cont, series, opts = {}) {
  cont.innerHTML = '';
  const datos = series.filter((s) => s.datos?.length > 1);
  if (!datos.length) { cont.innerHTML = '<p class="vacio">Sin datos suficientes para graficar.</p>'; return; }
  const W = Math.max(cont.clientWidth || 600, 280), H = opts.alto || 260;
  const m = { l: 8, r: 54, t: 12, b: 24 };
  const todas = datos.flatMap((s) => s.datos);
  const x0 = Math.min(...datos.map((s) => t(s.datos[0].d))), x1 = Math.max(...datos.map((s) => t(s.datos.at(-1).d)));
  let y0 = Math.min(...todas.map((p) => p.c)), y1 = Math.max(...todas.map((p) => p.c));
  if (opts.linea0 != null) { y0 = Math.min(y0, opts.linea0); y1 = Math.max(y1, opts.linea0); }
  const pad = (y1 - y0) * 0.06 || Math.abs(y1) * 0.05 || 1; y0 -= pad; y1 += pad;
  const X = (d) => m.l + ((t(d) - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const Y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
  const fy = opts.formatoY || ((v) => v.toLocaleString('es-MX', { maximumFractionDigits: 2 }));

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, class: 'graf', role: 'img' });
  for (const v of ticksBonitos(y0, y1)) {
    svg.append(el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'rejilla' }));
    const tx = el('text', { x: W - m.r + 6, y: Y(v) + 4, class: 'eje' }); tx.textContent = fy(v); svg.append(tx);
  }
  if (opts.linea0 != null) svg.append(el('line', { x1: m.l, x2: W - m.r, y1: Y(opts.linea0), y2: Y(opts.linea0), class: 'cero' }));
  const nX = Math.max(2, Math.floor((W - m.l - m.r) / 90));
  for (let i = 0; i <= nX; i++) {
    const tt = x0 + ((x1 - x0) * i) / nX; const d = new Date(tt).toISOString().slice(0, 10);
    const tx = el('text', { x: X(d), y: H - 6, class: 'eje', 'text-anchor': i === 0 ? 'start' : i === nX ? 'end' : 'middle' });
    tx.textContent = etiquetaFecha(d); svg.append(tx);
  }
  datos.forEach((s, i) => {
    const color = s.color || PALETA[i % PALETA.length];
    const pts = s.datos.map((p) => `${X(p.d).toFixed(1)},${Y(p.c).toFixed(1)}`).join(' ');
    if (s.area) {
      const base = Y(opts.linea0 ?? y0);
      svg.append(el('polygon', { points: `${X(s.datos[0].d)},${base} ${pts} ${X(s.datos.at(-1).d)},${base}`, fill: color, opacity: 0.14 }));
    }
    svg.append(el('polyline', { points: pts, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-dasharray': s.punteada ? '5 4' : 'none' }));
  });

  // Tooltip
  const guia = el('line', { y1: m.t, y2: H - m.b, class: 'guia', visibility: 'hidden' });
  const puntos = datos.map((s, i) => el('circle', { r: 4, fill: s.color || PALETA[i % PALETA.length], visibility: 'hidden' }));
  svg.append(guia, ...puntos);
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true;
  cont.style.position = 'relative'; cont.append(svg, tip);
  const buscar = (arr, tt) => { let lo = 0, hi = arr.length - 1; while (lo < hi) { const mm = (lo + hi + 1) >> 1; if (t(arr[mm].d) <= tt) lo = mm; else hi = mm - 1; } return arr[lo]; };
  const mover = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.touches?.[0]?.clientX ?? ev.clientX) - r.left) * (W / r.width);
    const tt = x0 + ((px - m.l) / (W - m.l - m.r)) * (x1 - x0);
    if (tt < x0 || tt > x1) return salir();
    let html = '', d0 = null;
    datos.forEach((s, i) => {
      const p = buscar(s.datos, tt); d0 = d0 || p.d;
      puntos[i].setAttribute('cx', X(p.d)); puntos[i].setAttribute('cy', Y(p.c)); puntos[i].setAttribute('visibility', 'visible');
      html += `<div><i style="background:${s.color || PALETA[i % PALETA.length]}"></i>${s.nombre}: <b>${fy(p.c)}</b></div>`;
    });
    guia.setAttribute('x1', X(d0)); guia.setAttribute('x2', X(d0)); guia.setAttribute('visibility', 'visible');
    tip.innerHTML = `<small>${etiquetaFecha(d0, true)}</small>${html}`; tip.hidden = false;
    const izq = (X(d0) / W) * r.width;
    tip.style.left = `${Math.min(Math.max(izq + 12, 0), r.width - tip.offsetWidth - 4)}px`;
    if (izq + 12 + tip.offsetWidth > r.width) tip.style.left = `${Math.max(izq - tip.offsetWidth - 12, 0)}px`;
  };
  const salir = () => { tip.hidden = true; guia.setAttribute('visibility', 'hidden'); puntos.forEach((p) => p.setAttribute('visibility', 'hidden')); };
  svg.addEventListener('mousemove', mover); svg.addEventListener('touchmove', mover, { passive: true });
  svg.addEventListener('mouseleave', salir); svg.addEventListener('touchend', salir);

  if (datos.length > 1 && opts.leyenda !== false) {
    const ley = document.createElement('div'); ley.className = 'leyenda';
    ley.innerHTML = datos.map((s, i) => `<span><i style="background:${s.color || PALETA[i % PALETA.length]}"></i>${s.nombre}</span>`).join('');
    cont.append(ley);
  }
}

export function mini(datos, positivo) {
  if (!datos || datos.length < 2) return '';
  const W = 120, H = 36;
  const ys = datos.map((p) => p.c); const a = Math.min(...ys), b = Math.max(...ys);
  const pts = datos.map((p, i) => `${((i / (datos.length - 1)) * W).toFixed(1)},${(H - 2 - ((p.c - a) / (b - a || 1)) * (H - 4)).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="mini" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${positivo ? 'var(--sube)' : 'var(--baja)'}" stroke-width="1.6"/></svg>`;
}

// Barras de rendimiento por año
export function barras(cont, items, fmt) {
  cont.innerHTML = '';
  if (!items.length) return;
  const W = Math.max(cont.clientWidth || 600, 280), H = 180, m = { l: 8, r: 8, t: 16, b: 22 };
  const max = Math.max(...items.map((i) => Math.abs(i.v)), 0.01);
  const Y = (v) => m.t + (H - m.t - m.b) / 2 - (v / max) * ((H - m.t - m.b) / 2);
  const bw = (W - m.l - m.r) / items.length;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, class: 'graf' });
  svg.append(el('line', { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0), class: 'cero' }));
  items.forEach((it, i) => {
    const x = m.l + i * bw + bw * 0.15, w = bw * 0.7;
    const y = Math.min(Y(0), Y(it.v)), h = Math.abs(Y(it.v) - Y(0));
    svg.append(el('rect', { x, y, width: w, height: Math.max(h, 1), rx: 2, fill: it.v >= 0 ? 'var(--sube)' : 'var(--baja)', opacity: it.parcial ? 0.55 : 0.9 }));
    if (bw > 30) { const tx = el('text', { x: x + w / 2, y: it.v >= 0 ? y - 4 : y + h + 11, class: 'eje', 'text-anchor': 'middle' }); tx.textContent = fmt(it.v); svg.append(tx); }
    const lb = el('text', { x: x + w / 2, y: H - 6, class: 'eje', 'text-anchor': 'middle' }); lb.textContent = it.l; svg.append(lb);
  });
  cont.append(svg);
}
