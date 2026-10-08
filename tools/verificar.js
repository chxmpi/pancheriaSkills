/* ==========================================================================
   verificar.js — chequeos del proyecto
   --------------------------------------------------------------------------
   Uso:  node tools/verificar.js

   Valida lo que se rompe en silencio:
     1. que todo href="#ancla" tenga un id correspondiente
     2. que los data-txt / data-href / data-src del HTML tengan token en data.js
     3. que cada archivo referenciado exista en disco
     4. que el HTML esté balanceado y sin caracteres de reemplazo (mojibake)
     5. que los horarios de data.js generen un JSON-LD válido
     6. que la lógica de "abierto ahora" acierte en los casos borde

   No necesita dependencias: sólo Node.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

let fallos = 0;
let pruebas = 0;

function ok(titulo, detalle) {
  pruebas++;
  console.log('  ok   ' + titulo + (detalle ? '  (' + detalle + ')' : ''));
}

function fail(titulo, detalle) {
  pruebas++;
  fallos++;
  console.log('  FALLA ' + titulo + (detalle ? '  (' + detalle + ')' : ''));
}

function check(condicion, titulo, detalle) {
  condicion ? ok(titulo, detalle) : fail(titulo, detalle);
}

console.log('\n=== Panchievo · verificación del proyecto ===\n');

/* ------------------------------------------------------------------ */
console.log('1. Estructura de archivos');
/* ------------------------------------------------------------------ */

const requeridos = [
  'index.html',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'css/responsive.css',
  'js/data.js',
  'js/horarios.js',
  'js/seo.js',
  'js/main.js',
  'assets/img/local-panchievo.jpg',
  'Panchievo · Panchos y hamburguesas en Dock Sud.md',
  'AGENTS.md'
];

requeridos.forEach((f) => {
  check(fs.existsSync(path.join(RAIZ, f)), 'existe ' + f);
});

/* ------------------------------------------------------------------ */
console.log('\n2. Referencias a archivos desde el HTML');
/* ------------------------------------------------------------------ */

const html = leer('index.html');

// Los atributos data-href/data-src llevan tokens {{...}}: se resuelven en
// tiempo de ejecución desde js/main.js, no apuntan a un archivo en disco.
[...html.matchAll(/(?:href|src)="((?!https?:|#|tel:|data:|\{\{)[^"]+)"/g)].forEach((m) => {
  const ref = m[1].split('?')[0];
  check(fs.existsSync(path.join(RAIZ, ref)), 'referencia ' + ref + ' existe');
});

/* ------------------------------------------------------------------ */
console.log('\n3. Anclas internas (#id)');
/* ------------------------------------------------------------------ */

const ids = [...new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))];
const anclas = [...new Set([...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))];

anclas.forEach((a) => {
  check(ids.includes(a), 'ancla #' + a, ids.includes(a) ? '' : 'sin id en el HTML');
});

/* Los href del nav salen de data.js, hay que cruzarlos contra los ids */
const nav = leer('js/data.js');
[...nav.matchAll(/href:\s*'#([^']+)'/g)].forEach((m) => {
  check(ids.includes(m[1]), 'ancla de data.js #' + m[1], ids.includes(m[1]) ? '' : 'sin id en el HTML');
});

/* ------------------------------------------------------------------ */
console.log('\n4. Tokens de datos usados en el HTML');
/* ------------------------------------------------------------------ */

const tokensUsados = [...new Set(
  [...html.matchAll(/data-(?:txt|href|src)="\{\{(.+?)\}\}"/g)].map((m) => m[1])
)];

// Tokens que define js/main.js
const main = leer('js/main.js');
tokensUsados.forEach((t) => {
  const needle = "'{{" + t + "}}':";
  check(main.includes(needle), 'token {{' + t + '}} definido en main.js',
    main.includes(needle) ? '' : 'falta la clave en el objeto reemplazos de main.js');
});

// Ningún token sin reemplazar debería sobrevivir en el HTML final
const sobrantes = [...html.matchAll(/\{\{(.+?)\}\}/g)].map((m) => m[1]);
const duplicados = sobrantes.filter((t) => !tokensUsados.includes(t));
check(duplicados.length === 0, 'sin tokens huérfanos en el HTML',
  duplicados.length ? duplicados.join(', ') : '');

/* ------------------------------------------------------------------ */
console.log('\n5. Integridad del texto (mojibake)');
/* ------------------------------------------------------------------ */

