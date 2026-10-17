// Formularios (qué se captura y dónde) y valores de ejemplo para una instalación nueva.
// Tus datos reales NO van en este archivo: se importan desde tu respaldo y viven en Firestore.

export const SECCIONES_DATOS = [
  { id: 'general', titulo: 'Ingresos y gastos fijos', campos: [
    ['fechaInicio', 'Fecha de inicio del plan', 'date', 'Desde aquí se cuentan los viernes de pago.'],
    ['ingresoSemanal', 'Ingreso semanal (nómina)', 'money'],
    ['jazminSemanal', 'Gasto de la casa por semana (Jazmín: servicios, mandado, su gasolina)', 'money'],
    ['gasolinaSemanal', 'Tu gasolina por semana', 'money'],
    ['renta', 'Renta (al mes)', 'money'],
    ['escuela', 'Escuela Ivana (al mes)', 'money'],
    ['otrosFase1', "'Otros' por mes mientras haya deudas (Fase 1)", 'money'],
    ['otrosFase2', "'Otros' por mes ya sin deudas (Fase 2)", 'money'],
  ] },
  { id: 'colchon', titulo: 'Saldo y colchón', campos: [
    ['saldoCuentaInicial', 'Saldo en cuenta al iniciar el plan', 'money'],
    ['pagoInicialBanamex', 'Pago a tarjeta hecho el día de inicio', 'money', 'Se resta del saldo para obtener el colchón inicial.'],
    ['saldoCuentaRegistro', 'Saldo en cuenta al empezar la captura semanal', 'money'],
    ['aportMinColchon', 'Aportación mínima al colchón por mes (Fase 1)', 'money'],
    ['mesesFondo', 'Meses de gasto esencial para el fondo de emergencia', 'int'],
    ['rendMensual', 'Rendimiento mensual del ahorro', 'pct2'],
  ] },
  { id: 'extra', titulo: 'Bono, fondo de ahorro y activos', campos: [
    ['bono.monto', 'Bono de Navidad (cada año)', 'money'], ['bono.desde', 'Primer mes del bono', 'month'],
    ['fondoAhorro.monto', 'Fondo de ahorro (cada año)', 'money'], ['fondoAhorro.desde', 'Primer mes del fondo', 'month'],
    ['activos.usd', 'Activos de Acordeonix vendibles (USD)', 'money'], ['tipoCambio', 'Tipo de cambio (MXN por USD)', 'num'],
    ['activos.vender', '¿Vender los activos?', 'sino'], ['activos.mes', 'Mes de la venta', 'month'],
  ] },
  { id: 'acordeones', titulo: 'Acordeones para venta', campos: [
    ['acordeones.cantidad', 'Acordeones a vender (1 por mes)', 'int'], ['acordeones.precio', 'Precio de venta', 'money'],
    ['acordeones.impuesto', 'Impuesto por venta', 'money'], ['acordeones.costo', 'Costo de piezas por acordeón', 'money'],
    ['acordeones.mesPrimera', 'Mes de la primera venta', 'month'],
  ] },
  { id: 'deudas', titulo: 'Tarjetas (el orden = prioridad de pagos extra)', tabla: 'deudas', columnas: [
    ['nombre', 'Tarjeta', 'text'], ['saldo', 'Saldo inicial', 'money'], ['minimo', 'Pago mínimo', 'money'], ['tasa', 'Tasa mensual', 'pct'],
    ['corte', 'Día de corte', 'int'], ['limite', 'Día límite', 'int'] ] },
  { id: 'otrosIngresos', titulo: 'Otros ingresos posibles (PTU, saldo a favor…)', tabla: 'otrosIngresos', columnas: [
    ['concepto', 'Concepto', 'text'], ['monto', 'Monto', 'money'], ['mes', 'Mes', 'month'] ] },
  { id: 'estacionales', titulo: 'Gastos de temporada', tabla: 'estacionales', columnas: [
    ['concepto', 'Concepto', 'text'], ['monto', 'Monto', 'money'], ['mes', 'Mes', 'month'] ] },
  { id: 'terreno', titulo: 'Terreno (pago en dólares)', campos: [
    ['terreno.pagoUSD', 'Pago mensual según contrato (USD)', 'money'], ['terreno.saldoUSD', 'Saldo pendiente (USD)', 'money'],
    ['terreno.reanudar', 'Reanudar el pago desde', 'month'], ['terreno.limite', 'Fecha límite para liquidar', 'month'],
    ['terreno.abonoMeses', 'Abono extra único (en meses de pago)', 'int'], ['terreno.mesAbono', 'Mes del abono extra', 'month'],
    ['terreno.valorMXN', 'Valor estimado del terreno (MXN, opcional)', 'money', 'Vacío = usa el saldo pendiente como valor mínimo.'],
  ] },
  { id: 'acordeonix', titulo: 'Regreso a Acordeonix', campos: [
    ['acordeonix.incluir', '¿Incluir el regreso en la proyección?', 'sino'], ['acordeonix.mesRegreso', 'Mes de regreso', 'month'],
    ['acordeonix.inversion', 'Inversión inicial', 'money', 'Regla: máximo 50% de tu fondo de reinversión.'],
    ['acordeonix.mesesArranque', 'Meses de arranque sin ingreso', 'int'], ['acordeonix.ventasMes', 'Acordeones vendidos por mes', 'int'],
    ['acordeonix.costo', 'Costo de materiales por acordeón', 'money'], ['acordeonix.reserva', 'Parte a reserva del negocio', 'pct'],
    ['acordeonix.parte', 'Tu parte de lo que se reparte', 'pct'],
  ] },
  { id: 'prestamo', titulo: 'Préstamo NU (pago fijo)', campos: [
    ['prestamo.pago', 'Pago mensual', 'money2'], ['prestamo.total', 'Pagos totales', 'int'], ['prestamo.hechos', 'Pagos ya hechos', 'int', 'Súbelo cada mes que pagues.'],
    ['prestamo.mesSiguiente', 'Mes del siguiente pago', 'month'], ['prestamo.liquidar', '¿Liquidar por adelantado?', 'sino'],
    ['prestamo.mesLiquidar', 'Mes en que lo liquidas', 'month'], ['prestamo.descuento', 'Descuento de intereses por liquidar', 'money'],
  ] },
  { id: 'vacaciones', titulo: 'Fondo de vacaciones', campos: [
    ['vacaciones.monto1', 'Ahorro mensual el primer año', 'money'], ['vacaciones.desde', 'Desde qué mes', 'month'],
    ['vacaciones.monto2', 'Ahorro mensual desde el año…', 'money'], ['vacaciones.anio2', '…este año', 'int'],
  ] },
  { id: 'autos', titulo: 'Autos (seguro, refrendo, mantenimiento; la gasolina va aparte)', campos: [['autos.desde', 'Apartar desde', 'month']],
    tabla: 'autos.items', columnas: [['concepto', 'Concepto', 'text'], ['anual', 'Monto al año', 'money']] },
  { id: 'subs', titulo: 'Suscripciones', campos: [['suscripcionesEnOtros', "¿Ya están incluidas en 'otros'?", 'sino']] },
];

