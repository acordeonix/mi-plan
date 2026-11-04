// Pestaña "Decisiones": semáforo antes de invertir, perfil, alertas con reglas explicadas, ruta hasta el inicio y reglas personales.
// Todo se basa en reglas generales de educación financiera; nada aquí es una recomendación de compra o venta.

const DIA = 86400000;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pctS = (v, d = 0) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(d)}%`);
const fLarga = (t) => new Date(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const DECISIONES_DEFAULT = () => ({ inicio: '2027-01-04', perfil: {}, antes: {}, ruta: {}, reglas: '', pctBolsa: 20 });
const $$ = (v) => (v == null || !Number.isFinite(v) ? '—' : '$' + Math.round(v).toLocaleString('es-MX'));
const fMes = (s) => { if (!s) return 'fuera del horizonte del plan'; const t = Date.parse((s.length === 7 ? s + '-15' : s) + 'T00:00:00Z'); return new Date(t).toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };

// ---------- Perfil ----------
const PREGUNTAS = [
  ['horizonte', '¿En cuánto tiempo vas a necesitar el dinero que vas a invertir?', [['<1', 'Menos de 1 año'], ['1-3', 'De 1 a 3 años'], ['3-5', 'De 3 a 5 años'], ['5+', 'Más de 5 años']]],
  ['caida', 'Si tu inversión cae 25% en 3 meses, ¿qué harías?', [['vendo', 'Vendo todo para no perder más'], ['parte', 'Vendo una parte'], ['espero', 'Espero sin mover nada'], ['compro', 'Aprovecho y compro más']]],
  ['experiencia', '¿Cuánta experiencia tienes invirtiendo?', [['nada', 'Ninguna'], ['poco', 'Solo práctica o montos pequeños'], ['algo', 'Ya he invertido en bolsa']]],
  ['objetivo', '¿Para qué es principalmente este dinero?', [['enganche', 'Enganche de casa o carro'], ['retiro', 'Retiro'], ['crecer', 'Hacer crecer mi patrimonio a largo plazo'], ['aprender', 'Aprender con poco dinero']]],
];
const PTS = { horizonte: { '<1': 0, '1-3': 1, '3-5': 2, '5+': 3 }, caida: { vendo: 0, parte: 1, espero: 2, compro: 3 }, experiencia: { nada: 0, poco: 1, algo: 2 } };

export function perfilDe(p) {
  if (!PREGUNTAS.every(([k]) => p[k])) return null;
  const s = PTS.horizonte[p.horizonte] * 2 + PTS.caida[p.caida] + PTS.experiencia[p.experiencia];
  let tipo = s <= 4 ? 'conservador' : s <= 7 ? 'moderado' : 'crecimiento';
  const notas = [];
  if (p.horizonte === '<1') { tipo = 'conservador'; notas.push('Dinero que necesitas en menos de un año no debería estar en bolsa: una caída te puede obligar a vender con pérdida.'); }
  if (p.objetivo === 'enganche' && (p.horizonte === '<1' || p.horizonte === '1-3')) { tipo = 'conservador'; notas.push('Para un enganche con fecha cercana, lo que más importa es que el dinero esté completo ese día, no que rinda más.'); }
  if (p.caida === 'vendo' && tipo !== 'conservador') { tipo = 'moderado'; notas.push('Dijiste que venderías en una caída de 25%. Esas caídas pasan seguido en bolsa; mientras aprendes, una mezcla con más CETES te ayuda a no vender en pánico.'); }
  if (p.experiencia === 'nada') notas.push('Como apenas empiezas, una regla común es invertir los primeros meses solo una parte de tu monto mensual e ir subiendo conforme te sientas cómodo.');
  return { tipo, puntos: s, notas };
}

const MEZCLAS = {
  conservador: { bolsa: [0, 20], texto: 'La mayor parte en CETES u otra renta fija; si acaso una parte pequeña en un fondo amplio (como uno del S&P 500 o del IPC) para aprender.' },
  moderado: { bolsa: [40, 60], texto: 'Mitad y mitad aproximadamente: CETES para estabilidad y fondos amplios y diversificados para crecimiento, con aportaciones mensuales.' },
  crecimiento: { bolsa: [70, 90], texto: 'La mayor parte en fondos amplios y diversificados con aportaciones mensuales constantes, y una parte en CETES como colchón.' },
};

// ---------- Semáforo ----------
function semaforo(D, P, perfil, cap) {
  const a = D.antes; const items = [];
  const add = (estado, titulo, porque) => items.push({ estado, titulo, porque });
  if (cap) {
    if (cap.deuda > 1) add('rojo', `Debes ${$$(cap.deuda)} en tarjetas`, `Tu plan te deja libre de tarjetas en ${fMes(cap.libreTarjetas)}. Hasta entonces, cada peso extra rinde más pagando tarjeta${cap.tasaTarjetas ? ` (cobran alrededor de ${pctS(cap.tasaTarjetas * 12)} al año)` : ''} que en cualquier inversión.`);
    else add('verde', 'Sin deudas de tarjeta', 'Lo que inviertas ya no compite contra intereses de tarjeta.');
    const m = cap.mesesFondo ?? 0, meta = cap.mesesMeta || 3;
    if (m < 1) add('rojo', `Fondo de emergencia: ${$$(cap.fondoHoy)} de ${$$(cap.metaFondo)}`, `Tu plan lo completa en ${fMes(cap.fondoCompleto)}. Sin él, un imprevisto te obligaría a vender tus inversiones.`);
    else if (m < meta - 0.05) add('amarillo', `Fondo de emergencia: ${m.toFixed(1)} de ${meta} meses`, `Llevas ${$$(cap.fondoHoy)} de ${$$(cap.metaFondo)}. Tu plan lo completa en ${fMes(cap.fondoCompleto)}.`);
    else add('verde', `Fondo de emergencia completo (${$$(cap.metaFondo)})`, 'Cubre imprevistos sin tocar lo que inviertas.');
    add(cap.estable ? 'verde' : 'amarillo', cap.estable ? 'Ingreso estable (nómina semanal)' : 'Ingreso sin capturar', cap.estable ? 'Te permite aportar con disciplina cada mes.' : 'Captura tu ingreso en el plan.');
    if (!cap.listoPlan) add('amarillo', 'Tu fecha de inicio llega antes que tu plan', `Según tu plan, en ${fMes(cap.mesInicio)} todavía ${cap.deudaInicio > 1 ? `deberías ${$$(cap.deudaInicio)} de tarjetas` : `tendrías ${$$(cap.fondoInicio)} de ${$$(cap.metaFondo)} en el fondo`}. Puedes empezar con un monto simbólico para aprender, o mover tu fecha a ${fMes([cap.libreTarjetas, cap.fondoCompleto].sort().at(-1))}.`);
    else add('verde', 'Tu plan está listo para tu fecha', `Para ${fMes(cap.mesInicio)} tu plan proyecta cero tarjetas y el fondo completo.`);
  } else {
  if (a.deuda == null) add('gris', 'Deudas de tarjeta o con interés alto', 'Contesta si tienes saldo de tarjeta que no liquidas cada mes.');
  else if (a.deuda === 'si') add('rojo', 'Primero liquida tus tarjetas', 'Una tarjeta cobra 40% o más al año. Pagarla es una "ganancia" segura que ninguna inversión te garantiza.');
  else add('verde', 'Sin deudas caras', 'Bien: lo que inviertas no compite contra intereses de tarjeta.');
  const m = a.fondo == null || a.fondo === '' ? null : Number(a.fondo);
  if (m == null) add('gris', 'Fondo de emergencia', 'Pon cuántos meses de gastos tienes apartados.');
  else if (m < 1) add('rojo', 'Fondo de emergencia casi vacío', 'Sin él, cualquier imprevisto te obliga a vender tus inversiones, quizá en el peor momento.');
  else if (m < 3) add('amarillo', `Fondo de emergencia: ${m} meses`, 'La referencia común es de 3 a 6 meses de gastos, en algo seguro y disponible como CETES o una cuenta de ahorro.');
  else add('verde', `Fondo de emergencia: ${m} meses`, 'Cubre imprevistos sin tocar lo que inviertas.');
  if (a.estable == null) add('gris', 'Ingreso estable', '¿Tu ingreso es constante para aportar cada mes?');
  else if (a.estable === 'no') add('amarillo', 'Ingreso variable', 'Con ingreso variable conviene un fondo de emergencia más grande y aportaciones que puedas sostener en meses flojos.');
  else add('verde', 'Ingreso estable', 'Te permite aportar con disciplina cada mes.');
  }
  if (!perfil) add('gris', 'Tu perfil', 'Contesta las 4 preguntas de abajo.');
  else add('verde', `Perfil: ${perfil.tipo}`, 'Ya sabes qué tipo de mezcla se ajusta a tu horizonte y a tu tolerancia.');
  const ops = P.ops.length, motivos = P.ops.filter((o) => o.motivo?.trim()).length;
  if (ops < 3) add('amarillo', `Práctica: ${ops} operaciones`, 'Registra al menos 3 operaciones de práctica, cada una con su motivo, para ver cómo reaccionas.');
  else if (motivos < Math.ceil(ops / 2)) add('amarillo', 'Práctica sin motivos', 'Anota por qué compras o vendes. Revisarlo después es la mejor forma de aprender.');
  else add('verde', `Práctica: ${ops} operaciones con motivo`, 'Ya estás formando el hábito de decidir con razones.');
  if ((D.reglas || '').trim().length < 40) add('amarillo', 'Tus reglas por escrito', 'Escribe cuánto vas a aportar, cada cuándo revisas y qué harás si cae 20%. Decidirlo con calma evita decisiones en pánico.');
  else add('verde', 'Reglas escritas', 'Tienes un plan al cual regresar cuando el mercado se mueva.');
  if (!D.ruta.broker) add('amarillo', 'Cuenta para invertir', 'Elige y abre tu cuenta (marca el paso en la ruta).');
  else add('verde', 'Cuenta abierta', 'Ya puedes ejecutar tu plan.');
  const rojos = items.filter((i) => i.estado === 'rojo').length, amarillos = items.filter((i) => i.estado === 'amarillo' || i.estado === 'gris').length;
  const global = rojos ? ['rojo', 'Todavía no', 'Atiende primero lo rojo; invertir con eso pendiente suele salir más caro.']
    : amarillos ? ['amarillo', 'Casi listo', 'Completa lo amarillo antes de tu fecha de inicio.']
    : ['verde', 'Listo para empezar', 'Empieza con montos pequeños y sigue tus reglas.'];
  return { items, global };
}

// ---------- Alertas ----------
function promedioMovil(serie, n) { if (serie.length < n) return null; return serie.slice(-n).reduce((a, p) => a + p.c, 0) / n; }

export function alertas(ctx, perfil) {
  const { E, activos, serieDe, tasasCetes, portafolio, nombreDe, M } = ctx;
  const out = [];
  const corto = perfil && ['<1', '1-3'].includes(E.decisiones.perfil.horizonte);
  const cetes3 = M.tasaPromedio(tasasCetes(), 365 * 3);
  for (const a of activos().filter((x) => x.id !== 'CETES')) {
    const s = serieDe(a.id); if (!s?.serie?.length) continue;
    const r = M.resumen(s.serie, tasasCetes()); if (!r) continue;
    const n = (lvl, t, p) => out.push({ lvl, activo: a.simbolo, id: a.id, t, p });
    const dias = (Date.parse(r.fecha) - Date.parse(s.serie[0].d)) / DIA;
    if (dias < 365 * 3) n('info', 'Historia corta', `Solo hay ${Math.round(dias / 30)} meses de datos. Con poca historia no sabes cómo se comporta en una crisis.`);
    if (r.ddActual <= -0.2) n('atencion', `Está ${pctS(-r.ddActual)} abajo de su máximo`, 'Una caída así puede ser oportunidad o señal de un problema de fondo. Antes de comprar, averigua por qué cayó y pregúntate si aguantarías otro tanto.');
    if (r.vol > 0.3) n(corto ? 'riesgo' : 'atencion', `Volatilidad muy alta (${pctS(r.vol)})`, corto ? 'Para dinero que necesitas en menos de 3 años, algo tan volátil puede estar abajo justo cuando lo ocupas.' : 'Se mueve mucho. Si la tienes, que sea una parte chica de tu portafolio.');
    if (r.r3a != null && cetes3 != null && r.r3a < cetes3) n('atencion', 'No le ha ganado a CETES en 3 años', `Rindió ${pctS(r.r3a, 1)} anual contra ${pctS(cetes3, 1)} de CETES, con más riesgo. Pregúntate qué esperas que cambie.`);
    if (r.r1a != null && r.r1a > 0.35) n('info', `Subió ${pctS(r.r1a)} en un año`, 'Las subidas fuertes llaman la atención, pero no garantizan que siga subiendo. Comprar "porque ya subió mucho" es de los errores más comunes.');
    const n200 = M.periodosPorAnio(s.serie) > 150 ? 200 : 40;
    const pm = promedioMovil(s.serie, n200);
    if (pm) n('info', `${r.precio >= pm ? 'Arriba' : 'Abajo'} de su promedio de ${n200 === 200 ? '200 días' : '40 semanas'} (${pctS(r.precio / pm - 1, 1)})`, 'Indica la tendencia reciente, no lo que va a pasar. Sirve para ubicarte, no para decidir solo con eso.');
  }
  // Portafolio de práctica
  const P = portafolio();
  if (P.total > 0) {
    for (const f of P.filas) {
      const peso = (f.valor || 0) / P.total;
      if (f.id !== 'CETES' && peso > 0.4) out.push({ lvl: 'atencion', activo: 'Práctica', t: `${pctS(peso)} en ${nombreDe(f.id)}`, p: 'Mucho en un solo activo: si le va mal, se lleva tu portafolio. Diversificar reduce ese riesgo.' });
      if (f.costo && f.gan / f.costo < -0.15) out.push({ lvl: 'info', activo: 'Práctica', t: `${nombreDe(f.id)} va ${pctS(f.gan / f.costo)}`, p: 'Buen momento para practicar: ¿qué dicen tus reglas que hagas? Anota lo que decides y por qué.' });
    }
    const enCetes = (P.filas.find((f) => f.id === 'CETES')?.valor || 0) + Math.max(P.efectivo, 0);
    const pf = perfilDe(E.decisiones.perfil);
    if (pf) {
      const bolsa = 1 - enCetes / P.total, [lo, hi] = MEZCLAS[pf.tipo].bolsa;
      if (P.filas.length && (bolsa * 100 > hi + 10 || bolsa * 100 < lo - 10)) out.push({ lvl: 'atencion', activo: 'Práctica', t: `${pctS(bolsa)} en bolsa; tu perfil sugiere ${lo}–${hi}%`, p: 'Tu portafolio de práctica no se parece a la mezcla de referencia de tu perfil. No está mal experimentar, pero que sea a propósito.' });
    }
  }
  const orden = { riesgo: 0, atencion: 1, info: 2 };
  return out.sort((a, b) => orden[a.lvl] - orden[b.lvl]);
}

// ---------- Ruta hasta el inicio ----------
const PASOS = [
  ['llaves', -60, 'Configura tus llaves y arma tu lista', 'Agrega de 5 a 8 activos para observar: un fondo del S&P 500, uno de México (EWW o NAFTRAC) y alguna empresa que conozcas.', 'ajustes'],
  ['aprende', -55, 'Lee la pestaña Aprende', 'Y revisa "Cómo leerlo" en el Detalle de tres activos distintos.', 'aprende'],
  ['perfil', -50, 'Contesta tu perfil', 'Aquí abajo, en esta misma pestaña.', null],
  ['simula', -45, 'Simula tu monto mensual real', 'En el Simulador, prueba lo que de verdad podrás aportar, a 5 años, contra CETES.', 'simulador'],
  ['practica', -40, 'Empieza tu práctica mensual', 'Registra cada mes la aportación que harías en la vida real, con su motivo.', 'practica'],
  ['brokers', -30, 'Compara dónde invertir', 'Compara comisiones, monto mínimo, acceso a ETFs y acciones de EE.UU. (SIC) y CETES. Por ejemplo: cetesdirecto.com para CETES, y casas de bolsa como GBM, Hapi, Bursanet o Kuspit. Revisa que estén autorizadas por la CNBV.', null],
  ['docs', -21, 'Junta tus documentos', 'Normalmente piden INE, CURP, RFC o constancia de situación fiscal, comprobante de domicilio y tu CLABE.', null],
  ['reglas', -14, 'Escribe tus reglas', 'Aquí abajo: cuánto aportas, cada cuándo revisas y qué harás si cae 20%.', null],
  ['broker', -7, 'Abre tu cuenta', 'Puede tardar algunos días en validarse.', null],
  ['semaforo', -3, 'Revisa el semáforo', 'Que no quede nada en rojo.', null],
  ['primera', 0, 'Primera aportación real', 'Empieza con un monto pequeño, según tus reglas.', null],
  ['revision', 30, 'Primera revisión mensual', 'Compara contra tu plan, no contra las noticias del día.', null],
];

export function vDecisiones(main, ctx) {
  const { E, guardar, render } = ctx; const D = E.decisiones;
  const perfil = perfilDe(D.perfil);
  const cap = ctx.cap(); const lect = ctx.lecturaPlan();
  const sem = semaforo(D, E.practica, perfil, cap);
  const pct = Number(D.pctBolsa ?? 20) / 100;
  const mensualBolsa = cap ? cap.mensualF2 * pct : null;
  const aprendiendo = !D.perfil.experiencia || D.perfil.experiencia === 'nada';
  const al = alertas(ctx, perfil);
  const tIni = Date.parse(D.inicio + 'T00:00:00Z');
  const faltan = Math.ceil((tIni - Date.now()) / DIA);
  const hechos = PASOS.filter(([k]) => D.ruta[k]).length;
  const radio = (k, v, l) => `<label class="opcion"><input type="radio" name="${k}" value="${v}" ${D.perfil[k] === v ? 'checked' : ''}><span>${l}</span></label>`;
  const mezcla = perfil && MEZCLAS[perfil.tipo];
  const ETQ = { riesgo: 'Riesgo', atencion: 'Atención', info: 'Para saber' };

  main.innerHTML = `
    <section class="cuenta">
      <div><span class="eti">Inicio con dinero real</span><b>${fLarga(tIni)}</b><small>${faltan > 0 ? `faltan ${faltan} días` : faltan === 0 ? 'es hoy' : `empezaste hace ${-faltan} días`}</small></div>
      <div class="sem-global ${sem.global[0]}"><span class="luz"></span><div><b>${sem.global[1]}</b><small>${sem.global[2]}</small></div></div>
      <div><span class="eti">Ruta</span><b>${hechos}/${PASOS.length} pasos</b><div class="progreso"><span style="width:${(hechos / PASOS.length) * 100}%"></span></div></div>
    </section>
    <p class="nota">Las sugerencias de esta pestaña salen de reglas generales de educación financiera y te explican el porqué. No son recomendaciones de compra o venta ni asesoría personalizada.</p>

    <div class="dos">
      <div class="card"><h3>¿Listo para invertir?</h3>
        ${cap ? `<p class="nota fuente">Datos tomados de tu plan de ahorro (${cap.fuente === 'registro' ? 'lo que llevas capturado en el registro semanal' : 'proyección del plan; captura tu registro semanal para usar lo real'}). <a href="#" data-accion="releerPlan">Volver a leer</a></p>` : `${lect && !lect.ok ? `<p class="banner error">${esc(lect.error)} Mientras, contesta a mano. <a href="#" data-accion="releerPlan">Reintentar</a></p>` : ''}
        <form id="fAntes" class="form">
          <div class="fila">
            <label>¿Traes saldo de tarjeta que no liquidas cada mes?<select name="deuda"><option value="">—</option><option value="si" ${D.antes.deuda === 'si' ? 'selected' : ''}>Sí</option><option value="no" ${D.antes.deuda === 'no' ? 'selected' : ''}>No</option></select></label>
            <label>Fondo de emergencia (meses de gastos)<input name="fondo" type="number" min="0" step="0.5" value="${D.antes.fondo ?? ''}"></label>
            <label>¿Ingreso estable?<select name="estable"><option value="">—</option><option value="si" ${D.antes.estable === 'si' ? 'selected' : ''}>Sí</option><option value="no" ${D.antes.estable === 'no' ? 'selected' : ''}>No</option></select></label>
          </div>
        </form>`}
        <ul class="semaforo">${sem.items.map((i) => `<li class="${i.estado}"><span class="luz"></span><div><b>${esc(i.titulo)}</b><small>${esc(i.porque)}</small></div></li>`).join('')}</ul>
      </div>

      <div class="card"><h3>Tu perfil</h3>
        <form id="fPerfil" class="form perfil">
          ${PREGUNTAS.map(([k, q, ops]) => `<fieldset><legend>${q}</legend>${ops.map(([v, l]) => radio(k, v, l)).join('')}</fieldset>`).join('')}
        </form>
        ${perfil ? `<div class="perfil-res ${perfil.tipo}">
            <span class="eti">Tu perfil</span><b>${perfil.tipo[0].toUpperCase() + perfil.tipo.slice(1)}</b>
            <div class="mezcla"><span class="b" style="flex:${(mezcla.bolsa[0] + mezcla.bolsa[1]) / 2}">Bolsa ${mezcla.bolsa[0]}–${mezcla.bolsa[1]}%</span><span class="c" style="flex:${100 - (mezcla.bolsa[0] + mezcla.bolsa[1]) / 2}">CETES / renta fija</span></div>
            <p>${mezcla.texto}</p>
            ${perfil.notas.map((n) => `<p class="nota">• ${esc(n)}</p>`).join('')}
            <p class="nota">Es una referencia educativa común para ese tipo de perfil. Mientras aprendes, una regla útil es no poner más de 10% en una sola empresa.</p>
          </div>` : '<p class="vacio">Contesta las 4 preguntas para ver tu perfil.</p>'}
      </div>
    </div>

    ${cap ? `<div class="card"><h3>Tu capacidad para invertir <small>según tu plan de ahorro</small></h3>
      <div class="resultados">
        <div><span class="eti">Ingreso mensual</span><b>${$$(cap.ingresoMensual)}</b><small>gasto esencial ${$$(cap.gastoEsencial)}</small></div>
        <div><span class="eti">Libre de tarjetas</span><b>${fMes(cap.libreTarjetas)}</b><small>hoy debes ${$$(cap.deuda)}</small></div>
        <div><span class="eti">Fondo de emergencia completo</span><b>${fMes(cap.fondoCompleto)}</b><small>meta ${$$(cap.metaFondo)}</small></div>
        <div><span class="eti">Ahorro e inversión al mes</span><b class="sube">${$$(cap.mensualF2)}</b><small>lo que tu plan libera ya sin deudas</small></div>
      </div>
      <div class="reparto-cap">
        <label>¿Qué parte de esa capacidad mensual quieres destinar a la bolsa? <b>${Math.round(pct * 100)}%</b>
          <input type="range" id="rngBolsa" min="0" max="100" step="5" value="${Math.round(pct * 100)}"></label>
        <div class="mezcla"><span class="b" style="flex:${Math.max(pct, 0.001)}">Bolsa ${$$(mensualBolsa)}/mes</span><span class="c" style="flex:${Math.max(1 - pct, 0.001)}">Otras metas ${$$(cap.mensualF2 - mensualBolsa)}/mes</span></div>
        <p class="nota">"Otras metas" es lo que sigue para tu casa, tu fondo de reinversión de Acordeonix y tu ahorro en CETES. Tú decides el reparto; la app solo te muestra el efecto.</p>
      </div>
      <ul class="lectura">
        ${aprendiendo && mensualBolsa ? `<li>Como apenas empiezas, podrías arrancar con la mitad, unos <b>${$$(mensualBolsa / 2)}</b> al mes, los primeros 3 a 6 meses, y subir cuando ya hayas vivido alguna caída sin vender.</li>` : ''}
        ${cap.excedenteInicio > 0 ? `<li>Para ${fMes(cap.mesInicio)} tu plan proyecta <b>${$$(cap.excedenteInicio)}</b> por encima de tu fondo de emergencia, que es el fondo de reinversión que reservaste para Acordeonix. Si parte va a bolsa, una práctica común es meterlo en partes mes a mes en vez de todo de golpe.</li>` : ''}
        <li>El fondo de emergencia (${$$(cap.metaFondo)}) va en CETES o en una cuenta disponible, nunca en bolsa.</li>
        ${D.perfil.objetivo === 'enganche' ? '<li>El dinero del enganche de tu casa, si lo vas a usar en menos de 3 años, conviene que esté en CETES y no en bolsa.</li>' : ''}
      </ul>
      ${mensualBolsa ? `<button class="btn sec" data-accion="simularCap">Simular ${$$(aprendiendo ? mensualBolsa / 2 : mensualBolsa)} al mes</button>` : ''}
    </div>` : ''}

    <div class="card"><h3>Alertas de tu lista y tu práctica <small>${al.length} activas</small></h3>
      ${al.length ? `<ul class="alertas">${al.map((x) => `<li class="${x.lvl}"><span class="nivel">${ETQ[x.lvl]}</span><div><b>${esc(x.activo)} · ${esc(x.t)}</b><small>${esc(x.p)}</small></div>${x.id ? `<a href="#" data-abrir="${esc(x.id)}">ver</a>` : ''}</li>`).join('')}</ul>` : '<p class="vacio">Sin alertas. Agrega activos o registra operaciones de práctica.</p>'}
    </div>

    <div class="dos">
      <div class="card"><h3>Ruta hasta tu inicio</h3>
        <label class="mini-form">Fecha de inicio <input type="date" id="inpInicio" value="${D.inicio}"></label>
        <ol class="ruta">${PASOS.map(([k, off, t, d, ir]) => {
          const f = tIni + off * DIA; const vencido = !D.ruta[k] && f < Date.now();
          return `<li class="${D.ruta[k] ? 'hecho' : vencido ? 'vencido' : ''}"><label><input type="checkbox" data-paso="${k}" ${D.ruta[k] ? 'checked' : ''}><span><b>${t}</b> <small>${fLarga(f)}</small><br><small>${d}</small>${ir ? ` <a href="#" data-ir="${ir}">ir</a>` : ''}</span></label></li>`;
        }).join('')}</ol>
      </div>
      <div class="card"><h3>Mis reglas de inversión</h3>
        <p class="nota">Escríbelas ahora, con calma, para seguirlas cuando el mercado se mueva. Ejemplo:</p>
        <p class="nota ejemplo">"Aporto $X el día 1 de cada mes. Reviso mi portafolio una vez al mes, no a diario. El dinero del enganche no entra a bolsa. Si algo cae 20%, no vendo por miedo: reviso si cambió la razón por la que lo compré. Nada de una sola empresa pasa de 10%."</p>
        <textarea id="txtReglas" rows="9" placeholder="Mis reglas…">${esc(D.reglas)}</textarea>
        <p class="nota" id="reglasGuardado"></p>
      </div>
    </div>`;

  main.onchange = (ev) => {
    const t = ev.target;
    if (t.closest('#fAntes')) { const f = new FormData(t.form); D.antes = { deuda: f.get('deuda') || null, fondo: f.get('fondo') === '' ? null : Number(f.get('fondo')), estable: f.get('estable') || null }; guardar(); render(); }
    else if (t.closest('#fPerfil')) { D.perfil[t.name] = t.value; guardar(); render(); }
    else if (t.dataset.paso) { D.ruta[t.dataset.paso] = t.checked; guardar(); render(); }
    else if (t.id === 'inpInicio' && t.value) { D.inicio = t.value; guardar(); render(); }
    else if (t.id === 'rngBolsa') { D.pctBolsa = Number(t.value); guardar(); render(); }
  };
  let tReglas;
  const rng = main.querySelector('#rngBolsa');
  if (rng) rng.oninput = (ev) => { const b = ev.target.closest('label').querySelector('b'); b.textContent = ev.target.value + '%'; };
  main.querySelector('#txtReglas').oninput = (ev) => {
    D.reglas = ev.target.value; clearTimeout(tReglas);
    tReglas = setTimeout(() => { guardar(); main.querySelector('#reglasGuardado').textContent = 'Guardado.'; }, 600);
  };
}
