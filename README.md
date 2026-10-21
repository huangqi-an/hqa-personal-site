# HQA Personal Site

个人站。前端基于 [astro-theme-pure](https://github.com/cworld1/astro-theme-pure) 改造为 **Astro SSR**，
页面与 API 跑在同一个 Node 进程里；整体运行在单机 Docker Compose 架构上：nginx 统一入口，
PostgreSQL / Redis 只在内部网络可达。

目标环境是一台 2 核 2G 的轻量服务器，所以**资源上限、网络分域、服务可插拔**是硬约束。
为什么这么定、踩过哪些坑，都在 [`docs/架构设计.md`](docs/架构设计.md)。

## 快速开始

前提：Docker 与 **Compose v2.20+**（用到了 `include`）。

```bash
# 1. 创建两个外部网络（首次部署必跑，幂等）
./scripts/init-networks.sh

# 2. 数据层密码（.env 不入库，仓库里只有 .env.example）
cp services/postgres/.env.example services/postgres/.env
# 把 change-me 换成随机值，生成方式见 docs/架构设计.md §9.7
chmod 600 services/postgres/.env

# 3. 构建并启动
docker compose build site
docker compose up -d site nginx

# 4. 验证
curl -I http://localhost/            # 200
curl http://localhost/healthz        # ok —— 这是入口层自己的探针
docker compose ps                    # site 应为 healthy
```

> 不带服务名执行 `docker compose up -d` 会连 postgres / redis 一起拉起来。只要站点时显式写服务名。

## 目录

```
compose.yml              总入口：只写 include，不含服务定义
nginx/                   入口层：:80 路由，/ 反代到 site:4321
services/
  site/                  个人站：Astro SSR（页面 + API），自带 Dockerfile
    templates/post.md    新文章模板
  postgres/              PostgreSQL 17（仅 db-net）
  redis/                 Redis 7（仅 db-net）
  hello-api/             参考样板，未编入编排、不启动
  _template/             新服务脚手架（不是可运行服务）
apps/                    纯静态站备选路径（当前未使用）
data/                    持久化数据（已 gitignore，属主是容器内 uid，清理需 sudo）
scripts/                 网络初始化、服务脚手架、新建文章
docs/                    架构设计文档
```

## 服务

| 服务 | 对外入口 | 内存上限 | 说明 |
|---|---|---|---|
| nginx | `:80` | 128m | 唯一对外入口 |
| site | `/`（反代） | 256m | Astro SSR，页面与 API 同进程，实测空闲约 62MiB |
| postgres | 仅 `db-net` | 512m | 5432，不映射宿主机 |
| redis | 仅 `db-net` | 128m | 6379，不映射宿主机 |

`hello-api` 保留作参考样板，不占内存预算。

## 日常操作

```bash
docker compose ps
docker compose logs -f site
docker compose up -d --build site     # 改代码或内容后重建

# 只改了 nginx 路由时，热加载就够
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

改 `services/site` 里的任何东西（页面、内容、配置）都要**重建**，reload nginx 不会让构建产物变化。

## 写内容、加页面、加 API

内容放在 `services/site/src/content/`。新建一篇文章：

```bash
./scripts/new-post.sh hello-world "你好，世界"
```

脚本会按 `services/site/templates/post.md` 生成 `src/content/blog/hello-world/index.md`，
自动填标题和日期。**新文章默认 `draft: true`**，不会出现在列表、标签页和搜索索引里；
写完把 `draft` 改成 `false` 再重建即可。

`title` 上限 60 字、`description` 上限 160 字，超了会被 schema 拒绝、构建直接失败。

页面和 API 都在 `services/site/src/pages/` 下，区别只在**渲染方式**：

```ts
// 纯静态内容：构建期生成 HTML，运行时零开销
export const prerender = true

// 需要运行时：读库、处理表单、按请求渲染
export const prerender = false
```

`output: 'server'` 下**不写就是动态的**。主题里博客列表、文章页、标签页已经写死
`prerender = true`，新加的页面要自己明确选边，否则每个请求都会跑一遍渲染。

一个 API 路由长这样：

```ts
// src/pages/api/contact.ts
import type { APIRoute } from 'astro'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()
  // 校验输入、落库……
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
```

## 新增一个后端服务

```bash
./scripts/new-service.sh my-service
```

然后四件事：根 `compose.yml` 的 `include` 加一行 → `nginx/conf.d/default.conf` 加一段
`location` → 端口登记到 `docs/架构设计.md` §8 → `docker compose up -d --build`。

**加了 `location` 就必须有对应容器**。nginx 启动时解析所有 upstream 的容器名，
缺一个就 `host not found in upstream` 直接退出并反复重启。

## 升级上游主题

`services/site` 是 vendored 的上游模板（已删掉它自己的 `.git`），升级时**对比着搬**，不要整目录覆盖：

```bash
git clone --depth 1 https://github.com/cworld1/astro-theme-pure.git /tmp/pure-new
diff -ru services/site/src /tmp/pure-new/src | less
```

拉取时把上游 commit 记下来，便于回溯：`git ls-remote https://github.com/cworld1/astro-theme-pure.git main`。

**注意 `packages/pure` 现在参与构建。** Dockerfile 把 `node_modules/astro-pure` 指向了这个本地包，
所以我们对组件的改动是直接改在这里的。升级时要**连 `packages/pure` 一起对比**：

```bash
diff -ru services/site/packages/pure /tmp/pure-new/packages/pure | less
```

只搬 `src` 不搬包，会出现"页面结构和组件实现对不上"的情况。

## 四条约定

1. **一个服务一个目录**，总入口只做 include 聚合，接入与移除不牵连其他服务。
2. **服务名 = 容器名 = 内部域名**，反代直接写容器名，不依赖 IP。
3. **统一在根目录启停**。各服务固定了 `container_name`，在子目录另起项目会撞名。
4. **数据组件不映射端口**，只在 `db-net` 内可达；入口层只接 `web-net`。

## 已知坑

完整清单见 `docs/架构设计.md` §9.5，最常撞的五个：

- **`@astrojs/node` 大版本要和 `astro` 对齐**。装错时构建全绿、启动才报
  `app.getLogger is not a function`；当前组合是 `astro@6.4.8` + `@astrojs/node@^10.1.4`。
- **正文里的远程图片会在构建期下载**（推算宽高并优化），第三方 CDN 一抖，构建就随机失败。
  图片放 `src/assets/` 或 `public/` 更稳。
- **`env_file` 指向不存在的文件会让整份编排解析失败**，`environment` 才有默认值兜底。
- **`nginx -s reload` 不会重新读 `volumes`**，改挂载必须重建容器。
- **301 会把 POST 变成 GET**。补尾斜杠只适用于纯读路由，写接口不能靠重定向"纠正"。
