// Motor de cálculo del plan. Réplica de las fórmulas del Excel "Plan_Recapitalizacion_Jonathan".
// Todas las funciones son puras: reciben el estado (datos, semanas, cargos, suscripciones) y devuelven resultados.

// ---------- utilidades de fechas (meses como índice entero) ----------
export const mIdx = (s) => { const [y, m] = s.slice(0, 7).split('-').map(Number); return y * 12 + (m - 1); };
export const mKey = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
export const mYear = (i) => Math.floor(i / 12);
export const mMonth = (i) => (i % 12) + 1;
const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const isoD = (dt) => dt.toISOString().slice(0, 10);
export const addDays = (s, n) => { const d = parseD(s); d.setUTCDate(d.getUTCDate() + n); return isoD(d); };
export const monthEnd = (i) => isoD(new Date(Date.UTC(mYear(i), mMonth(i), 0)));

// ---------- finanzas (convención de Excel) ----------
export function PMT(r, n, pv, fv = 0) {
  if (n <= 0) return 0;
  if (r === 0) return -(pv + fv) / n;
  const f = Math.pow(1 + r, n);
  return -(r * (pv * f + fv)) / (f - 1);
}
export function PV(r, n, pmt, fv = 0) {
  if (n <= 0) return -fv;
  if (r === 0) return -(fv + pmt * n);
  const f = Math.pow(1 + r, n);
  return -(fv + pmt * (f - 1) / r) / f;
}
export function FV(r, n, pmt, pv = 0) {
  if (r === 0) return -(pv + pmt * n);
  const f = Math.pow(1 + r, n);
  return -(pv * f + pmt * (f - 1) / r);
}
const sum = (a) => a.reduce((s, x) => s + (Number(x) || 0), 0);
const num = (x, d = 0) => (x === null || x === undefined || x === '' || isNaN(Number(x)) ? d : Number(x));

// ---------- derivados de "Datos" ----------
export function derivados(D) {
  const ingresoMensual = D.ingresoSemanal * 52 / 12;
  const colchonInicial = D.saldoCuentaInicial - D.pagoInicialBanamex;
  const gastoEsencial = (D.jazminSemanal + D.gasolinaSemanal) * 52 / 12 + D.renta + D.escuela;
  const metaFondo = gastoEsencial * D.mesesFondo;
  const t = D.terreno;
  const mesesTerreno = Math.max(1, mIdx(t.limite) - mIdx(t.reanudar) + 1);
  const terrenoMensual = Math.max(t.pagoUSD, t.saldoUSD / mesesTerreno) * D.tipoCambio;
  const terrenoAbono = num(t.abonoMeses) * t.pagoUSD * D.tipoCambio;
  const terrenoValor = (t.valorMXN === null || t.valorMXN === undefined || t.valorMXN === '') ? t.saldoUSD * D.tipoCambio : Number(t.valorMXN);
  const ac = D.acordeones;
  const netoAcordeon = ac.precio - ac.impuesto - ac.costo;
  const A = D.acordeonix;
  const impuestoPct = ac.precio ? ac.impuesto / ac.precio : 0;
  const utilidadAcordeon = ac.precio - ac.precio * impuestoPct - A.costo;
  const ingresoAcordeonix = A.ventasMes * utilidadAcordeon * (1 - A.reserva) * A.parte;
  const porAcordeonParaTi = utilidadAcordeon * (1 - A.reserva) * A.parte;
  const P = D.prestamo;
  const pagosFaltan = Math.max(0, P.total - P.hechos);
  const prestamoSaldo = pagosFaltan * P.pago;
  const prestamoUltimo = mIdx(P.mesSiguiente) + pagosFaltan - 1;
  const pagosEnLiq = Math.max(0, pagosFaltan - (mIdx(P.mesLiquidar) - mIdx(P.mesSiguiente)));
  const montoLiq = Math.max(0, pagosEnLiq * P.pago - num(P.descuento));
  const autosMensual = sum(D.autos.items.map((x) => x.anual)) / 12;
  const deudaTotal = sum(D.deudas.map((d) => d.saldo));
  const minimosTotal = sum(D.deudas.map((d) => d.minimo));
  const tasaProm = deudaTotal ? sum(D.deudas.map((d) => d.saldo * d.tasa)) / deudaTotal : 0;
  const estacionalesTotal = sum(D.estacionales.map((e) => e.monto));
  return { ingresoMensual, colchonInicial, gastoEsencial, metaFondo, mesesTerreno, terrenoMensual, terrenoAbono, terrenoValor,
    netoAcordeon, impuestoPct, utilidadAcordeon, ingresoAcordeonix, porAcordeonParaTi, pagosFaltan, prestamoSaldo, prestamoUltimo,
    pagosEnLiq, montoLiq, autosMensual, deudaTotal, minimosTotal, tasaProm, estacionalesTotal,
    activosMXN: D.activos.usd * D.tipoCambio };
}

export function suscripcionesResumen(subs) {
  const activas = subs.filter((s) => s.servicio && !s.cancelada);
  const mensual = sum(activas.map((s) => s.monto));
  return {
    mensual,
    anual: mensual * 12,
    ahorroMarcadas: sum(activas.filter((s) => s.decision === 'Cancelar').map((s) => s.monto)),
    yaCanceladas: sum(subs.filter((s) => s.cancelada).map((s) => s.monto)),
    enTarjeta: sum(activas.filter((s) => String(s.medio || '').startsWith('Tarjeta')).map((s) => s.monto)),
  };
}

// Viernes de un mes a partir de la fecha de inicio
function viernesEnMes(i, fechaInicio) {
  const y = mYear(i), m = mMonth(i);
  let c = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1) break;
    if (dt.getUTCDay() === 5 && isoD(dt) >= fechaInicio) c++;
  }
  return c;
}

// ---------- Presupuesto semanal ----------
export function presupuesto(D, X, subsMensual) {
  const subsW = subsMensual * (1 - D.suscripcionesEnOtros) * 12 / 52;
  const start = mIdx(D.fechaInicio);
  const f1 = {
    ingreso: D.ingresoSemanal, jazmin: D.jazminSemanal, gasolina: D.gasolinaSemanal, renta: D.renta * 12 / 52, escuela: D.escuela * 12 / 52,
    otros: D.otrosFase1 * 12 / 52, colchon: D.aportMinColchon * 12 / 52, estacionales: X.estacionalesTotal / 52,
    terreno: mIdx(D.terreno.reanudar) > start ? 0 : X.terrenoMensual * 12 / 52,
  };
  f1.plan = f1.ingreso - (f1.jazmin + f1.gasolina + f1.renta + f1.escuela + f1.otros + f1.colchon + f1.estacionales + f1.terreno)
    - subsW - D.prestamo.pago * 12 / 52 - X.autosMensual * 12 / 52;
  const f2 = { ...f1, otros: D.otrosFase2 * 12 / 52, colchon: 0, terreno: X.terrenoMensual * 12 / 52 };
  f2.plan = f2.ingreso - (f2.jazmin + f2.gasolina + f2.renta + f2.escuela + f2.otros + f2.colchon + f2.estacionales + f2.terreno)
    - subsW - X.autosMensual * 12 / 52 - D.vacaciones.monto2 * 12 / 52;
  return { f1, f2, subsW, autosW: X.autosMensual * 12 / 52, prestamoW: D.prestamo.pago * 12 / 52, vacW: D.vacaciones.monto2 * 12 / 52 };
}

