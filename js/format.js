const fmtMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const fmtMXN2 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const money = (v) => (v === null || v === undefined || v === '' || isNaN(v) ? '—' : fmtMXN.format(Math.round(Number(v)) || 0));
export const money2 = (v) => (v === null || v === undefined || v === '' || isNaN(v) ? '—' : fmtMXN2.format(Number(v)));
export const pct = (v, d = 0) => (v === null || v === undefined || isNaN(v) ? '—' : `${(Number(v) * 100).toFixed(d)}%`);
export const int = (v) => (v === null || v === undefined || isNaN(v) ? '—' : String(Math.round(v)));
export const mes = (s) => { if (!s) return '—'; const [y, m] = s.split('-'); return `${MESES[Number(m) - 1]} ${y}`; };
export const mesLargo = (s) => { if (!s) return '—'; const [y, m] = s.split('-'); return `${MESES_L[Number(m) - 1]} ${y}`; };
export const dia = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${Number(d)} ${MESES[Number(m) - 1]} ${y.slice(2)}`; };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const hoyISO = () => { const d = new Date(); const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const getPath = (o, p) => p.split('.').reduce((a, k) => (a === null || a === undefined ? undefined : a[k]), o);
export const setPath = (o, p, v) => { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach((k) => { if (a[k] === undefined || a[k] === null) a[k] = {}; a = a[k]; }); a[ks[ks.length - 1]] = v; };
