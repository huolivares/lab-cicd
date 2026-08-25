# Dockerfile — el mismo build.mjs, empaquetado como imagen en vez de subido
# a un hosting de estáticos.
#
# Dos etapas:
#   1) build   tiene Node y corre exactamente el mismo comando que el job
#              "Construir" de deploy.yml.
#   2) final   solo nginx sirviendo el resultado. No lleva Node, ni el
#              código fuente, ni node_modules: la imagen que corre en
#              prod nunca tiene con qué reconstruirse a sí misma.
#
# Uso local: docker compose up --build   (ver docker-compose.yml)

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json build.mjs index.html ./
RUN node build.mjs

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