// ---------- Plan mensual + deudas ----------
export function plan(D, cargos, subsMensual, hoyISO) {
  const X = derivados(D);
  const start = mIdx(D.fechaInicio);
  const end = (mYear(start) + 1) * 12 + 11; // diciembre del año siguiente
  const hoyM = mIdx(hoyISO);
  const nombres = D.deudas.map((d) => d.nombre);
  const cargosMes = (k, i) => sum(cargos.filter((c) => c.tarjeta === nombres[k] && c.fecha && mIdx(c.fecha) === i).map((c) => c.monto));
  const P = D.prestamo, A = D.acordeonix, T = D.terreno;
  let finales = D.deudas.map((d) => d.saldo);
  let ahorroPrev = X.colchonInicial, terrenoPrev = T.saldoUSD * D.tipoCambio, prestamoPrev = X.prestamoSaldo;
  let cumAF = 0, cumAE = 0, interesTotal = 0;
  const filas = [];
  for (let i = start; i <= end; i++) {
    const nCargos = D.deudas.map((_, k) => cargosMes(k, i));
    const inicio = finales.map((f, k) => f + nCargos[k]);
    const interes = inicio.map((s, k) => s * D.deudas[k].tasa);
    const minimo = inicio.map((s, k) => Math.min(s + interes[k], D.deudas[k].minimo));
    const deudaInicio = sum(inicio);
    const fase1 = deudaInicio > 0.5;
    const semanas = viernesEnMes(i, D.fechaInicio);
    const same = (s) => s && mIdx(s) === i;
    const r = { mes: mKey(i), idx: i, semanas, fase1 };
    r.nomina = semanas * D.ingresoSemanal;
    r.bono = (i >= mIdx(D.bono.desde) && mMonth(i) === mMonth(mIdx(D.bono.desde))) ? D.bono.monto : 0;
    r.fondo = (i >= mIdx(D.fondoAhorro.desde) && mMonth(i) === mMonth(mIdx(D.fondoAhorro.desde))) ? D.fondoAhorro.monto : 0;
    r.activos = (D.activos.vender === 1 && same(D.activos.mes)) ? X.activosMXN : 0;
    r.acordeones = (i >= mIdx(D.acordeones.mesPrimera) && i < mIdx(D.acordeones.mesPrimera) + D.acordeones.cantidad) ? X.netoAcordeon : 0;
    r.otrosIngresos = sum(D.otrosIngresos.filter((o) => same(o.mes)).map((o) => o.monto));
    r.acordeonixIngreso = (A.incluir === 1 && i >= mIdx(A.mesRegreso) + A.mesesArranque) ? X.ingresoAcordeonix : 0;
    r.ingresoTotal = r.nomina + r.bono + r.fondo + r.activos + r.acordeones + r.otrosIngresos + r.acordeonixIngreso;
    r.jazmin = semanas * D.jazminSemanal;
    r.gasolina = semanas * D.gasolinaSemanal;
    r.renta = D.renta; r.escuela = D.escuela;
    r.otros = fase1 ? D.otrosFase1 : D.otrosFase2;
    r.estacionales = sum(D.estacionales.filter((e) => same(e.mes)).map((e) => e.monto));
    r.terreno = i >= mIdx(T.reanudar) ? Math.min(terrenoPrev, X.terrenoMensual + (same(T.mesAbono) ? X.terrenoAbono : 0)) : 0;
    r.terrenoSaldo = terrenoPrev - r.terreno; terrenoPrev = r.terrenoSaldo;
    r.acordeonixInversion = (A.incluir === 1 && same(A.mesRegreso)) ? A.inversion : 0;
    r.suscripciones = i > hoyM ? subsMensual * (1 - D.suscripcionesEnOtros) : 0;
    const liqI = mIdx(P.mesLiquidar);
    if (P.liquidar === 1 && i > liqI) r.prestamo = 0;
    else if (P.liquidar === 1 && i === liqI) r.prestamo = X.montoLiq;
    else r.prestamo = (i >= mIdx(P.mesSiguiente) && i <= X.prestamoUltimo) ? P.pago : 0;
    r.prestamoSaldo = (P.liquidar === 1 && i >= liqI) ? 0 : Math.max(0, prestamoPrev - r.prestamo); prestamoPrev = r.prestamoSaldo;
    r.vacaciones = i < mIdx(D.vacaciones.desde) ? 0 : (mYear(i) >= D.vacaciones.anio2 ? D.vacaciones.monto2 : D.vacaciones.monto1);
    r.autos = i < mIdx(D.autos.desde) ? 0 : X.autosMensual;
    r.gastoTotal = r.jazmin + r.gasolina + r.renta + r.escuela + r.otros + r.estacionales + r.terreno + r.acordeonixInversion
      + r.suscripciones + r.prestamo + r.vacaciones + r.autos;
    r.disponible = r.ingresoTotal - r.gastoTotal;
    r.aportColchon = fase1 ? Math.min(Math.max(r.disponible, 0), D.aportMinColchon) : 0;
    r.presupuestoDeudas = Math.max(r.disponible - r.aportColchon, 0);
    // pagos extra en orden de prioridad
    const bolsa = Math.max(0, r.presupuestoDeudas - sum(minimo));
    let usado = 0;
    const extra = inicio.map((s, k) => { const e = Math.max(0, Math.min(s + interes[k] - minimo[k], bolsa - usado)); usado += e; return e; });
    const pago = minimo.map((m, k) => m + extra[k]);
    finales = inicio.map((s, k) => Math.round((s + interes[k] - pago[k]) * 100) / 100);
    r.tarjetas = D.deudas.map((d, k) => ({ nombre: d.nombre, inicio: inicio[k], cargos: nCargos[k], interes: interes[k], minimo: minimo[k], extra: extra[k], pago: pago[k], final: finales[k] }));
    r.deudaInicio = deudaInicio;
    r.interes = sum(interes); interesTotal += r.interes;
    r.pagadoDeudas = sum(pago);
    r.ahorroMes = r.disponible - r.pagadoDeudas;
    r.rendimiento = ahorroPrev * D.rendMensual;
    r.ahorroAcum = ahorroPrev + r.ahorroMes + r.rendimiento; ahorroPrev = r.ahorroAcum;
    r.fondoEmergencia = Math.max(0, Math.min(r.ahorroAcum, X.metaFondo));
    r.reinversion = r.ahorroAcum - r.fondoEmergencia;
    r.deudaCierre = sum(finales);
    r.patrimonio = r.ahorroAcum + X.terrenoValor - r.deudaCierre - r.terrenoSaldo - r.prestamoSaldo;
    cumAF += r.acordeonixIngreso; cumAE += r.acordeonixInversion;
    r.patrimonioSinAcordeonix = r.patrimonio - cumAF + cumAE;
    r.fase = fase1 ? '1 · Salir de deudas' : ((A.incluir === 1 && i >= mIdx(A.mesRegreso)) ? '3 · Acordeonix' : '2 · Capitalizar');
    filas.push(r);
  }
  // línea de tiempo
  const inicioPt = {
    fecha: D.fechaInicio, deuda: X.deudaTotal, terreno: T.saldoUSD * D.tipoCambio, ahorro: X.colchonInicial, prestamo: X.prestamoSaldo,
  };
  inicioPt.patrimonio = inicioPt.ahorro + X.terrenoValor - inicioPt.deuda - inicioPt.terreno - inicioPt.prestamo;
  inicioPt.fondo = Math.min(inicioPt.ahorro, X.metaFondo); inicioPt.sinAcordeonix = inicioPt.patrimonio;
  const puntos = [inicioPt, ...filas.map((r) => ({ fecha: monthEnd(r.idx), deuda: r.deudaCierre, terreno: r.terrenoSaldo, ahorro: r.ahorroAcum,
    patrimonio: r.patrimonio, fondo: r.fondoEmergencia, sinAcordeonix: r.patrimonioSinAcordeonix, prestamo: r.prestamoSaldo }))];
  const primero = (fn) => { for (let k = 1; k < puntos.length; k++) if (fn(puntos[k], puntos[k - 1])) return puntos[k].fecha; return null; };
  const hitos = {
    patrimonioHoy: inicioPt.patrimonio,
    libreTarjetas: primero((p) => p.deuda < 1),
    superavit: primero((p) => p.patrimonio >= 0),
    fondoCompleto: primero((p) => p.fondo >= X.metaFondo - 1),
    terrenoPagado: primero((p) => p.terreno < 1),
    patrimonioFinal: puntos[puntos.length - 1].patrimonio,
  };
  hitos.mejora = hitos.patrimonioFinal - hitos.patrimonioHoy;
  // semáforo de Acordeonix
  const ri = filas.findIndex((r) => r.idx === mIdx(A.mesRegreso));
  const prev = ri > 0 ? filas[ri - 1] : null;
  const sem = prev ? {
    tarjetasCero: prev.deudaCierre < 1,
    fondoCompleto: prev.fondoEmergencia >= X.metaFondo - 1,
    inversionOk: A.inversion <= 0.5 * prev.reinversion,
    reinversionDisponible: prev.reinversion,
  } : { tarjetasCero: false, fondoCompleto: false, inversionOk: false, reinversionDisponible: 0 };
  sem.listo = sem.tarjetasCero && sem.fondoCompleto && sem.inversionOk;
  hitos.acordeonixListo = sem.listo;
  hitos.aporteAcordeonix = hitos.patrimonioFinal - puntos[puntos.length - 1].sinAcordeonix;
  return { X, filas, puntos, hitos, semaforoAcordeonix: sem, interesTotal };
}

