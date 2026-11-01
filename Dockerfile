# Nuxt 4 SPA (ssr:false) — требует Node 22+.
# Двухэтапная сборка: ставим зависимости и собираем, затем шлём только скомпилированный
# Nitro-сервер (.output) в тонкий runtime-образ.
#
# ВАЖНО: приложение — чистый SPA, поэтому публичный URL PocketBase запекается в клиентский
# бандл на этапе сборки (runtimeConfig.public.pocketbaseUrl). Он задаётся build-аргом
# NUXT_PUBLIC_POCKETBASE_URL и должен указывать на публичный адрес PocketBase (через cloudpub),
# т.к. браузер ходит в PB напрямую.

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NUXT_PUBLIC_POCKETBASE_URL=https://lustily-eloquent-piglet.cloudpub.ru
ENV NUXT_PUBLIC_POCKETBASE_URL=$NUXT_PUBLIC_POCKETBASE_URL

RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

COPY --from=build /app/.output ./.output

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
