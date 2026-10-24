# site — 个人站（Astro SSR）

基于 [astro-theme-pure](https://github.com/cworld1/astro-theme-pure) 改造的个人站：
**页面与 API 跑在同一个 Node 进程里**（Astro SSR + `@astrojs/node` standalone），
按普通业务服务接入编排，经 nginx 反代对外。
部署、内存预算、写作流程等仓库级内容见根 [`README.md`](../../README.md)
与 [`docs/架构设计.md`](../../docs/架构设计.md)。

上游：cworld1/astro-theme-pure
拉取时 main = `4ecd4762e1e750daf7a51978092d7cea8e14c0d6`（2026-10-20）

## 服务记录项

- **用途**：博客 + 文档站；页面、API 同进程
- **技术栈**：Astro 6（SSR）+ 主题 astro-pure 的本地副本（见「与上游的关系」）
- **访问方式**：`http://<host>/`（经 nginx 入口层）；本地开发走 `http://<机器IP>:4321`
- **依赖**：无（当前不连 postgres / redis）
- **数据目录**：无——内容就是源码，全在 `src/content/`，没有运行时持久化
- **内存上限**：256m（实测空闲约 62 MiB，预算说明见架构文档 §7）
- **内部端口**：4321（不映射宿主机）

## 与上游的关系：vendor，不是依赖

整个目录从上游模板 **vendor** 而来（已删掉它自己的 `.git`），不是 npm 依赖。
改动按落点分四处：

| 想改什么 | 改哪里 |
|---|---|
| 站点信息（标题、导航、页脚、评论、分享） | `src/site.config.ts` |
| 站点地址（影响 RSS / sitemap / OG 图） | `astro.config.ts` 的 `site` |
| 页面、布局、内容集合 schema | `src/` |
| 主题组件与集成逻辑 | `packages/pure/`（本地包，**参与构建**） |

`packages/pure` 参与构建：Dockerfile 会把 `node_modules/astro-pure`
软链到这个目录，npm 装的同名包被替换——改主题组件必须改在那里，只改 `src/` 不生效。

升级上游要**对比着搬**，`src/` 与 `packages/pure/` 都要 diff，
完整步骤见根 README「升级上游主题」。主题的组件用法、配置项文档仍以上游为准：
<https://astro-pure.js.org/docs>

## 目录速览

```
astro.config.ts        渲染方式（server）、适配器、字体、Markdown / shiki 配置
src/
  site.config.ts       站点信息：标题、导航、页脚、评论、分享、引用
  content.config.ts    blog / docs 两个内容集合的 schema
  content/blog/        博客文章，一篇一个目录（<slug>/index.md）
  content/docs/        文档中心（docker / nginx / guide 三组）
  pages/               路由：页面与 API，prerender 在每个文件里选边
  layouts/             页面骨架
  components/          站内组件（home / projects / about …）
  plugins/             本仓库的 rehype / shiki 定制
packages/pure/         主题集成包的本地副本，参与构建（见其 README）
templates/post.md      新文章模板，scripts/new-post.sh 使用
compose.yml            生产服务定义
compose.dev.yml        本地开发编排（dev / build / preview / new）
Dockerfile             三阶段构建
preset/                上游附带的图标与示例组件，不参与构建
```

## 本地开发（compose.dev.yml）

宿主机不装 Node / Bun，开发也在容器里做。四个 profile：

| profile | 作用 |
|---|---|
| `dev` | 挂载源码热更新（4321），写作期间最常用 |
| `build` | 只构建，并把 `dist/` 导出到宿主机 |
| `preview` | 构建成功后用 `astro preview` 预览生产产物 |
| `new` | 容器里跑 `astro-pure new` 生成文章 |

写作期间起 dev（`-u` 不能省，原因与故障排查见根 README「写作时用 dev 模式」）：

```bash
docker compose -f compose.dev.yml --profile dev run --rm --service-ports \
  -u "$(id -u):$(id -g)" dev
```

注意 4321 是 Vite 开发服务器，样式靠 JS 注入，与 80 端口的生产形态有观感差异；
写完 Ctrl-C，回仓库根目录 `docker compose up -d --build site` 做最终验证。
其余 profile 的命令见 `compose.dev.yml` 开头注释。

## 生产

```bash
# 仓库根目录执行
docker compose up -d --build site     # 改了本目录任何东西后的标准动作
./scripts/preview.sh                  # 同上，并等首页返回 200 再打印地址
```

镜像三阶段构建（bun 构建 → 只装生产依赖 → `node:22-slim` 运行、非 root），
`dist/client` 与 `dist/server` 两份产物都进镜像，细节见 `Dockerfile` 注释。
容器只挂 `web-net`、不映射端口，healthcheck 打自己的 `/healthz`。

## 网页宠物（dafeiyu）

全站常驻的「大肥鱼」宠物：右下角一只透明视频小女仆（鲸鱼尾），会待机、走动、
说台词，能点击互动、拎起来抛出去。实现是独立 npm 包
[`dafeiyu`](../../dafeiyu/README.md)（本仓库的 sibling 目录），**站点用构建产物消费**——
与未来 CDN 用户一行 `<script>` 的接入方式完全一致。

- 产物与素材在 `public/pet/`，由 dafeiyu 仓库的 `scripts/sync-to-site.sh` 同步，
  更新宠物行为 = 在 dafeiyu 改代码 → `npm run build` → 跑 sync 脚本 → 重建本站
- 挂载点是 `src/components/pet/SitePet.astro`（两行 `<script is:inline>` + 站点台词），
  由 `BaseLayout.astro` 全站引入；Shadow DOM 隔离，不与主题样式互相污染
- 素材（14 段透明视频）来自 [dsh-pet](https://github.com/PC2005-cloud/dsh-pet)（MIT），
  Safari 用同名 `.mov`（HEVC-alpha）兜底，还没就绪前 Safari 不显示宠物
- 移动端（<768px）默认隐藏；`prefers-reduced-motion` 时静止
- AI 已接：`endpoints` 指向本站 `/api/pet/whisper`、`/api/pet/chat`（`src/pages/api/pet/`），
  服务端调 DeepSeek，密钥经仓库根 `.env` → compose 注入 `DEEPSEEK_API_KEY`（见根 README 快速开始 2b）。
  碎碎念带时间背景（工作日/周末/时段），聊天 SSE 流式（`X-Accel-Buffering: no` 过 nginx 不用改配置）；
  per-IP 限流 + 全局日限封顶费用，未配 key 或调用失败自动降级本地台词池
- 双击宠物打开聊天面板（历史 5 轮存 localStorage），Enter 发送

## 写作速记

完整说明与示例见根 README「写内容、加页面、加 API」，三条最容易踩的：

- 新文章用根目录 `./scripts/new-post.sh <slug> "标题"` 生成，默认 `draft: true`
- `title` ≤ 60 字、`description` ≤ 160 字，超了被 schema 拒绝、构建直接失败
- `output: 'server'` 下新页面**不写 `prerender` 就是动态的**，每个请求都跑一遍渲染；
  主题的列表 / 文章 / 标签页已写死 `prerender = true`

## 许可

上游 Apache 2.0，作者 CWorld；本目录保留原 `LICENSE`。