// ---------- Escenarios (modelo simplificado) ----------
export function escenarios(D, P) {
  const X = P.X;
  const otrosEsc = [8000, D.otrosFase1, 4500, D.otrosFase1];
  const vende = [0, 0, 0, 1];
  const nombres = ['A · Sin ajuste', 'B · Plan base', 'C · Modo austero', 'D · Plan base + vender activos'];
  const res = nombres.map((nombre, s) => {
    let prev = X.deudaTotal; const serie = [prev]; let suma = prev;
    P.filas.forEach((r, idx) => {
      const cargosMes = sum(r.tarjetas.map((t) => t.cargos));
      const venta = vende[s] * (D.activos.mes && mIdx(D.activos.mes) === r.idx ? 1 : 0) * X.activosMXN;
      const disp = r.ingresoTotal - r.activos + venta - (r.jazmin + r.gasolina + r.renta + r.escuela + r.estacionales + r.terreno + r.suscripciones + r.prestamo + r.vacaciones + r.autos)
        - otrosEsc[s] - (prev > 0.5 ? D.aportMinColchon : 0);
      const v = Math.max(0, prev * (1 + X.tasaProm) + cargosMes - disp);
      if (idx < P.filas.length - 1) suma += v;
      prev = v; serie.push(v);
    });
    const li = serie.findIndex((v, k) => k > 0 && v < 1);
    return { nombre, otros: otrosEsc[s], vende: vende[s], serie, libre: li > 0 ? P.filas[li - 1].mes : null, intereses: suma * X.tasaProm };
  });
  res.forEach((r) => { r.ahorroVsA = res[0].intereses - r.intereses; });
  return { tasaProm: X.tasaProm, escenarios: res };
}

