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
| **Construir** | `build.mjs` genera `dist/` e inyecta el hash del commit en la esquina de la pantalla — corre dentro de la imagen, en la primera etapa del `Dockerfile` | en cada cambio |
| **Verificar** | `test/validar.mjs` revisa las slides. Si algo no cumple, termina con error | en cada pull request y push a `main` |
| **Vista previa** | calcula una etiqueta a partir del contenido (no del commit), construye y sube la imagen a Artifact Registry si no existe ya, y despliega una revisión de Cloud Run sin tráfico con URL propia comentada en el PR | solo en pull requests |
| **Publicar** | calcula la misma etiqueta; si la vista previa ya construyó esa imagen, no la reconstruye — solo la despliega tal cual, byte a byte, con el 100% del tráfico | solo al fusionar en `main` |

El número abajo a la derecha de la presentación es **la versión publicada**.
Al revertir un cambio, ese número cambia a la vista de todos.

**Por qué la etiqueta de la imagen es un hash y no el commit:** el commit de fusión
que crea GitHub al aceptar un PR no es el mismo commit que ya construyó `vista-previa`.
Si `publicar` reconstruyera con ese SHA distinto, `docker build` podría traer una
versión más nueva de `node:20-alpine` o `nginx:alpine` que la usada en la vista previa
— lo que se probó dejaría de ser exactamente lo que se publica. Etiquetar por el hash
del contenido real (`Dockerfile` + `index.html` + `build.mjs` + `package.json`) hace
que, si nada de eso cambió entre la vista previa y la fusión, `publicar` reconozca que
la imagen ya existe y la reutilice en vez de reconstruir.

## Trabajar localmente

```bash
npm run verificar     # construye y valida
open dist/index.html  # o abrir index.html directo
```

No hay dependencias que instalar: reveal.js se carga desde CDN y la validación usa
Node a secas.

Para probar el artefacto real (la imagen que termina en Cloud Run), en vez del
`index.html` suelto:

```bash
docker compose up --build   # http://localhost:8080
```

El `Dockerfile` corre el mismo `build.mjs` en una etapa con Node, y copia el
resultado a una imagen final de nginx que no lleva ni Node ni el código fuente —
es exactamente lo que construye y publica `deploy.yml`.

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

**Google Cloud** — pendiente, hay que correr esto una vez con `gcloud` autenticado
como propietario del proyecto. Reemplazar `TU_PROYECTO_GCP` por el ID real del
proyecto (y actualizar `GCP_PROJECT`/`IMAGEN` en `deploy.yml` con el mismo valor).

```bash
PROYECTO=TU_PROYECTO_GCP
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

Con eso quedan dos secrets por cargar en `Settings → Secrets and variables →
Actions`:

- `GCP_WORKLOAD_IDENTITY_PROVIDER` — el nombre completo del proveedor que imprime
  el comando `workload-identity-pools providers describe`.
- `GCP_SERVICE_ACCOUNT` — el email de la cuenta de servicio (`$SA` arriba).

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
