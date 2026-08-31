/**
 * build.mjs — Construcción del artefacto publicable
 * ==================================================
 * Toma el código fuente y produce `dist/`, que es lo que se publica.
 *
 * Es a propósito el paso más simple posible, pero hace lo mismo que un build
 * real: separa "el código" de "lo que se publica", ensambla la presentación a
 * partir de varios archivos, e inyecta la versión para que en pantalla se vea
 * SIEMPRE qué commit está publicado.
 *
 * El ensamblado es lo que le da a cada participante un archivo propio en
 * `participantes/`: editan solo el suyo y el build junta todo. El
 * descubrimiento es por directorio (ver src/leer-participantes.mjs).
 *
 * Ese marcador de versión es lo que hace visible la reversión en la sesión 2:
 * al volver atrás, el número cambia a la vista de todos.
 *
 * Uso: node build.mjs
 */

import { mkdirSync, writeFileSync, cpSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ensamblar } from './src/leer-participantes.mjs';

const raiz = dirname(fileURLToPath(import.meta.url));
const version = (process.env.GITHUB_SHA || 'local').slice(0, 7);
const fecha = new Date().toISOString().slice(0, 16).replace('T', ' ');

if (existsSync('dist')) rmSync('dist', { recursive: true });
mkdirSync('dist', { recursive: true });

const { html, fragmentos } = ensamblar(raiz);

writeFileSync(
  'dist/index.html',
  html.replaceAll('VERSION_PLACEHOLDER', `${version} · ${fecha} UTC`),
);

// Copiar recursos estáticos si existen
for (const dir of ['img', 'assets']) {
  if (existsSync(dir)) cpSync(dir, `dist/${dir}`, { recursive: true });
}

console.log(`✓ dist/ construido — versión ${version}, ${fragmentos.length} participantes`);