// ---------- Metas: casa y auto ----------
export function metas(D, P, pres) {
  const M = D.metas, X = P.X;
  const ingreso = X.ingresoMensual + num(M.ingresoExtra);
  const plazoEf = Math.max(1, Math.min(M.plazoCasa, 70 - M.edad));
  const n = plazoEf * 12, r = M.tasaCasa / 12;
  const pago = M.usarCredito === 2 ? PMT(r, n, -M.creditoAprobado) : ingreso * M.pctCasa;
  const credito = M.usarCredito === 2 ? M.creditoAprobado : Math.min(PV(r, n, -pago), M.creditoAprobado);
  const aport = M.bruto * 0.05;
  const costoCasa = M.precioCasa * (1 + M.gastosCasa);
  const hoyCasa = (credito + M.subcuenta) / (1 + M.gastosCasa);
  const creditoNecesario = Math.max(0, costoCasa - M.subcuenta);
  const pagoNecesario = creditoNecesario === 0 ? 0 : PMT(r, n, -creditoNecesario);
  const ingresoNecesario = pagoNecesario / M.pctCasa;
  const auto = {};
  auto.enganche = M.autoPrecio * M.autoEnganche;
  auto.financiar = M.autoPrecio - auto.enganche;
  auto.pago = PMT(M.autoTasa / 12, M.autoPlazo, -auto.financiar);
  auto.seguro = M.autoPrecio * M.autoSeguro / 12;
  auto.costo = auto.pago + auto.seguro;
  auto.pct = auto.costo / ingreso;
  auto.maximo = ingreso * M.autoPct / ((1 - M.autoEnganche) * PMT(M.autoTasa / 12, M.autoPlazo, -1) + M.autoSeguro / 12);
  auto.extraNecesario = Math.max(0, auto.costo / M.autoPct - ingreso);
  const capacidad = pres.f2.plan * 52 / 12 + X.terrenoMensual + X.ingresoAcordeonix * D.acordeonix.incluir + num(M.ingresoExtra);
  const last = P.filas[P.filas.length - 1];
  const inicial = last.reinversion * M.pctReinvMetas;
  const rAh = D.rendMensual; // anual/12
  const start0 = last.idx; const base = mIdx(D.fechaInicio);
  const sub = (i) => FV(M.subcuenta === 0 && M.rendSubcuenta === 0 ? 0 : M.rendSubcuenta / 12, i - base, -aport, -M.subcuenta);
  const incl = M.autoIncluir;
  const tabla = [];
  let row = { idx: start0, subcuenta: sub(start0), casa: inicial * (1 - M.pctAuto * incl), auto: inicial * M.pctAuto * incl, pagoAuto: 0 };
  row.recursos = row.casa + row.subcuenta + credito; row.casaLista = row.recursos >= costoCasa;
  row.autoComprado = incl === 1 && row.auto >= auto.enganche; row.mesCompra = row.autoComprado ? start0 : null;
  tabla.push(row);
  for (let k = 1; k <= 121; k++) {
    const p = row, i = start0 + k;
    const aportAuto = (incl === 0 || p.autoComprado) ? 0 : capacidad * M.pctAuto;
    const pagoAuto = !p.autoComprado ? 0 : ((i - p.mesCompra) <= M.autoPlazo ? auto.costo : 0);
    const extras = M.pctBonoCasa * ((mMonth(i) === 12 ? D.bono.monto : 0) + (mMonth(i) === 1 ? D.fondoAhorro.monto : 0));
    const casa = p.casa * (1 + rAh) + capacidad - aportAuto - pagoAuto + extras;
    const autoS = p.autoComprado ? 0 : p.auto * (1 + rAh) + aportAuto;
    const comprado = p.autoComprado ? true : (incl === 1 && autoS >= auto.enganche);
    row = { idx: i, subcuenta: sub(i), casa, auto: autoS, pagoAuto, autoComprado: comprado, mesCompra: p.mesCompra !== null ? p.mesCompra : (comprado ? i : null) };
    row.recursos = row.casa + row.subcuenta + credito; row.casaLista = row.recursos >= costoCasa;
    tabla.push(row);
  }
  const casaLista = tabla.slice(1).find((t) => t.casaLista);
  const autoListo = tabla.slice(1).find((t) => t.autoComprado);
  return {
    ingreso, plazoEf, pago, credito, aport, costoCasa, hoyCasa, creditoNecesario, pagoNecesario, pctNecesario: pagoNecesario / ingreso,
    ingresoNecesario, extraCasa: Math.max(0, ingresoNecesario - ingreso), engancheExtra: Math.max(0, costoCasa - credito - M.subcuenta),
    masQueRenta: Math.min(pago, pagoNecesario) - D.renta, auto, capacidad, inicial,
    dosMetasPct: (Math.min(pago, pagoNecesario) + auto.costo * incl) / ingreso,
    casaLista: casaLista ? mKey(casaLista.idx) : null, autoListo: incl ? (autoListo ? mKey(autoListo.idx) : null) : 'no', tabla,
  };
}

// ---------- Sueños ----------
export function suenos(D, P, MT) {
  const M = D.metas, S = D.suenos, X = P.X;
  const base = mIdx(D.fechaInicio), y0 = mYear(base);
  const anos = [];
  const perUnit = X.porAcordeonParaTi;
  for (let y = y0 + 2; y <= y0 + 9; y++) {
    const subc = FV(M.rendSubcuenta / 12, (y - y0) * 12 + 7 - mMonth(base), -MT.aport, -M.subcuenta);
    const pagoCasa = PMT(M.tasaCasa / 12, MT.plazoEf * 12, -Math.min(M.topeInfonavit, Math.max(0, MT.costoCasa - subc)));
    const autoC = MT.auto.costo;
    const ingCA = Math.max(pagoCasa / M.pctCasa, autoC / M.autoPct, (pagoCasa + autoC) / S.maxDeudas);
    const ingC = pagoCasa / M.pctCasa;
    const nomina = MT.ingreso * 0 + X.ingresoMensual * Math.pow(1 + S.aumento, y - y0);
    const accCA = Math.max(0, ingCA - nomina), accC = Math.max(0, ingC - nomina);
    anos.push({ anio: y, subcuenta: subc, pagoCasa, autoCosto: autoC, ingresoCasaAuto: ingCA, ingresoCasa: ingC, nomina,
      acordeonixCasaAuto: accCA, acordeonixCasa: accC, acordeonesCasaAuto: perUnit > 0 ? Math.ceil(accCA / perUnit - 1e-9) : 0,
      acordeonesCasa: perUnit > 0 ? Math.ceil(accC / perUnit - 1e-9) : 0 });
  }
  anos.forEach((a) => { a.ventasCasa = a.acordeonesCasa * D.acordeones.precio; });
  const meta = anos.find((a) => a.anio === S.anioMeta);
  const necesario = meta ? (S.conAuto === 1 ? meta.acordeonixCasaAuto : meta.acordeonixCasa) : 0;
  const esc = S.escenarios.map((e, k) => {
    const precio = e.vinculado ? D.acordeones.precio : e.precio;
    const costo = e.vinculado ? D.acordeonix.costo : e.costo;
    const reserva = k === 0 ? D.acordeonix.reserva : (k === 1 ? 0 : e.reserva);
    const parte = e.vinculado ? D.acordeonix.parte : e.parte;
    const deja = (precio - precio * X.impuestoPct - costo) * (1 - reserva) * parte;
    const acord = deja > 0 ? Math.ceil(necesario / deja - 1e-9) : null;
    return { nombre: e.nombre, precio, costo, reserva, parte, deja, acordeones: acord, ventas: acord !== null ? acord * precio : null, vinculado: e.vinculado };
  });
  return { perUnit, anos, necesario, escenarios: esc };
}

