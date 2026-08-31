# Laboratorio de integración y despliegue continuo

Capacitación para - Houston Lab SpA

Este repositorio es a la vez el material de la capacitación y el terreno de práctica.
La presentación que se proyecta en las sesiones vive acá y se publica sola con el
pipeline. No hay nadie subiendo archivos a un servidor.

**Presentación publicada:** URL de Cloud Run — se conoce recién después del primer
despliegue (`gcloud run services describe lab-cicd --region southamerica-west1
--format 'value(status.url)'`), o el dominio propio si se mapeó uno.

Para verla en local: `node build.mjs && open dist/index.html`, o con Docker:
`docker compose up --build` y abrir `http://localhost:8080`.

La presentación se **ensambla** en el build: la plantilla vive en
`src/index.template.html` y cada participante tiene su propio fragmento en
`participantes/` (`01-fanny.html`, `02-dylan.html`, …). `build.mjs` descubre esos
archivos por directorio, los ordena por nombre y los inserta en la plantilla. No
hay un `index.html` suelto ni una lista de nombres que todos tengan que tocar.

---

## Cómo funciona

```
  rama  →  pull request  →  verificar  →  fusionar  →  publicar
                               │
                               └─ si falla, la fusión queda bloqueada
```

| Etapa | Qué hace | Cuándo corre |
|---|---|---|
| **Construir** | `build.mjs` ensambla `src/index.template.html` con los fragmentos de `participantes/`, genera `dist/` e inyecta el hash del commit en la esquina de la pantalla — corre dentro de la imagen, en la primera etapa del `Dockerfile` | en cada cambio |
| **Verificar** | `test/validar.mjs` revisa las slides. Si algo no cumple, termina con error | en cada pull request y push a `main` |
| **Publicar** | construye la imagen, la etiqueta con el hash del commit, la sube a Artifact Registry y mueve el 100% del tráfico del servicio de Cloud Run a esa revisión | solo al fusionar en `main` |

El número abajo a la derecha de la presentación es **la versión publicada**.
Al revertir un cambio, ese número cambia a la vista de todos — el mismo hash de
commit identifica la versión en la pantalla, en la imagen de Docker y en el
historial de git: una sola idea de "qué versión es esta" en todo el pipeline.

No hay un job de vista previa desplegando una URL aparte por cada pull request:
la imagen se construye una única vez, al fusionar. Evita el problema de tener dos
`docker build` del mismo cambio en momentos distintos — uno en la vista previa, otro
al fusionar —, que podrían traer una versión más nueva de `node:20-alpine` o
`nginx:alpine` cada vez y terminar publicando algo ligeramente distinto de lo que
alguien alcanzó a revisar.

## Trabajar localmente

```bash
npm run verificar     # ensambla, construye y valida
open dist/index.html  # el resultado del build
```

No hay dependencias que instalar: reveal.js se carga desde CDN y la validación usa
Node a secas.

Para probar el artefacto real (la imagen que termina en Cloud Run), en vez de
abrir `dist/` directo:

```bash
docker compose up --build   # http://localhost:8080
```

El `Dockerfile` corre el mismo `build.mjs` en una etapa con Node, y copia el
resultado a una imagen final de nginx que no lleva ni Node ni el código fuente —
es exactamente lo que construye y publica `deploy.yml`.

## Las reglas de validación

Están en `test/validar.mjs` y son **deliberadamente frágiles**. Primero revisa
cada fragmento de `participantes/` por separado:

1. El directorio tiene al menos un fragmento.
2. Cada fragmento es una tarjeta `<div class="participante">…</div>`.
3. Cada fragmento tiene exactamente un `<h3>…</h3>` (el nombre).
4. Las etiquetas del fragmento están bien cerradas.

Son chequeos **estructurales**: no miran el texto, así que "completar acá" es
válido y `main` nace en verde. Si alguien borra el `</div>` o el `<h3>` de su
archivo, el log dice exactamente qué archivo y qué le falta.

Después revisa la presentación ya ensamblada:

5. Hay al menos una slide y cada una tiene título — la portada `<h1>`, las demás `<h2>`.
6. No quedan marcas `TODO`, `FIXME` ni `XXX`.
7. Ninguna slide pasa de 700 caracteres de texto ni de 7 viñetas.
8. El marcador de versión sigue en su lugar y las `<section>` están balanceadas.

Son frágiles a propósito: el ejercicio de **rechazo controlado** necesita que sea
fácil equivocarse. Ver al pipeline decir que no, en un entorno donde equivocarse no
tiene consecuencias, es el momento que mejor transmite el valor de automatizar.

## Configuración, una sola vez

**Google Cloud** — ya hecho sobre el proyecto `houston-lab-ecafd`
(región `southamerica-west1`). El bloque de abajo queda como referencia de qué
se creó; para rehacerlo en otro proyecto, reemplazar el valor de `PROYECTO` y
actualizar `GCP_PROJECT`/`IMAGEN` en `deploy.yml` con el mismo valor.

```bash
PROYECTO=houston-lab-ecafd
REGION=southamerica-west1

# Habilitar las APIs necesarias
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com --project "$PROYECTO"

# Repositorio de imágenes
gcloud artifacts repositories create lab-cicd --repository-format=docker \
  --location="$REGION" --project "$PROYECTO"

# Cuenta de servicio con el mínimo permiso: desplegar en Cloud Run y subir imágenes
gcloud iam service-accounts create lab-cicd-deploy --project "$PROYECTO"
SA="lab-cicd-deploy@$PROYECTO.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROYECTO" --member="serviceAccount:$SA" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding "$PROYECTO" --member="serviceAccount:$SA" \
  --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding "$PROYECTO" --member="serviceAccount:$SA" \
  --role="roles/iam.serviceAccountUser"

# Workload Identity Federation: GitHub Actions se autentica sin ninguna llave
gcloud iam workload-identity-pools create github --project "$PROYECTO" \
  --location=global
gcloud iam workload-identity-pools providers create-oidc github \
  --project "$PROYECTO" --location=global --workload-identity-pool=github \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='huolivares/lab-cicd'"
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROYECTO" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROYECTO/locations/global/workloadIdentityPools/github/attribute.repository/huolivares/lab-cicd"
```

Con eso quedan dos secrets en `Settings → Secrets and variables → Actions`
(ya cargados):

- `GCP_WORKLOAD_IDENTITY_PROVIDER` =
  `projects/130494636669/locations/global/workloadIdentityPools/github/providers/github`
- `GCP_SERVICE_ACCOUNT` = `lab-cicd-deploy@houston-lab-ecafd.iam.gserviceaccount.com`

**Protección de rama** — `Settings → Branches → Add rule → main`

- Require a pull request before merging
- Require status checks to pass → `Verificar`

Sin esto el pipeline avisa, pero no impide fusionar. Activarlo recién cuando el
contenido esté listo: mientras se escribe, obliga a hacer un PR por cada cambio.

**Participantes** — `Settings → Collaborators`, permiso **Write**. Sin eso no pueden
crear ramas.

## Alcance

El repositorio queda con el equipo como espacio de práctica y plantilla de referencia.

---

Houston Lab SpA · 77.445.771-2