export const CAMPOS_METAS = [
  ['metas.ingresoExtra', 'Ingreso extra mensual para probar', 'money'], ['metas.bruto', 'Salario bruto mensual', 'money'], ['metas.edad', 'Tu edad', 'int'],
  ['metas.subcuenta', 'Subcuenta Infonavit hoy', 'money'], ['metas.rendSubcuenta', 'Rendimiento anual subcuenta', 'pct'],
  ['metas.creditoAprobado', 'Crédito aprobado por Infonavit', 'money'], ['metas.topeInfonavit', 'Monto máximo Infonavit', 'money'],
  ['metas.precioCasa', 'Precio de la casa', 'money'], ['metas.gastosCasa', 'Gastos de escrituración', 'pct'], ['metas.tasaCasa', 'Tasa del crédito', 'pct2'],
  ['metas.plazoCasa', 'Plazo (años)', 'int'], ['metas.pctCasa', 'Máximo de tu ingreso para la casa', 'pct'],
  ['metas.usarCredito', 'Crédito que usas', 'select', '', [[1, 'Prudente (30% del ingreso)'], [2, 'El que aprueba Infonavit']]],
  ['metas.autoIncluir', '¿Incluir auto nuevo?', 'sino'], ['metas.autoPrecio', 'Precio del auto', 'money'], ['metas.autoEnganche', 'Enganche', 'pct'],
  ['metas.autoTasa', 'Tasa del crédito automotriz', 'pct2'], ['metas.autoPlazo', 'Plazo (meses)', 'int'], ['metas.autoSeguro', 'Seguro anual (% del valor)', 'pct2'],
  ['metas.autoPct', 'Máximo de tu ingreso para el auto', 'pct'], ['metas.pctReinvMetas', '% del fondo de reinversión que va a metas', 'pct'],
  ['metas.pctAuto', '% del ahorro mensual al auto', 'pct'], ['metas.pctBonoCasa', '% de bono y fondo anuales a la casa', 'pct'],
];
export const CAMPOS_SUENOS = [['suenos.aumento', 'Aumento anual de tu sueldo', 'pct'], ['suenos.maxDeudas', 'Máximo para todas tus deudas', 'pct'],
  ['suenos.anioMeta', 'Año meta (calculadora)', 'int'], ['suenos.conAuto', '¿Con auto nuevo?', 'sino']];
