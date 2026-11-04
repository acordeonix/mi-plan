// Conecta el módulo de inversiones con tu plan de ahorro: lee tus datos (solo lectura) y usa el mismo
// motor de cálculo del plan (js/engine.js) para saber tu deuda, tu fondo de emergencia y tu capacidad de inversión.

const mes = (iso) => iso.slice(0, 7);
const ultimo = (arr, fn) => { for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return arr[i]; return null; };

export async function leerPlan(store) {
  let estado;
  try { estado = await store.loadPlan(); }
  catch (e) { return { ok: false, error: 'No pude leer tu plan: ' + e.message }; }
  if (!estado?.datos) return { ok: false, error: 'Todavía no hay datos en tu plan de ahorro (o los guardaste con otra cuenta).' };
  let Eng;
  try { Eng = await import('../engine.js'); }
  catch { return { ok: false, error: 'No encontré js/engine.js de tu plan. Este módulo debe estar en el mismo repositorio que tu plan.' }; }
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const R = Eng.calcularTodo({ ...estado, ui: {} }, hoy);
    return { ok: true, R, D: estado.datos, actualizado: Date.now() };
  } catch (e) { return { ok: false, error: 'El motor de tu plan marcó un error: ' + e.message }; }
}

// Resumen de lo que importa para invertir
export function capacidad(lectura, inicioISO) {
  if (!lectura?.ok) return null;
  const { R, D } = lectura; const P = R.P, X = P.X;
  const hoyM = mes(new Date().toISOString());
  const filaHoy = P.filas.find((r) => r.mes === hoyM) || P.filas[0];
  const filaIni = P.filas.find((r) => r.mes === mes(inicioISO)) || P.filas.at(-1);
  // Lo real capturado en el registro semanal tiene prioridad sobre lo proyectado
  const realDeuda = ultimo(R.SG || [], (s) => s.deudaReal != null);
  const realAhorro = ultimo(R.SG || [], (s) => s.ahorroReal != null);
  const deuda = realDeuda ? realDeuda.deudaReal : filaHoy.deudaCierre;
  const ahorro = realAhorro ? realAhorro.ahorroReal : filaHoy.ahorroAcum;
  const fondoHoy = Math.max(0, Math.min(ahorro, X.metaFondo));
  const gastoEsencial = X.gastoEsencial;
  const mensualF2 = Math.max(0, R.pres.f2.plan * 52 / 12);
  const fondoCompleto = P.hitos.fondoCompleto, libreTarjetas = P.hitos.libreTarjetas;
  const ini = inicioISO;
  const listoPlan = [libreTarjetas, fondoCompleto].every((f) => f && f.slice(0, 7) <= ini.slice(0, 7));
  return {
    fuente: realDeuda || realAhorro ? 'registro' : 'proyeccion',
    deuda, ahorro, fondoHoy, metaFondo: X.metaFondo, gastoEsencial,
    mesesFondo: gastoEsencial ? fondoHoy / gastoEsencial : null,
    mesesMeta: D.mesesFondo,
    ingresoMensual: X.ingresoMensual,
    mensualF2, // lo que tu plan deja para ahorro e inversión cada mes ya sin deudas
    libreTarjetas, fondoCompleto, listoPlan,
    // Al mes de inicio: dinero por encima del fondo de emergencia (el plan lo llama "reinversión")
    deudaInicio: filaIni.deudaCierre, fondoInicio: filaIni.fondoEmergencia, excedenteInicio: Math.max(0, filaIni.reinversion),
    mesInicio: filaIni.mes,
    tasaTarjetas: X.tasaProm, // tasa mensual promedio
    estable: D.ingresoSemanal > 0,
  };
}