// ---------- Retiro ----------
export function retiro(D, MT) {
  const R0 = D.retiro, M = D.metas;
  const y0 = mYear(mIdx(D.fechaInicio));
  const edad = M.edad;
  const edadInicio = edad + (R0.anioInicio - y0);
  const ini = R0.ahorroYa * Math.pow(1 + R0.rend, R0.anioInicio - y0);
  const gasto = Math.max(0, R0.gasto - R0.ingresoRetiro);
  const rm = R0.rend / 12, ra = R0.rendAfore / 12, R = R0.rend, G = R0.acordeonixCrec;
  const filas = [];
  for (let A = 45; A <= 70; A++) {
    const n = Math.max(0, A - edadInicio);
    const cobro = Math.max(R0.edadAfore, A);
    const afore = FV(ra, (A - edad) * 12, -M.bruto * R0.aportAfore, -R0.saldoAfore) * Math.pow(1 + ra, (cobro - A) * 12);
    const pension = R0.contarAfore === 1 ? PMT(ra, (R0.hasta - cobro) * 12, -afore) : 0;
    const capital = Math.max(0, PV(rm, (cobro - A) * 12, -gasto) + PV(rm, (R0.hasta - cobro) * 12, -Math.max(0, gasto - pension)) / Math.pow(1 + rm, (cobro - A) * 12) - R0.otrosActivos);
    const nom = n === 0 ? 0 : 12 * (Math.pow(1 + R, n) - 1) / R;
    const unit = n === 0 ? 0 : 12 * R0.pctAcordeonixAhorro * (Math.abs(R - G) < 1e-6 ? n * Math.pow(1 + R, n - 1) : (Math.pow(1 + R, n) - Math.pow(1 + G, n)) / (R - G));
    const iniN = ini * Math.pow(1 + R, n);
    const acum = iniN + R0.ahorroNomina * nom + R0.acordeonixInicio * unit;
    filas.push({ edad: A, anos: n, pension, capital, acumulado: acum, alcanza: acum >= capital,
      nominaNecesaria: nom ? Math.max(0, (capital - iniN - R0.acordeonixInicio * unit) / nom) : null,
      acordeonixNecesario: unit ? Math.max(0, (capital - iniN - R0.ahorroNomina * nom) / unit) : null,
      acordeonixEsaEdad: R0.acordeonixInicio * Math.pow(1 + G, n) });
  }
  const f = filas.find((x) => x.edad === R0.edadRetiro) || filas[5];
  const real = filas.find((x) => x.alcanza);
  return { edadInicio, ini, gasto, filas, capital: f.capital, regla25: gasto * 12 * 25, acumulado: f.acumulado, falta: Math.max(0, f.capital - f.acumulado),
    nominaNecesaria: f.nominaNecesaria, acordeonixNecesario: f.acordeonixNecesario,
    acordeonixAlRetiro: f.acordeonixNecesario !== null ? f.acordeonixNecesario * Math.pow(1 + G, f.anos) : 0, edadRealista: real ? real.edad : null };
}

// ---------- Semanas (captura) ----------
export function semanasCalc(D, P, pres, semanas, cargos) {
  const X = P.X;
  const mapa = new Map(semanas.map((s) => [s.fecha, s]));
  // primer viernes desde la fecha de inicio
  let f = D.fechaInicio; while (parseD(f).getUTCDay() !== 5) f = addDays(f, 1);
  const filas = [];
  let prevAhorro = X.colchonInicial, cum = 0;
  const liqI = mIdx(D.prestamo.mesLiquidar);
  for (let k = 0; k < 65; k++) {
    const s = mapa.get(f) || { fecha: f };
    const i = mIdx(f);
    const pr = P.filas.find((r) => r.idx === i);
    const fase = pr ? pr.fase : '2 · Capitalizar';
    const f1 = fase.startsWith('1');
    const ahorroSug = f1 ? pres.f1.colchon : pres.f2.plan;
    const prestamoActivo = i >= mIdx(D.prestamo.mesSiguiente) && i <= X.prestamoUltimo && (D.prestamo.liquidar !== 1 || i < liqI);
    const tarjetasSug = (f1 ? pres.f1.plan : 0) + (prestamoActivo ? pres.prestamoW : 0);
    const tiene = s.ingreso !== undefined && s.ingreso !== null && s.ingreso !== '';
    const tarjetas = (s.tarjetas ?? null) !== null ? Number(s.tarjetas) : (tiene ? tarjetasSug : null);
    const ahorro = (s.ahorro ?? null) !== null ? Number(s.ahorro) : (tiene ? ahorroSug : null);
    const gastos = ['jazmin', 'gasolina', 'renta', 'escuela', 'otros', 'estacionales', 'terreno'].map((c) => num(s[c]));
    const sobrante = tiene ? Number(s.ingreso) - sum(gastos) - num(tarjetas) - num(ahorro) : null;
    if (tiene) cum += sobrante;
    const saldoAhorro = (s.saldoAhorro ?? null) !== null ? Number(s.saldoAhorro) : (tiene ? prevAhorro + num(ahorro) : null);
    if (saldoAhorro !== null) prevAhorro = saldoAhorro;
    const fin = addDays(f, 7);
    const cargosSemana = sum(cargos.filter((c) => c.fecha >= f && c.fecha < fin).map((c) => c.monto));
    const saldos = s.saldos || {};
    const vals = Object.values(saldos).filter((x) => x !== null && x !== '' && !isNaN(Number(x)));
    filas.push({ ...s, fecha: f, mes: mKey(i), fase, ahorroSug, tarjetasSug, tarjetasEf: tarjetas, ahorroEf: ahorro, tarjetasEsSug: (s.tarjetas ?? null) === null && tiene,
      ahorroEsSug: (s.ahorro ?? null) === null && tiene, sobrante, saldoCuenta: tiene ? num(D.saldoCuentaRegistro ?? D.saldoCuentaInicial) + cum : null,
      saldoAhorroEf: saldoAhorro, saldoAhorroEsEst: (s.saldoAhorro ?? null) === null && saldoAhorro !== null, cargosSemana,
      deudaReal: vals.length ? sum(vals) : null, tiene });
    f = addDays(f, 7);
  }
  return filas;
}

// Tarjetas: resumen con último saldo real
export function tarjetasResumen(D, semFilas, cargos, hoyISO) {
  const hoy = parseD(hoyISO);
  return D.deudas.map((d) => {
    const corto = d.nombre.replace('Tarjeta ', '');
    let ult = null, fecha = null;
    semFilas.forEach((s) => { const v = s.saldos ? s.saldos[corto] : undefined; if (v !== undefined && v !== null && v !== '') { ult = Number(v); fecha = s.fecha; } });
    let prox = null, dias = null;
    if (d.limite) {
      const y = hoy.getUTCFullYear(), m = hoy.getUTCMonth();
      let dt = new Date(Date.UTC(y, m, d.limite));
      if (dt < hoy) dt = new Date(Date.UTC(y, m + 1, d.limite));
      prox = isoD(dt); dias = Math.round((dt - hoy) / 864e5);
    }
    return { nombre: d.nombre, corto, saldoInicial: d.saldo, cargos: sum(cargos.filter((c) => c.tarjeta === d.nombre).map((c) => c.monto)),
      ultimoSaldo: ult, fechaSaldo: fecha, minimo: d.minimo, corte: d.corte, limite: d.limite, proximaFecha: prox, dias };
  });
}