export const CAMPOS_RETIRO = [
  ['retiro.edadRetiro', 'Edad a la que quieres retirarte', 'int'], ['retiro.hasta', 'Planear el dinero hasta la edad de', 'int'],
  ['retiro.gasto', 'Gasto mensual en el retiro (pesos de hoy)', 'money'], ['retiro.ingresoRetiro', 'Ingreso de Acordeonix ya retirado', 'money'],
  ['retiro.rend', 'Rendimiento real anual', 'pct2'], ['retiro.ahorroYa', 'Ahorro para el retiro que ya tienes', 'money'],
  ['retiro.otrosActivos', 'Otros activos para el retiro', 'money'], ['retiro.anioInicio', 'Año en que empiezas a ahorrar', 'int'],
  ['retiro.ahorroNomina', 'Ahorro mensual de tu nómina', 'money'], ['retiro.acordeonixInicio', 'Acordeonix: lo que te da al mes al empezar', 'money'],
  ['retiro.acordeonixCrec', 'Acordeonix: crecimiento anual', 'pct'], ['retiro.pctAcordeonixAhorro', '% de Acordeonix que ahorras', 'pct'],
  ['retiro.contarAfore', '¿Contar tu Afore?', 'sino'], ['retiro.saldoAfore', 'Saldo de tu Afore', 'money'], ['retiro.aportAfore', 'Aportación a tu Afore (% del bruto)', 'pct'],
  ['retiro.rendAfore', 'Rendimiento real Afore', 'pct2'], ['retiro.edadAfore', 'Edad para cobrar la Afore', 'int'],
];

export const CONSEJOS_BASE = [
  { tema: 'Fecha de corte', texto: 'Paga antes de la fecha de corte, no sólo antes de la fecha límite.', porque: 'Reduce el saldo que genera intereses.' },
  { tema: 'Domiciliar el pago mínimo', texto: 'Programa el pago automático del mínimo de cada tarjeta.', porque: 'Nunca vuelves a pagar recargo por olvido.' },
  { tema: 'Regla de 48 horas', texto: 'Cualquier compra no planeada: espera 48 horas antes de decidir.', porque: 'Corta las compras impulsivas.' },
];