['index.html', 'js/data.js', 'js/horarios.js', 'js/seo.js', 'js/main.js',
 'css/base.css', 'css/layout.css', 'css/components.css', 'css/responsive.css',
 'AGENTS.md'].forEach((f) => {
  const t = leer(f);
  const fffd = (t.match(/\uFFFD/g) || []).length;
  const cjk = (t.match(/[\u3000-\u9FFF]/g) || []).length;
  check(fffd === 0 && cjk === 0, f + ' sin caracteres corruptos',
    fffd ? fffd + ' U+FFFD' : cjk ? cjk + ' CJK' : '');
});

/* ------------------------------------------------------------------ */
console.log('\n6. Balance de etiquetas del HTML');
/* ------------------------------------------------------------------ */

['section', 'details', 'div', 'a', 'ul', 'li', 'script', 'style', 'main', 'figure'].forEach((tag) => {
  const abiertas = (html.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length;
  const cerradas = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
  check(abiertas === cerradas, tag + ' balanceado', abiertas + '/' + cerradas);
});

/* ------------------------------------------------------------------ */
console.log('\n7. Horarios: data.js -> JSON-LD');
/* ------------------------------------------------------------------ */

// Cargamos data.js en un sandbox mínimo
const sandbox = { window: {} };
new Function('window', leer('js/data.js'))(sandbox.window);
const CFG = sandbox.window.PANCHIEVO;

check(!!CFG, 'data.js define window.PANCHIEVO');
check(Object.keys(CFG.horarios).length === 7, 'los 7 días tienen horario',
  Object.keys(CFG.horarios).length + ' días');

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const aNum = (h) => { const p = h.split(':').map(Number); return p[0] * 60 + p[1]; };

Object.keys(CFG.horarios).forEach((d) => {
  CFG.horarios[d].forEach((b) => {
    const formato = /^\d{2}:\d{2}$/.test(b[0]) && /^\d{2}:\d{2}$/.test(b[1]);
    const detalle = !formato ? 'HH:MM inválido'
      : aNum(b[1]) <= aNum(b[0]) ? 'cierre <= apertura: faltaría el +1440 del cruce de medianoche'
      : aNum(b[0]) >= 1440 ? 'apertura >= 24:00, imposible'
      : '';

    check(formato && !detalle,
      DIAS[d] + ' ' + b[0] + '–' + b[1] + ' formato correcto', detalle);
  });
});

/* Los cierres que cruzan medianoche deben llevar 24:00/26:00, no 00:00/02:00 */
/* Un tramo "spillea" al día siguiente solo si cierra DESPUÉS de medianoche
   (cierre > 24:00). Un cierre a las 24:00 exact es medianoche, no spill. */
const spillean = Object.keys(CFG.horarios).flatMap((d) =>
  CFG.horarios[d].filter((b) => aNum(b[1]) > 1440).map((b) => ({ d, b })));
check(spillean.length === 2, 'los 2 turnos hasta las 2 spillean al día siguiente',
  spillean.map((x) => DIAS[x.d] + ' ' + x.b[0] + '–' + x.b[1]).join(', '));

spillean.forEach((x) => {
  const cierre = x.b[1].split(':')[0];
  check(cierre === '26', DIAS[x.d] + ' usa 26:00 y no 02:00',
    cierre === '26' ? '' : 'está como ' + x.b[1] + ', rompería el rango del mismo día');
});

/* Ningún tramo debe usar el error clásico: cierre menor o igual a apertura */
const invertidos = Object.keys(CFG.horarios).flatMap((d) =>
  CFG.horarios[d].filter((b) => aNum(b[1]) <= aNum(b[0])).map((b) => DIAS[d]));
check(invertidos.length === 0, 'ningún tramo con cierre <= apertura',
  invertidos.length ? invertidos.join(', ') : '');

/* Reimplementamos seo.js para validar su salida */
const schema = (() => {
  const DIAS_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const aSchemaHora = (h) => {
    const p = h.split(':');
    const hh = parseInt(p[0], 10) % 24;
    return (hh < 10 ? '0' : '') + hh + ':' + p[1];
  };
  const specs = [];
  Object.keys(CFG.horarios).forEach((d) => {
    CFG.horarios[d].forEach((b) => {
      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: DIAS_SCHEMA[d],
        opens: aSchemaHora(b[0]),
        closes: aSchemaHora(b[1])
      });
    });
  });
  return specs;
})();

