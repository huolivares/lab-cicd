# Laboratorio de integración y despliegue continuo

Capacitación · Houston Lab SpA

Este repositorio es a la vez el material de la capacitación y el terreno de práctica.
La presentación que se proyecta en las sesiones vive acá y se publica sola con el
pipeline. No hay nadie subiendo archivos a un servidor.

**Presentación publicada:** _(completar con la URL de GitHub Pages)_

---

## Cómo funciona

```
  rama  →  pull request  →  verificar  →  fusionar  →  publicar
                               │
                               └─ si falla, la fusión queda bloqueada
```

| Etapa | Qué hace | Cuándo corre |
|---|---|---|
| **Construir** | `build.mjs` genera `dist/` e inyecta el hash del commit en la esquina de la pantalla | en cada cambio |
| **Verificar** | `test/validar.mjs` revisa las slides. Si algo no cumple, termina con error | en cada pull request y push a `main` |
| **Publicar** | GitHub Pages toma `dist/` y lo publica | solo al fusionar en `main` |

El número abajo a la derecha de la presentación es **la versión publicada**.
Al revertir un cambio, ese número cambia a la vista de todos.

## Trabajar localmente

```bash
npm run verificar     # construye y valida
open dist/index.html  # o abrir index.html directo
```

No hay dependencias que instalar: reveal.js se carga desde CDN y la validación usa
Node a secas.

## Las reglas de validación

Están en `test/validar.mjs` y son **deliberadamente frágiles**:

1. Hay al menos una slide.
2. Cada slide tiene título — la portada `<h1>`, las demás `<h2>`.
3. No quedan marcas `TODO`, `FIXME` ni `XXX`.
4. Ninguna slide pasa de 700 caracteres de texto.
5. El marcador de versión sigue en su lugar.
6. Las etiquetas `<section>` están balanceadas.

Son frágiles a propósito: el ejercicio de **rechazo controlado** necesita que sea
fácil equivocarse. Ver al pipeline decir que no, en un entorno donde equivocarse no
tiene consecuencias, es el momento que mejor transmite el valor de automatizar.

## Configuración del repositorio

Una sola vez, para que el bloqueo sea real:

- **Settings → Pages → Source:** GitHub Actions
- **Settings → Branches → Add rule → `main`**
  - Require a pull request before merging
  - Require status checks to pass → `verificar`

Sin la segunda parte el pipeline avisa, pero no impide fusionar.

## Alcance

El repositorio queda con el equipo como espacio de práctica y plantilla de referencia.

---

Houston Lab SpA · 77.445.771-2
