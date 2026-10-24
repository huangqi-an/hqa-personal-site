# HQA 组件库

个人站的组件库：**Web Components / Vue 3 / React 三套实现**，各配一个 Storybook，
构建为纯静态产物，由 nginx 只读挂载到站内 `/components/`（`apps/` 静态站路径，
见根目录 `docs/架构设计.md` §5.2）。运行时零容器内存。

```
apps/components/
├── pnpm-workspace.yaml     # 三框架三包；pnpm 10+ 的 allowBuilds 也在这里
├── shared/tokens.css       # 共享设计变量（CSS 自定义属性，三套同一视觉）
├── landing/index.html      # /components/ 落地页（build 时拷入 dist）
├── web/                    # 零依赖 vanilla TS + Shadow DOM（同 dafeiyu 路线）
├── vue/                    # Vue 3：Composition API + defineModel
├── react/                  # React：函数组件 + 受控模式
└── dist/                   # 构建产物（不入库），nginx 挂载这个目录
    ├── index.html + tokens.css
    ├── web/  ├── vue/  └── react/
```

三套组件 API 等价：`Button`（variant/size/disabled）、`Card`（title + 插槽）、
`Switch`（checked/disabled/label，web 版派发 `change` 事件，Vue 版 v-model，React 版受控）、
`Dialog`（遮罩弹窗，`closeOnOverlay` 控制点遮罩是否关闭）、
`Tabs`（受控/非受控，方向键 / Home / End 键盘漫游）、
`Tooltip`（placement 四方向）、
`Toast`（命令式 `toast(message, opts)` / `dismiss(id)`，页面挂一个 host 组件即可）。
弹层类共用 `tokens.css` 的 z-index 层级（modal 1000 < toast 1100 < tooltip 1200）。

## 为什么是三个包

Storybook 一个实例只能挂一个框架渲染器，三框架就是三个实例、三份构建——
这是官方推荐的多框架组织方式，不是妥协。视觉靠 `shared/tokens.css` 收敛：
全部用 CSS 自定义属性（`--hqa-*`），它能穿透 Shadow DOM，所以 Web Components
的 shadow root 和 Vue/React 组件引用同一份变量，同一套主题（含暗色模式，跟随系统）。

## 日常操作

```bash
# 开发（宿主机直跑，与 Docker 无关）
pnpm dev:web      # http://localhost:6008
pnpm dev:vue      # http://localhost:6006
pnpm dev:react    # http://localhost:6007

# 发布：构建产物原地更新，nginx 挂载即时可见——不用动任何容器
pnpm build

# 加组件：在对应包 src/components/ 写组件 + 同目录 *.stories.ts(x)
```

依赖安装走 npmmirror（`.npmrc`），需要官方源时 `pnpm install --registry=https://registry.npmjs.org`。

## 部署要点（与架构文档的对应）

- **先构建、再动 nginx**：挂载的 `dist/` 不存在时，Docker 会自动建一个
  root 属主的空目录，nginx 静默 404（§5.2 坑 1）
- **子路径 base**：三个包的 `.storybook/main.ts` 里 `viteFinal` 设了
  `config.base = '/components/<名>/'`，漏了整站 404（§5.2 坑 2）
- **SB10 的 vue3-vite 不自带 `@vitejs/plugin-vue`**：要自己装并在
  `viteFinal` 里挂进 plugins，否则 `.vue` 文件按普通脚本解析直接 PARSE_ERROR
- **pnpm 会拦依赖的构建脚本**：esbuild 在 `pnpm-workspace.yaml` 的
  `allowBuilds` 里放行，否则 storybook 触发的 `pnpm install` 校验失败
- **构建内存**：三个 Vite 构建峰值几百 MB。若在 2C2G 服务器本机构建且吃紧，
  沿用 site 构建同款纪律：先 `docker compose stop postgres redis` 腾内存

## 后续演进

- npm 发布：`web/` 零依赖可发布（对齐 `@huangqi_an/hqa-utils` 的模式）；
  vue/react 各自 peer 声明框架后可发布
- Web Components 的自动文档：引入 `@custom-elements-manifest/analyzer`
  生成 custom-elements.json，Controls 从手写 args 升级为自动推断
- 指纹资源长缓存：产物文件名带 hash，可在 nginx 加 `expires 1y`（注意
  正则 location 不能写在 server 级，会抢走反代给 site 的 `/_astro/*` 请求）