export function datosEjemplo(hoy) {
  const y = Number(hoy.slice(0, 4)), m = hoy.slice(5, 7);
  const mm = (dy, mo) => `${y + dy}-${String(mo).padStart(2, '0')}`;
  return {
    fechaInicio: `${y}-${m}-01`, ingresoSemanal: 10000, jazminSemanal: 3500, gasolinaSemanal: 700, renta: 5000, escuela: 2000, otrosFase1: 6000, otrosFase2: 8000,
    saldoCuentaInicial: 5000, pagoInicialBanamex: 0, saldoCuentaRegistro: 5000, aportMinColchon: 1000, mesesFondo: 3, rendMensual: 0.005,
    bono: { monto: 25000, desde: mm(0, 12) }, fondoAhorro: { monto: 50000, desde: mm(1, 1) }, activos: { usd: 0, vender: 0, mes: mm(0, 12) }, tipoCambio: 17.2,
    acordeones: { cantidad: 0, precio: 6000, impuesto: 960, costo: 0, mesPrimera: mm(0, 12) },
    deudas: [{ nombre: 'Tarjeta 1', saldo: 10000, minimo: 500, tasa: 0.05, corte: 10, limite: 30 }],
    otrosIngresos: [], estacionales: [{ concepto: 'Navidad', monto: 5000, mes: mm(0, 12) }],
    terreno: { pagoUSD: 0, saldoUSD: 0, abonoMeses: 0, mesAbono: mm(1, 1), reanudar: mm(1, 1), valorMXN: null, limite: mm(1, 12) },
    acordeonix: { incluir: 0, mesRegreso: mm(1, 12), inversion: 0, mesesArranque: 2, ventasMes: 2, costo: 2500, reserva: 0.5, parte: 1 / 3 },
    suscripcionesEnOtros: 0,
    prestamo: { nombre: 'Préstamo', pago: 0, total: 0, hechos: 0, mesSiguiente: mm(0, Number(m)), liquidar: 0, mesLiquidar: mm(1, 1), descuento: 0 },
    vacaciones: { monto1: 0, desde: mm(1, 2), monto2: 0, anio2: y + 2 },
    autos: { desde: mm(0, Number(m)), items: [{ concepto: 'Seguro del auto', anual: 9000 }] },
    metas: { ingresoExtra: 0, bruto: 50000, edad: 35, subcuenta: 0, rendSubcuenta: 0.04, topeInfonavit: 2940000, creditoAprobado: 1500000, precioCasa: 2500000,
      gastosCasa: 0.02, tasaCasa: 0.1045, plazoCasa: 30, pctCasa: 0.3, usarCredito: 1, autoIncluir: 0, autoPrecio: 400000, autoEnganche: 0.2, autoTasa: 0.1499,
      autoPlazo: 48, autoSeguro: 0.025, autoPct: 0.1, pctReinvMetas: 0.5, pctAuto: 0.3, pctBonoCasa: 1 },
    suenos: { aumento: 0.04, maxDeudas: 0.4, anioMeta: y + 5, conAuto: 0, escenarios: [
      { nombre: 'Hoy (Datos)', precio: 6000, costo: 2500, reserva: 0.5, parte: 1 / 3, vinculado: true },
      { nombre: 'Sin reserva (el negocio ya maduró)', precio: 6000, costo: 2500, reserva: 0, parte: 1 / 3, vinculado: true },
      { nombre: 'Precio más alto y costo optimizado', precio: 8000, costo: 2200, reserva: 0.3, parte: 1 / 3, vinculado: false },
      { nombre: 'Tu propio escenario', precio: 7000, costo: 2300, reserva: 0.3, parte: 0.5, vinculado: false }] },
    retiro: { edadRetiro: 50, hasta: 90, gasto: 30000, ingresoRetiro: 0, rend: 0.045, contarAfore: 0, saldoAfore: 0, aportAfore: 0.12, rendAfore: 0.035, edadAfore: 60,
      ahorroYa: 0, otrosActivos: 0, anioInicio: y + 2, ahorroNomina: 3000, acordeonixInicio: 5000, acordeonixCrec: 0.15, pctAcordeonixAhorro: 0.5 },
    simulador: { monto: 1500, forma: "De mi 'otros'" },
  };
}
