# Dockerfile — el artefacto que se publica. Empaqueta el mismo build.mjs
# que antes subía Firebase Hosting, ahora como imagen que corre en Cloud Run.
#
# Dos etapas:
#   1) build   tiene Node y corre exactamente el mismo comando que el job
#              "Construir" de deploy.yml. GITHUB_SHA llega por --build-arg
#              desde el pipeline para que el marcador de versión de la
#              presentación muestre el commit publicado; en local queda
#              en "local" si no se pasa.
#   2) final   solo nginx sirviendo el resultado. No lleva Node, ni el
#              código fuente, ni node_modules: la imagen que corre en
#              prod nunca tiene con qué reconstruirse a sí misma.
#
# Uso local: docker compose up --build   (ver docker-compose.yml)

FROM node:20-alpine AS build
WORKDIR /app
ARG GITHUB_SHA=local
ENV GITHUB_SHA=$GITHUB_SHA
COPY package.json build.mjs ./
COPY src ./src
COPY participantes ./participantes
RUN node build.mjs

FROM nginx:alpine
# Sirve el resultado del build (dist/), nunca la plantilla ni los fragmentos.
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
