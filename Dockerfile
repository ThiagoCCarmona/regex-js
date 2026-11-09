# syntax=docker/dockerfile:1
# Regex em JS — imagem única: servidor Node (Fastify + WebSocket) servindo o site.

FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

# 1) Dependências de todo o workspace (camada reaproveitada enquanto os manifests não mudam)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY equipe_02_javascript/package.json equipe_02_javascript/
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile

# 2) Testes + build do site. Se algum teste falhar, a imagem não é gerada.
FROM deps AS build
ARG VITE_PUBLIC_URL=https://regex-js.tccodes.com.br
ENV VITE_PUBLIC_URL=$VITE_PUBLIC_URL
COPY . .
RUN pnpm --filter @regex-js/etapas test \
 && pnpm --filter server test \
 && pnpm --filter web test \
 && pnpm --filter web build

# 3) Só as dependências de produção do servidor
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY equipe_02_javascript/package.json equipe_02_javascript/
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --prod --filter server

# 4) Imagem final
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DIR_ESTATICO=/app/apps/web/dist
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/server/node_modules ./apps/server/node_modules
COPY --chown=node:node apps/server/package.json ./apps/server/
COPY --chown=node:node apps/server/src ./apps/server/src
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "apps/server/src/main.ts"]