// Seguimiento plan vs real (mensual)
export function seguimiento(D, P, semFilas) {
  const X = P.X;
  return P.filas.map((r) => {
    const sm = semFilas.filter((s) => s.mes === r.mes && s.tiene);
    const all = semFilas.filter((s) => s.mes === r.mes);
    const reg = sm.length;
    const g = (c) => sum(sm.map((s) => num(s[c])));
    const lastDeuda = [...all].reverse().find((s) => s.deudaReal !== null);
    const lastAhorro = [...all].reverse().find((s) => s.saldoAhorroEf !== null);
    const deudaReal = lastDeuda ? lastDeuda.deudaReal : null;
    const ahorroReal = lastAhorro ? lastAhorro.saldoAhorroEf : null;
    return {
      mes: r.mes, semanas: reg,
      ingresoPlan: r.ingresoTotal, ingresoReal: reg ? g('ingreso') : null,
      gastosPlan: r.jazmin + r.gasolina + r.renta + r.escuela + r.estacionales + r.terreno,
      gastosReal: reg ? g('jazmin') + g('gasolina') + g('renta') + g('escuela') + g('estacionales') + g('terreno') : null,
      otrosPlan: r.otros, otrosReal: reg ? g('otros') : null,
      pagosPlan: r.pagadoDeudas, pagosReal: reg ? sum(sm.map((s) => num(s.tarjetasEf))) : null,
      ahorroMesPlan: r.ahorroMes, ahorroMesReal: reg ? sum(sm.map((s) => num(s.ahorroEf))) : null,
      deudaPlan: r.deudaCierre, deudaReal, ahorroPlan: r.ahorroAcum, ahorroReal,
      patrimonioPlan: r.patrimonio,
      patrimonioReal: (deudaReal !== null && ahorroReal !== null) ? ahorroReal + X.terrenoValor - deudaReal - r.terrenoSaldo - r.prestamoSaldo : null,
      estado: deudaReal === null ? 'Pendiente' : (deudaReal <= r.deudaCierre + 1 ? 'En plan' : 'Atrasado'),
    };
  });
}

// Simulador: ¿me lo puedo permitir? y balance mensual
export function simulador(D, P, pres, subsMensual, sim, mesBalance, escenarioBalance = {}) {
  const X = P.X;
  const fila = (key) => P.filas.find((r) => r.mes === key);
  const m = sim.mes || P.filas[0].mes;
  const r = fila(m);
  const fase = r ? r.fase : 'Fuera del plan';
  const f1 = fase.startsWith('1');
  const otrosMes = r ? r.otros : 0;
  const otrosSem = otrosMes * 12 / 52;
  const monto = num(sim.monto);
  const manda = f1 ? pres.f1.plan : pres.f2.plan;
  const dias = manda <= 0 ? 0 : monto / (manda / 7);
  const libre = P.hitos.libreTarjetas;
  const mesesHasta = libre ? (mIdx(libre) - mIdx(m) + 1) : 1;
  const interes = f1 ? monto * X.tasaProm * Math.max(1, mesesHasta) : 0;
  const reinv = r ? r.reinversion : 0;
  let veredicto;
  if (!monto) veredicto = 'Captura un monto';
  else if (sim.forma === 'Con tarjeta') veredicto = f1 ? 'NO: estás pagando tarjetas; un cargo nuevo es deuda con intereses' : 'Sólo si la pagas completa antes de la fecha límite';
  else if (sim.forma === 'Del ahorro') veredicto = monto <= reinv ? 'Cabe en tu fondo de reinversión, pero retrasa tu regreso a Acordeonix' : 'NO: tocaría tu fondo de emergencia';
  else if (monto <= otrosSem) veredicto = "SÍ: cabe en tu 'otros' de una semana";
  else if (monto <= otrosMes) veredicto = `CON CUIDADO: usa ${Math.round(monto / otrosMes * 100)}% de tu 'otros' del mes`;
  else veredicto = `NO cabe en 'otros': retrasa tu plan unos ${Math.round(dias)} días`;
  const afford = { mes: m, fase, otrosMes, otrosSem, pct: otrosMes ? monto / otrosMes : 0, manda, dias, interes, reinv, veredicto };

  // Balance mensual
  const rb = fila(mesBalance);
  const faseB = rb ? rb.fase : '2 · Capitalizar';
  const plan = {
    nomina: X.ingresoMensual,
    bonoFondo: (D.bono.monto + D.fondoAhorro.monto) / 12,
    acordeonix: (D.acordeonix.incluir === 1 && mIdx(mesBalance) >= mIdx(D.acordeonix.mesRegreso) + D.acordeonix.mesesArranque) ? X.ingresoAcordeonix : 0,
    otroIngreso: 0,
    casa: D.jazminSemanal * 52 / 12, gasolina: D.gasolinaSemanal * 52 / 12, renta: D.renta, escuela: D.escuela, autos: X.autosMensual,
    terreno: rb ? rb.terreno : 0, prestamo: rb ? rb.prestamo : 0, temporada: X.estacionalesTotal / 12,
    otros: rb ? rb.otros : D.otrosFase2, suscripciones: subsMensual * (1 - D.suscripcionesEnOtros), vacaciones: rb ? rb.vacaciones : 0,
  };
  const usado = {}; Object.keys(plan).forEach((k) => { const v = escenarioBalance[k]; usado[k] = (v === undefined || v === null || v === '') ? plan[k] : Number(v); });
  const ingresos = usado.nomina + usado.bonoFondo + usado.acordeonix + usado.otroIngreso;
  const necesidades = usado.casa + usado.gasolina + usado.renta + usado.escuela + usado.autos + usado.terreno + usado.prestamo + usado.temporada;
  const estilo = usado.otros + usado.suscripciones + usado.vacaciones;
  const gastos = necesidades + estilo;
  const balance = ingresos - gastos;
  const minimo = faseB.startsWith('1') ? X.minimosTotal + D.aportMinColchon : 0.1 * ingresos;
  const ideal = 0.2 * ingresos;
  const ver = balance >= ideal ? 'VAS BIEN: te queda el ideal o más' : (balance >= minimo ? 'JUSTO: cubres lo mínimo, pero no el ideal' : 'NO ALCANZA: gastas más de lo que debes; recorta antes de usar tarjeta');
  const balanceRes = { mes: mesBalance, fase: faseB, plan, usado, ingresos, gastos, necesidades, estilo, balance, minimo, ideal, diferencia: balance - ideal, veredicto: ver,
    pctNecesidades: ingresos ? necesidades / ingresos : 0, pctEstilo: ingresos ? estilo / ingresos : 0, pctAhorro: ingresos ? balance / ingresos : 0 };
  return { afford, balance: balanceRes };
}

