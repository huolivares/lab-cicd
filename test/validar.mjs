/**
 * validar.mjs — Verificación automática de la presentación
 * =========================================================
 * Estas reglas son DELIBERADAMENTE frágiles.
 *
 * El objetivo didáctico es el ejercicio de "rechazo controlado": un participante
 * edita una slide, se salta una regla sin darse cuenta, y el pipeline bloquea la
 * fusión. El equipo necesita ver al sistema decir que no, en un entorno donde
 * equivocarse no tiene consecuencias.
 *
 * No endurecer estas reglas. Si algo no falla nunca, no enseña nada.
 *
 * Uso: node test/validar.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');

const errores = [];
const revisar = (nombre, condicion, mensaje) => {
  if (condicion) {
    console.log(`  ✓ ${nombre}`);
  } else {
    console.log(`  ✗ ${nombre}`);
    errores.push(`${nombre}: ${mensaje}`);
  }
};

console.log('\nVerificando la presentación...\n');

// Extraer las slides (sin las anidadas, que reveal permite)
const slides = [...html.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g)].map(m => m[1]);

// ── 1. Hay slides ─────────────────────────────────────────────────────
revisar(
  'La presentación tiene slides',
  slides.length > 0,
  'no se encontró ninguna <section> dentro de .slides',
);

// ── 2. Cada slide tiene título ────────────────────────────────────────
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

// ── 3. Nada a medio terminar ──────────────────────────────────────────
// Sin la bandera `i`: en español "todo" es una palabra corriente y daba falsos positivos.
const pendientes = [...html.matchAll(/\b(TODO|FIXME|XXX|HACK)\b/g)].map(m => m[1]);
revisar(
  'No quedan marcas de trabajo pendiente',
  pendientes.length === 0,
  `se encontró ${pendientes.join(', ')} en el HTML. Terminar o borrar antes de publicar.`,
);

// ── 4. Las slides caben en pantalla ───────────────────────────────────
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

// ── 5. No hay demasiadas viñetas ──────────────────────────────────────
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

// ── 6. El marcador de versión sigue en su lugar ───────────────────────
revisar(
  'El marcador de versión está presente',
  html.includes('VERSION_PLACEHOLDER'),
  'falta VERSION_PLACEHOLDER. El pipeline no podrá marcar qué versión se publicó.',
);

// ── 7. El HTML está bien cerrado ──────────────────────────────────────
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
console.log(`Todo en orden. ${slides.length} slides verificadas.\n`);