try {
  JSON.stringify({ '@context': 'https://schema.org', '@type': 'Restaurant', openingHoursSpecification: schema });
  ok('JSON-LD serializa sin error', schema.length + ' tramos');
} catch (e) {
  fail('JSON-LD serializa sin error', e.message);
}

schema.forEach((s) => {
  const hh = (s.closes || '').split(':')[0];
  check(Number(hh) < 24, 'cierre schema ' + s.dayOfWeek + ' ' + s.opens + '-' + s.closes,
    Number(hh) < 24 ? '' : 'supera las 24');
});

/* ------------------------------------------------------------------ */
console.log('\n8. Lógica de "abierto ahora" (casos borde — horarios COMIDAS)');
/* ------------------------------------------------------------------ */

const hSandbox = { window: sandbox.window, setInterval: () => {}, document: {} };
new Function('window', 'document', 'setInterval', leer('js/horarios.js'))(
  hSandbox.window, hSandbox.document, hSandbox.setInterval
);

const calc = hSandbox.window.PanchievoHorarios._calcularEstado;

/* Nuevos horarios de COMIDAS:
   Dom: [] (TODO), Lun: [] (TODO), Mar: [], Mié: 20-24, Jue: 20-24, Vie: 20-26, Sáb: 20-26 */
const casos = [
  // Domingo — sin horario confirmado (cerrado)
  [0, 12, 0, false],
  [0, 20, 0, false],
  [0, 23, 59, false],
  // Lunes — sin horario confirmado (cerrado)
  [1, 12, 0, false],
  [1, 20, 0, false],
  [1, 23, 59, false],
  // Martes — CERRADO todo el día
  [2, 12, 0, false],
  [2, 20, 0, false],
  [2, 23, 59, false],
  // Miércoles — 20:00-24:00
  [3, 12, 0, false],
  [3, 19, 59, false],
  [3, 20, 0, true],
  [3, 23, 59, true],
  // Jueves — 20:00-24:00 (spill a viernes 00:00 = jueves 24:00)
  [4, 12, 0, false],
  [4, 19, 59, false],
  [4, 20, 0, true],
  [4, 23, 59, true],
  // Viernes — 20:00-26:00 (spill a sábado)
  [5, 12, 0, false],
  [5, 19, 59, false],
  [5, 20, 0, true],
  [5, 23, 59, true],
  // Sábado — 20:00-26:00 + spill de viernes (00:00-02:00)
  [6, 0, 0, true],   // spill viernes->sábado (viernes cierra 26:00 = sábado 02:00)
  [6, 1, 59, true],
  [6, 2, 0, false],  // terminó el spill
  [6, 12, 0, false],
  [6, 19, 59, false],
  [6, 20, 0, true],  // horario propio del sábado
  [6, 23, 59, true],
  // Domingo — spill de sábado (00:00-02:00)
  [0, 0, 0, true],   // spill sábado->domingo
  [0, 1, 59, true],
  [0, 2, 0, false],
];

casos.forEach(([d, h, m, esperado]) => {
  const fecha = new Date(2026, 8, 13 + d, h, m); // 13/09/2026 = domingo
  const r = calc(fecha);
  check(r.abierto === esperado,
    DIAS[d] + ' ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') +
    ' → ' + (r.abierto ? 'abierto' : 'cerrado'),
    r.abierto === esperado ? '' : 'esperaba ' + esperado + ', dio ' + r.abierto);
});

/* Próxima apertura nunca puede ser null cuando está cerrado */
[0, 1, 2, 3].forEach((d) => {
  const r = calc(new Date(2026, 8, 13 + d, 15, 0));
  check(!r.abierto && r.proximo !== null,
    DIAS[d] + ' 15:00 propone próxima apertura', r.proximo ? r.proximo.hora : 'null');
});

/* --- El texto de la tabla (GRABACIÓN + COMIDAS = 14 filas) ---------- */
const celdas = {};
const docStub = {
  getElementById: (id) => celdas[id] || (celdas[id] = { innerHTML: '' }),
  querySelector: () => null
};
const h2 = { window: {}, setInterval: () => {}, document: docStub };
h2.window.PANCHIEVO = sandbox.window.PANCHIEVO;
new Function('window', 'document', 'setInterval', leer('js/horarios.js'))(
  h2.window, docStub, () => {}
);
h2.window.PanchievoHorarios.init();

const tabla = celdas.horList ? celdas.horList.innerHTML : '';
const tablaTxt = tabla.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

check(tablaTxt.includes('16:00 - 19:00'),
  'la tabla muestra el rango de grabación "16:00 - 19:00"', tablaTxt.slice(0, 60));