// ---------- todo junto ----------
export function calcularTodo(state, hoyISO) {
  const D = state.datos;
  const cargos = state.cargos || [], subs = state.suscripciones || [], semanas = state.semanas || [];
  const SR = suscripcionesResumen(subs);
  const P = plan(D, cargos, SR.mensual, hoyISO);
  const pres = presupuesto(D, P.X, SR.mensual);
  const MT = metas(D, P, pres);
  const SU = suenos(D, P, MT);
  const RT = retiro(D, MT);
  const ES = escenarios(D, P);
  const SEM = semanasCalc(D, P, pres, semanas, cargos);
  const TJ = tarjetasResumen(D, SEM, cargos, hoyISO);
  const SG = seguimiento(D, P, SEM);
  const hoyMes = hoyISO.slice(0, 7);
  const SIM = simulador(D, P, pres, SR.mensual, { ...(D.simulador || {}), mes: (D.simulador && D.simulador.mes) || hoyMes }, (state.ui && state.ui.mesBalance) || hoyMes, (state.ui && state.ui.escenarioBalance) || {});
  return { SR, P, pres, MT, SU, RT, ES, SEM, TJ, SG, SIM };
}

// ---------- Cierre del mes: movimientos reales de estados de cuenta ----------
// tipo: 'gasto' (sale dinero), 'ingreso' (entra), 'traspaso' (pago a tarjeta, paso a ahorro: no cuenta como gasto)
export const CATEGORIAS = [
  { id: 'nomina', nombre: 'Nómina', tipo: 'ingreso', plan: 'nomina' },
  { id: 'otroIngreso', nombre: 'Otros ingresos', tipo: 'ingreso', plan: 'otrosIngresosPlan' },
  { id: 'casa', nombre: 'Casa (Jazmín)', tipo: 'gasto', plan: 'jazmin', grupo: 'Necesidad' },
  { id: 'gasolina', nombre: 'Gasolina', tipo: 'gasto', plan: 'gasolina', grupo: 'Necesidad' },
  { id: 'renta', nombre: 'Renta', tipo: 'gasto', plan: 'renta', grupo: 'Necesidad' },
  { id: 'escuela', nombre: 'Escuela', tipo: 'gasto', plan: 'escuela', grupo: 'Necesidad' },
  { id: 'autos', nombre: 'Autos (seguro, refrendo, servicio)', tipo: 'gasto', plan: 'autos', grupo: 'Necesidad' },
  { id: 'salud', nombre: 'Salud', tipo: 'gasto', plan: null, grupo: 'Necesidad' },
  { id: 'terreno', nombre: 'Terreno', tipo: 'gasto', plan: 'terreno', grupo: 'Necesidad' },
  { id: 'prestamo', nombre: 'Préstamo NU', tipo: 'gasto', plan: 'prestamo', grupo: 'Necesidad' },
  { id: 'temporada', nombre: 'Temporada (Navidad, útiles…)', tipo: 'gasto', plan: 'estacionales', grupo: 'Necesidad' },
  { id: 'otros', nombre: 'Otros (familia)', tipo: 'gasto', plan: 'otros', grupo: 'Estilo de vida' },
  { id: 'comida', nombre: 'Comida fuera / antojos', tipo: 'gasto', plan: null, grupo: 'Estilo de vida', cuentaEnOtros: true },
  { id: 'compras', nombre: 'Compras (ropa, casa, Amazon…)', tipo: 'gasto', plan: null, grupo: 'Estilo de vida', cuentaEnOtros: true },
  { id: 'suscripciones', nombre: 'Suscripciones', tipo: 'gasto', plan: 'suscripciones', grupo: 'Estilo de vida' },
  { id: 'vacaciones', nombre: 'Vacaciones', tipo: 'gasto', plan: 'vacaciones', grupo: 'Estilo de vida' },
  { id: 'acordeonix', nombre: 'Acordeonix (negocio)', tipo: 'gasto', plan: 'acordeonixInversion', grupo: 'Negocio' },
  { id: 'comisiones', nombre: 'Comisiones e intereses', tipo: 'gasto', plan: null, grupo: 'Deuda' },
  { id: 'pagoTarjeta', nombre: 'Pago a tarjeta', tipo: 'traspaso', plan: null },
  { id: 'ahorro', nombre: 'Paso a ahorro', tipo: 'traspaso', plan: null },
  { id: 'sinCategoria', nombre: 'Sin categoría', tipo: 'gasto', plan: null, grupo: 'Estilo de vida' },
];
export const catById = (id) => CATEGORIAS.find((c) => c.id === id) || CATEGORIAS.find((c) => c.id === 'sinCategoria');

export const REGLAS_BASE = [
  ['nomina|demant|abono de nomina|deposito nomina', 'nomina'], ['pemex|gasolin|oxxo gas|g500|bp |shell|chevron|arco ', 'gasolina'],
  ['spotify|netflix|google cloud|google \\*|anthropic|claude|youtube|disney|hbo|max\\.com|prime video|icloud|apple\\.com|chatgpt|openai', 'suscripciones'],
  ['interes|comision|iva comision|penaliz|cargo por pago tardio|anualidad', 'comisiones'],
  ['pago recibido|su pago|pago tarjeta|gracias por su pago|pago spei tdc|abono a tarjeta', 'pagoTarjeta'],
  ['farmacia|similares|guadalajara|benavides|hospital|doctor|laboratorio|dental', 'salud'],
  ['seguro|qualitas|gnp|axa|refrendo|tenencia|llanta|afinacion|taller|autozone', 'autos'],
  ['colegiatura|escuela|colegio|uniforme', 'escuela'],
  ['renta|arrendamiento', 'renta'],
  ['jazmin|jazmín', 'casa'],
  ['walmart|soriana|calimax|smart|costco|sams|ley |chedraui|heb |bodega aurrera', 'otros'],
  ['starbucks|uber eats|didi food|rappi|mcdonald|burger|pizza|tacos|restaurante|cafe', 'comida'],
  ['amazon|mercado libre|mercadolibre|liverpool|coppel|shein|temu|home depot|target', 'compras'],
  ['terreno', 'terreno'], ['prestamo|préstamo', 'prestamo'], ['acordeonix|jlcpcb|digikey|mouser|pcbway|aliexpress', 'acordeonix'],
];

