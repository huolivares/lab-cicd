/**
 * validar.mjs — Verificación automática de la presentación
 * =========================================================
 * Dos niveles de chequeo:
 *
 *   1. Cada fragmento de participantes/ por separado: que exista, que sea UN
 *      <section> con UN <h2>, y que sus etiquetas estén bien cerradas. Estos
 *      chequeos son ESTRUCTURALES a propósito: NO miran el texto ("completar
 *      acá" es válido), solo la forma. Así `main` nace en verde y el pipeline
 *      arranca sano.
 *
 *   2. La presentación ya ensamblada (plantilla + fragmentos): reglas
 *      DELIBERADAMENTE frágiles sobre las slides.
 *
 * El objetivo didáctico es el "rechazo controlado": un participante borra el
 * </section> o el <h2> de SU archivo, el test cae, y el log dice exactamente
 * qué archivo y qué le falta. El equipo ve al sistema decir que no, en un
 * entorno donde equivocarse no tiene consecuencias.
 *
 * No endurecer estas reglas. Si algo no falla nunca, no enseña nada.
 *
 * Uso: node test/validar.mjs
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ensamblar } from '../src/leer-participantes.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const errores = [];
const revisar = (nombre, condicion, mensaje) => {
  if (condicion) {
    console.log(`  ✓ ${nombre}`);
  } else {
    console.log(`  ✗ ${nombre}`);
    errores.push(`${nombre}: ${mensaje}`);
  }
};

// Etiquetas sin cierre: no cuentan para el balance.
const VACIAS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'wbr']);

// Devuelve la lista de etiquetas que quedaron abiertas o cerradas de más.
const desbalance = (html) => {
  const cuenta = {};
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g)) {
    const [, cierre, tag, autocierre] = m;
    const t = tag.toLowerCase();
    if (autocierre || VACIAS.has(t)) continue;
    cuenta[t] = (cuenta[t] || 0) + (cierre ? -1 : 1);
  }
  return Object.entries(cuenta).filter(([, n]) => n !== 0).map(([t]) => t);
};

console.log('\nVerificando la presentación...\n');

// ── NIVEL 1 · cada fragmento de participantes/ ────────────────────────
const { html, fragmentos } = ensamblar(raiz);

revisar(
  'Hay fragmentos de participantes',
  fragmentos.length > 0,
  'el directorio participantes/ no tiene ningún archivo .html',
);

for (const f of fragmentos) {
  const abreSection = (f.html.match(/<section\b/g) || []).length;
  const cierraSection = (f.html.match(/<\/section>/g) || []).length;
  const h2 = (f.html.match(/<h2\b/g) || []).length;
  const cierraH2 = (f.html.match(/<\/h2>/g) || []).length;
  const sueltas = desbalance(f.html);

  let mensaje = null;
  if (abreSection !== 1 || cierraSection !== 1) {
    mensaje = `debe ser exactamente un <section>…</section> ` +
      `(encontrado: ${abreSection} de apertura, ${cierraSection} de cierre)`;
  } else if (!f.html.startsWith('<section')) {
    mensaje = 'el fragmento tiene que empezar con <section>';
  } else if (!f.html.endsWith('</section>')) {
    mensaje = 'falta el </section> de cierre al final del archivo';
  } else if (h2 !== 1 || cierraH2 !== 1) {
    mensaje = `debe tener exactamente un <h2>…</h2> ` +
      `(encontrado: ${h2} de apertura, ${cierraH2} de cierre)`;
  } else if (sueltas.length) {
    mensaje = `etiquetas sin cerrar o cerradas de más: ${sueltas.join(', ')}`;
  }

  revisar(f.ruta, mensaje === null, mensaje ?? '');
}

// ── NIVEL 2 · la presentación ensamblada ─────────────────────────────
// Extraer las slides (sin las anidadas, que reveal permite)
const slides = [...html.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g)].map(m => m[1]);

revisar(
  'La presentación tiene slides',
  slides.length > 0,
  'no se encontró ninguna <section> dentro de .slides',
);

// La primera es la portada y usa <h1>; el resto debe usar <h2>.
const sinTitulo = [];
slides.forEach((s, i) => {
  const tieneTitulo = i === 0 ? /<h1\b/.test(s) : /<h2\b/.test(s);
  if (!tieneTitulo) sinTitulo.push(i + 1);
});
revisar(
  'Todas las slides tienen título',
  sinTitulo.length === 0,
  `sin título: slide ${sinTitulo.join(', ')}. La portada lleva <h1>, las demás <h2>.`,
);

// Sin la bandera `i`: en español "todo" es una palabra corriente y daba falsos positivos.
const pendientes = [...html.matchAll(/\b(TODO|FIXME|XXX|HACK)\b/g)].map(m => m[1]);
revisar(
  'No quedan marcas de trabajo pendiente',
  pendientes.length === 0,
  `se encontró ${pendientes.join(', ')} en el HTML. Terminar o borrar antes de publicar.`,
);

// Regla arbitraria a propósito: una slide con demasiado texto no se lee de lejos.
const LIMITE = 700;
const largas = [];
slides.forEach((s, i) => {
  const texto = s
    .replace(/<aside[\s\S]*?<\/aside>/g, ' ')   // las notas del presentador no se proyectan
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (texto.length > LIMITE) largas.push(`${i + 1} (${texto.length} caracteres)`);
});
revisar(
  `Ninguna slide pasa de ${LIMITE} caracteres`,
  largas.length === 0,
  `demasiado texto en la slide ${largas.join(', ')}. Partirla en dos.`,
);

// Es lo que mejor predice que una slide se corte en pantalla.
const MAX_VINETAS = 7;
const cargadas = [];
slides.forEach((s, i) => {
  const n = (s.match(/<li\b/g) || []).length;
  if (n > MAX_VINETAS) cargadas.push(`${i + 1} (${n} viñetas)`);
});
revisar(
  `Ninguna slide pasa de ${MAX_VINETAS} viñetas`,
  cargadas.length === 0,
  `demasiadas viñetas en la slide ${cargadas.join(', ')}. Partirla en dos.`,
);

revisar(
  'El marcador de versión está presente',
  html.includes('VERSION_PLACEHOLDER'),
  'falta VERSION_PLACEHOLDER. El pipeline no podrá marcar qué versión se publicó.',
);

const abre = (html.match(/<section\b/g) || []).length;
const cierra = (html.match(/<\/section>/g) || []).length;
revisar(
  'Las etiquetas <section> están balanceadas',
  abre === cierra,
  `${abre} etiquetas abiertas y ${cierra} cerradas.`,
);

// ── Resultado ─────────────────────────────────────────────────────────
console.log('');
if (errores.length) {
  console.error('La verificación falló:\n');
  errores.forEach(e => console.error('  · ' + e));
  console.error('\nEl cambio NO se publica hasta que esto pase.\n');
  process.exit(1);
}
console.log(`Todo en orden. ${fragmentos.length} fragmentos y ${slides.length} slides verificadas.\n`);
