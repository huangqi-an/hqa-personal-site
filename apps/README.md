# apps/ — 纯静态站（备选）

**当前未启用。** 个人站要跑 API 和动态页，已按服务接入到 `services/site`（Astro SSR）。
本目录保留给不需要服务端逻辑的静态站——文档站、作品集快照这类东西。

与 `services/` 的分界只有一条：**有没有需要一直跑的进程**。纯静态进这里；
需要服务端渲染、API 或数据库的，进 `services/`（见 `docs/架构设计.md` §6.2、§9.6）。

## 约定

```
apps/
└── <app-name>/
    ├── src/
    ├── package.json
    └── dist/          # 构建产物，不入库（.gitignore 已覆盖）
```

- 站与站之间不共享依赖，各自独立 `package.json` / `node_modules`
- 目录名即 URL 前缀：`docs/` 挂到 `/docs/`
- 构建配置里的 `base` 要写成挂载前缀，否则产物引用根路径资源，整站 404
- 新增挂载点必须重建 nginx，`nginx -s reload` 不会重新读 `volumes`

## 接入三步

1. 建 `apps/<名>/`，构建产物输出到 `apps/<名>/dist/`
2. `nginx/compose.yml` 的 `volumes` 加一行：`../apps/<名>/dist:/usr/share/nginx/html/<名>:ro`
3. `nginx/conf.d/default.conf` 加一段 `location`（见 §5.2），然后 `docker compose up -d nginx`

宿主机不装 Node，构建在一次性容器里做：

```bash
docker run --rm --memory=1g \
  -v "$PWD/apps/<名>:/app" -w /app \
  -e npm_config_registry=https://registry.npmmirror.com \
  node:22-alpine sh -c "npm ci && npm run build"
```

## 现有站点

无。启用后在下方登记：目录名、访问路径、构建命令。

| 目录 | 访问路径 | 说明 |
|---|---|---|
| — | — | — |