check(tablaTxt.includes('20:00 - 24:00'),
  'la tabla muestra el cierre de medianoche como 24:00');
check(!/20:00\s*-\s*00:00/.test(tablaTxt),
  'no queda "20:00 - 00:00" (se leía como dato roto)');
check(!/\d{2}:\d{2}–\d{2}:\d{2}/.test(tablaTxt),
  'no quedan guiones compactos sin espacios');

/* Nueva estructura: 14 filas (2 por día = GRABACIÓN + COMIDAS) */
const filas = (tabla.match(/class="hor-row/g) || []).length;
check(filas === 14, 'la tabla tiene 14 filas (2 por día)', filas + ' filas');

/* Ya no hay separadores "y" porque cada tipo tiene máx. 1 franja por día */
const seps = (tabla.match(/class="sep"/g) || []).length;
check(seps === 0, 'no hay separadores "y" (una franja por tipo)', seps + ' separadores');

/* Cada fila arranca con el día y su badge */
check(!/<div><span class="sep">/.test(tabla),
  'ninguna fila empieza con "y"');

/* Las notas de DOM/LUN (TODO) y MARTES (Cerrado) aparecen en COMIDAS */
const notas = (tabla.match(/TODO: confirmar horario de comidas con el dueño/g) || []).length;
check(notas === 2, 'las notas de Dom/Lun TODO aparecen en COMIDAS', notas + ' notas');

/* Los cierres posteriores a medianoche siguen mostrándose en 24 h */
check(tablaTxt.includes('20:00 - 02:00'),
  'el viernes muestra el cruce de medianoche como 02:00');

/* Badges GRABACIÓN y COMIDAS presentes */
check(tabla.includes('badge-grab') && tabla.includes('badge-comi'),
  'las filas llevan badges GRABACIÓN/COMIDAS');

/* ------------------------------------------------------------------ */
console.log('\n9. Coherencia data.js ↔ copy en markdown');
/* ------------------------------------------------------------------ */

const md = leer('Panchievo · Panchos y hamburguesas en Dock Sud.md');

check(md.includes(CFG.telefonoLegible), 'el .md trae el teléfono ' + CFG.telefonoLegible);
check(md.includes(String(CFG.coords.lat)), 'el .md trae la latitud');
check(md.includes(CFG.cp), 'el .md trae el código postal');
check(md.includes(CFG.menuOnline), 'el .md trae el link del menú online');

/* ------------------------------------------------------------------ */
console.log('\n10. Contraste (WCAG AA)');
/* ------------------------------------------------------------------ */

const lum = (hex) => {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const ratio = (a, b) => {
  const l1 = lum(a);
  const l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

/* Lee un token de :root. Acepta el nombre con o sin los guiones iniciales. */
function token(nombre) {
  const limpio = nombre.replace(/^-+/, '');
  const m = leer('css/base.css').match(new RegExp('--' + limpio + ':\\s*(#[0-9A-Fa-f]{3,6})'));
  return m ? m[1] : null;
}

const pares = [
  ['texto de item sobre tarjeta blanca', '--tinta', '#ffffff', 4.5],
  ['descripción sobre tarjeta blanca', '--tinta-suave', '#ffffff', 4.5],
  ['naranja-texto sobre blanco', '--naranja-texto', '#ffffff', 4.5],
  ['eyebrow sobre crema', '--naranja-texto', '--crema', 4.5],
  ['texto principal sobre crema', '--tinta', '--crema', 4.5],
  ['hero: blanco sobre naranja', '#ffffff', '--naranja-fondo', 4.5],
  ['hero: dorado sobre naranja', '--dorado-texto', '--naranja-fondo', 3],
  ['hero: título normal sobre naranja', '#ffffff', '--naranja-fondo', 3],
  ['sección oscura: crema sobre tinta', '--crema', '--tinta', 4.5],
  ['sección oscura: bajada sobre tinta', '#D9C2AE', '--tinta', 4.5],
  ['estado abierto sobre barra', '#3ddc84', '--tinta', 4.5],
  ['estado cerrado sobre barra', '#ff9b9b', '--tinta', 4.5],
  ['fila de hoy: blanco sobre naranja', '#ffffff', '--naranja-fondo', 4.5],
  ['fila de hoy: separador sobre naranja', '--dorado-texto', '--naranja-fondo', 3],
  ['enlace del footer', '#D9C2AE', '--tinta', 4.5],
  ['whatsapp flotante', '#ffffff', '--verde', 4.5]
];

pares.forEach(([nombre, fg, bg, minimo]) => {
  const c = (s) => (s.startsWith('#') && s.length === 7 ? s : token(s));
  const a = c(fg);
  const b = c(bg);
  if (!a || !b) {
    fail('contraste ' + nombre, 'no se pudo resolver ' + (a || fg) + ' / ' + (b || bg));
    return;
  }
  const r = ratio(a, b);
  check(r >= minimo, nombre + ' ≥ ' + minimo + ':1', r.toFixed(2) + ':1');
});

/* --naranja da 4.04:1 sobre blanco: sirve para bordes, fondos y botones,
   nunca para texto sobre fondo claro. --naranja-texto (5.4:1) es el que va.
   Este control lo vigila para que nadie reintroduzca el error. */
check(ratio(token('naranja'), '#ffffff') < 4.5,
  'se reconoce que --naranja no sirve para texto claro',
  ratio(token('naranja'), '#ffffff').toFixed(2) + ':1');
check(ratio(token('naranja-texto'), '#ffffff') >= 4.5,
  '--naranja-texto sí sirve para texto claro',
  ratio(token('naranja-texto'), '#ffffff').toFixed(2) + ':1');

['base.css', 'layout.css', 'components.css', 'responsive.css'].forEach((f) => {
  const fuente = leer('css/' + f);
  /* (?<![\w-]) descarta border-color / background-color, que sí pueden usar
     --naranja sin problema. Sólo importa el color de texto. */
  const usos = fuente.match(/(?<![\w-])color:\s*var\(--naranja\)/g) || [];
  check(usos.length === 0,
    f + ' no usa --naranja como color de texto',
    usos.length ? usos.length + ' usos restantes' : '');
});

/* Toda tarjeta con fondo blanco dentro de una .alt debe resetear el color,
   o hereda crema sobre blanco (1.07:1). */
const componentes = leer('css/components.css');
['.item', '.step', '.social-card', '.map-grid', 'details'].forEach((sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = componentes.match(new RegExp('(^|[,}\\s])' + esc + '\\s*\\{([^}]*)\\}', 'm'));
  const resetea = m && /color:\s*var\(--tinta\)/.test(m[2]);
  check(!!resetea, sel + ' resetea el color dentro de .alt',
    resetea ? '' : 'falta color:var(--tinta) — quedaría crema sobre blanco');
});

/* ------------------------------------------------------------------ */
console.log('\n11. Estructura visual pedida');
/* ------------------------------------------------------------------ */

check(!/waze/i.test(html), 'sin Waze en el HTML');
check(!/waze/i.test(leer('js/main.js')), 'sin Waze en main.js');
check(html.includes('{{mapaEmbed}}'), 'el mapa usa el embed de Google Maps');
check(leer('js/main.js').includes('output=embed'), 'el embed de Google usa output=embed');
check(!/openstreetmap/i.test(html + leer('js/main.js')), 'sin referencias a OpenStreetMap');

/* Los tres íconos de red deben ser SVG, no emoji */
const svgs = (html.match(/class="ico (ig|tt|fb)"/g) || []).length;
check(svgs === 3, 'las 3 tarjetas de red usan ícono SVG', svgs + ' encontradas');
check(!/📸|🎵|👥/.test(html), 'sin emoji como ícono de red');

/* El rango horario debe llevar espacios: "11:00 - 14:00" */
check(leer('js/horarios.js').includes("' - '"), 'el rango horario usa " - " con espacios');

/* ------------------------------------------------------------------ */
console.log('\n12. Prohibiciones');
/* ------------------------------------------------------------------ */

check(!/\$\s?\d/.test(html), 'sin precios inventados en el HTML',
  'si el dueño ya los pasó, actualizá esta regla y el bloque de la carta');
check(!/denirohamburgueseria\.com\.ar/.test(html), 'sin hotlinks al directorio',
  'la foto ahora es local en assets/img/');

/* ------------------------------------------------------------------ */
console.log('\n' + '='.repeat(52));
if (fallos === 0) {
  console.log('RESULTADO: ' + pruebas + ' comprobaciones, 0 fallos');
  console.log('='.repeat(52) + '\n');
  process.exit(0);
} else {
  console.log('RESULTADO: ' + pruebas + ' comprobaciones, ' + fallos + ' FALLOS');
  console.log('='.repeat(52) + '\n');
  process.exit(1);
}
