# ─────────────────────────────────────────────────────────────────────
# 个人站镜像（Astro SSR）
#
# 三个阶段：
#   build      装全量依赖并构建，产出 dist/client 与 dist/server
#   prod-deps  只装生产依赖，避免 eslint / prettier / astro check 进运行镜像
#   runtime    用 node:22-slim 跑 dist/server/entry.mjs
#
# 为什么构建用 bun、运行用 node：
#   主题仓库只提供 bun.lock（没有 package-lock.json），装依赖必须用 bun；
#   而 SSR 产物是标准的 Node ESM，用 node 跑最稳。两者不冲突——
#   bun 装出来的 node_modules 是标准目录结构，node 直接能读。
# ─────────────────────────────────────────────────────────────────────

# ── 构建 ──────────────────────────────────────────────────────────────
FROM oven/bun:debian AS build
WORKDIR /web

# fontconfig 是构建期生成 OG 图片需要的；只装在 build 阶段，不进运行镜像
RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig \
    && rm -rf /var/lib/apt/lists/*

# 先只拷依赖清单，让这层能被缓存：改业务代码时不必重装依赖
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ENV ASTRO_TELEMETRY_DISABLED=1
# 走完整构建：astro-pure check + astro check + astro build
RUN bun run build

# ── 生产依赖 ──────────────────────────────────────────────────────────
FROM oven/bun:debian AS prod-deps
WORKDIR /web
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ── 运行 ──────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

# 两层产物都要：client 是静态资源与预渲染 HTML，server 是 SSR 入口
COPY --from=prod-deps --chown=node:node /web/node_modules ./node_modules
COPY --from=build --chown=node:node /web/dist ./dist
COPY --from=build --chown=node:node /web/package.json ./package.json

# 容器内有执行入口，跑非 root 用户
USER node

EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