export function categorizar(desc, reglas) {
  const d = String(desc || '').toLowerCase();
  for (const [patron, cat] of reglas) {
    try { if (new RegExp(patron, 'i').test(d)) return cat; } catch { if (d.includes(String(patron).toLowerCase())) return cat; }
  }
  return 'sinCategoria';
}

export function cierreMes(D, P, movs, mesKey, subsMensual) {
  const ms = movs.filter((m) => m.fecha && m.fecha.slice(0, 7) === mesKey);
  const r = P.filas.find((f) => f.mes === mesKey);
  const X = P.X;
  // plan del mes (si el mes no está en el plan, usa promedios de Fase 2)
  const planVal = (k) => {
    if (r) {
      if (k === 'otrosIngresosPlan') return r.bono + r.fondo + r.otrosIngresos + r.acordeones + r.activos + r.acordeonixIngreso;
      if (k === 'suscripciones') return subsMensual * (1 - D.suscripcionesEnOtros);
      return r[k] ?? 0;
    }
    const prom = { nomina: X.ingresoMensual, jazmin: D.jazminSemanal * 52 / 12, gasolina: D.gasolinaSemanal * 52 / 12, renta: D.renta, escuela: D.escuela,
      autos: X.autosMensual, otros: D.otrosFase2, suscripciones: subsMensual, vacaciones: D.vacaciones.monto2 };
    return prom[k] ?? 0;
  };
  const real = {};
  CATEGORIAS.forEach((c) => { real[c.id] = 0; });
  ms.forEach((m) => {
    const id = m.categoria || 'sinCategoria', c = catById(id), v = Math.abs(Number(m.monto) || 0);
    real[c.id] = (real[c.id] || 0) + ((c.tipo === 'gasto' && m.tipoMov === 'abono') ? -v : v);
  });
  // 'comida' y 'compras' se comparan contra el presupuesto de 'otros'
  const filas = CATEGORIAS.filter((c) => c.tipo !== 'traspaso').map((c) => {
    const plan = c.plan ? planVal(c.plan) : null;
    return { ...c, real: real[c.id], plan, diferencia: plan === null ? null : real[c.id] - plan };
  });
  const otrosTotal = real.otros + real.comida + real.compras + real.sinCategoria;
  const fOtros = filas.find((f) => f.id === 'otros');
  fOtros.realTotal = otrosTotal; fOtros.nota = 'incluye comida fuera, compras y sin categoría';
  const ingresos = filas.filter((f) => f.tipo === 'ingreso').reduce((s, f) => s + f.real, 0);
  const gastos = filas.filter((f) => f.tipo === 'gasto').reduce((s, f) => s + f.real, 0);
  const balance = ingresos - gastos;
  const ingresosPlan = planVal('nomina') + planVal('otrosIngresosPlan');
  const grupos = {};
  filas.filter((f) => f.tipo === 'gasto').forEach((f) => { grupos[f.grupo] = (grupos[f.grupo] || 0) + f.real; });
  const hormiga = ms.filter((m) => catById(m.categoria).tipo === 'gasto' && m.tipoMov !== 'abono' && Math.abs(m.monto) < 200);
  const porCuenta = {};
  ms.filter((m) => catById(m.categoria).tipo === 'gasto' && m.tipoMov !== 'abono').forEach((m) => { porCuenta[m.cuenta || '—'] = (porCuenta[m.cuenta || '—'] || 0) + Math.abs(m.monto); });
  const top = ms.filter((m) => catById(m.categoria).tipo === 'gasto' && m.tipoMov !== 'abono').sort((a, b) => Math.abs(b.monto) - Math.abs(a.monto)).slice(0, 10);
  // evaluación automática
  const alertas = [];
  if (!ms.length) alertas.push(['neutral', 'Todavía no hay movimientos de este mes. Importa tus estados de cuenta.']);
  else {
    const exceso = filas.filter((f) => f.tipo === 'gasto' && f.plan !== null && f.plan > 0 && (f.id === 'otros' ? otrosTotal : f.real) > f.plan * 1.1);
    exceso.forEach((f) => alertas.push(['bad', `${f.nombre}: gastaste ${Math.round(((f.id === 'otros' ? otrosTotal : f.real) / f.plan - 1) * 100)}% más de lo planeado.`]));
    if (real.comisiones > 0) alertas.push(['bad', `Pagaste ${Math.round(real.comisiones)} pesos en comisiones e intereses: revisa fechas de pago y domiciliación.`]);
    if (hormiga.length >= 10) alertas.push(['warn', `${hormiga.length} gastos hormiga (menos de $200) suman ${Math.round(hormiga.reduce((s, m) => s + Math.abs(m.monto), 0))} pesos.`]);
    if (real.sinCategoria > 0) alertas.push(['warn', `Hay ${ms.filter((m) => (m.categoria || 'sinCategoria') === 'sinCategoria').length} movimientos sin categoría.`]);
    if (real.acordeonix > 0) alertas.push(['warn', `${Math.round(real.acordeonix)} pesos fueron gastos de Acordeonix: pide que el negocio te los reembolse.`]);
    if (ingresos > 0) alertas.push([balance >= 0.2 * ingresos ? 'ok' : (balance >= 0 ? 'warn' : 'bad'), `Te quedó libre ${Math.round(balance / ingresos * 100)}% de tus ingresos (ideal: 20% o más).`]);
    if (!exceso.length && ms.length) alertas.push(['ok', 'Ninguna categoría con plan se pasó más de 10%.']);
  }
  return { mes: mesKey, movimientos: ms, filas, ingresos, ingresosPlan, gastos, balance, ideal: 0.2 * ingresos, grupos, hormiga,
    hormigaTotal: hormiga.reduce((s, m) => s + Math.abs(m.monto), 0), porCuenta, top, alertas, otrosTotal,
    traspasos: real.pagoTarjeta + real.ahorro, pagosTarjeta: real.pagoTarjeta };
}

export function historialCierres(D, P, movs, subsMensual) {
  const meses = [...new Set(movs.filter((m) => m.fecha).map((m) => m.fecha.slice(0, 7)))].sort();
  return meses.map((k) => { const c = cierreMes(D, P, movs, k, subsMensual); return { mes: k, ingresos: c.ingresos, gastos: c.gastos, balance: c.balance, pct: c.ingresos ? c.balance / c.ingresos : null, comisiones: c.filas.find((f) => f.id === 'comisiones').real, n: c.movimientos.length }; });
}
