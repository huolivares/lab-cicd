# Laboratorio de integración y despliegue continuo

Capacitación para - Houston Lab SpA

Este repositorio es a la vez el material de la capacitación y el terreno de práctica.
La presentación que se proyecta en las sesiones vive acá y se publica sola con el
pipeline. No hay nadie subiendo archivos a un servidor.

**Presentación publicada:** _(completar con la URL de GitHub Pages)_

---

## Cómo funciona

```
  rama  →  pull request  →  verificar  →  vista previa  →  fusionar  →  publicar
                               │              │
                               │              └─ URL temporal, comentada en el PR
                               └─ si falla, la fusión queda bloqueada
```

| Etapa | Qué hace | Cuándo corre |
|---|---|---|
| **Construir** | `build.mjs` genera `dist/` e inyecta el hash del commit en la esquina de la pantalla | en cada cambio |
| **Verificar** | `test/validar.mjs` revisa las slides. Si algo no cumple, termina con error | en cada pull request y push a `main` |
| **Vista previa** | publica el cambio en una URL temporal y la comenta en el PR | solo en pull requests |
| **Publicar** | Firebase Hosting toma `dist/` y lo publica en el sitio real | solo al fusionar en `main` |

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

## Configuración, una sola vez

**Firebase**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting:github
```

Eso crea la cuenta de servicio y guarda el secret `FIREBASE_SERVICE_ACCOUNT` en el
repositorio. Si ofrece sobrescribir el workflow, **decir que no**: el de este repo ya
está escrito. Después, poner el ID del proyecto en `.firebaserc` y en la variable
`FIREBASE_PROJECT` de `.github/workflows/deploy.yml`.

**Protección de rama** — `Settings → Branches → Add rule → main`

- Require a pull request before merging
- Require status checks to pass → `Verificar`

Sin esto el pipeline avisa, pero no impide fusionar. Activarlo recién cuando el
contenido esté listo: mientras se escribe, obliga a hacer un PR por cada cambio.

**Participantes** — `Settings → Collaborators`, permiso **Write**. Sin eso no pueden
crear ramas. Las vistas previas no funcionan en PRs desde un *fork*, porque los forks
no tienen acceso a los secrets: los participantes trabajan como colaboradores del
repositorio, no desde forks.

## Alcance

El repositorio queda con el equipo como espacio de práctica y plantilla de referencia.

---

Houston Lab SpA · 77.445.771-2
