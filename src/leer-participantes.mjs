/**
 * leer-participantes.mjs — Descubrir y ensamblar los fragmentos
 * =============================================================
 * Cada participante edita SU archivo en `participantes/` y nada más. El build
 * arma la presentación completa juntando esos fragmentos con la plantilla.
 *
 * El descubrimiento es POR DIRECTORIO, nunca una lista escrita a mano: si
 * hubiera un índice con los seis nombres, ese índice volvería a ser un archivo
 * que todos tocan y regresaría el conflicto de merge que esta estructura evita.
 * El orden lo fija el prefijo numérico del nombre de archivo (01-, 02-, …).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MARCADOR = '<!-- PARTICIPANTES -->';

/** Devuelve los fragmentos ordenados: [{ nombre, ruta, html }]. */
export function leerParticipantes(raiz) {
  const dir = join(raiz, 'participantes');
  return readdirSync(dir)
    .filter(n => n.endsWith('.html'))
    .sort()
    .map(nombre => ({
      nombre,
      ruta: `participantes/${nombre}`,
      html: readFileSync(join(dir, nombre), 'utf8').trim(),
    }));
}

/** Plantilla + fragmentos → HTML completo (sin resolver VERSION_PLACEHOLDER). */
export function ensamblar(raiz) {
  const plantilla = readFileSync(join(raiz, 'src', 'index.template.html'), 'utf8');
  if (!plantilla.includes(MARCADOR)) {
    throw new Error(`la plantilla no contiene el marcador ${MARCADOR}`);
  }
  const fragmentos = leerParticipantes(raiz);
  const bloque = fragmentos.map(f => f.html).join('\n\n');
  return { html: plantilla.replace(MARCADOR, bloque), fragmentos };
}
