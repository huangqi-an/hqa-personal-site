# astro-pure — 本地副本

主题集成包 `astro-pure` 的 **vendored 副本**，对应上游仓库的 `packages/pure`。
不是文档示例，**参与构建**：

- Dockerfile 构建时执行 `rm -rf node_modules/astro-pure &&
  ln -s ../packages/pure node_modules/astro-pure`，把 npm 装的同名包替换成本目录
  （dev 容器用同一镜像，同样生效）。
- 改主题组件、集成逻辑、remark / rehype 插件，**改在这里**——
  改 `src/` 里的页面替换不了主题实现。
- `package.json` 的 `version` 跟随上游（当前 1.4.9），与根 `package.json` 里
  `astro-pure` 的依赖版本保持一致。

不走上游官方的 `BUN_LINK_PKG` 方案：`bun link` 在本镜像的构建顺序下会
**静默失败**（退出码 0、链接没建立），check 脚本只看退出码，于是构建继续用
npm 包、本地改动整体丢失。改为显式删目录再建软链，行为确定——背景见
`../Dockerfile` 中该步骤的注释。

## 结构

| 位置 | 内容 |
|---|---|
| `index.ts` | Astro 集成入口：注册 mdx / sitemap / UnoCSS / pagefind 与主题插件 |
| `components/basic` | `Aside`、`Tabs`、`Timeline`、`Spoiler` 等基础组件 |
| `components/advanced` | `GithubCard`、`LinkPreview`、`Quote`、`QRCode` 等高级组件 |
| `components/user` | `FriendList` 等站点级组件 |
| `components/pages` | 页面级组件 |
| `plugins/` | 主题自带的 remark / rehype / vite 插件 |
| `utils/` `libs/` `types/` `schemas/` | 工具、三方封装、类型与用户配置 schema |
| `scripts/` | `astro-pure` CLI（`bun run pure new` 建文章走这里） |

导出入口以 `package.json` 的 `exports` 为准。

## 升级

升级上游时，本目录要和 `src/` **一起** diff（上游 `packages/pure` ↔ 本目录）。
只搬 `src/` 不搬这里，会出现「页面结构和组件实现对不上」。
步骤见仓库根 README「升级上游主题」。

组件与配置的用法文档见上游：<https://astro-pure.js.org/docs>
（上游 README 里写给外部项目的安装 / Tailwind 接入说明对本副本不适用：
本地不走 npm 安装，样式方案固定为 UnoCSS。）

## 许可

Apache 2.0，作者 CWorld（上游 [cworld1/astro-theme-pure](https://github.com/cworld1/astro-theme-pure)）。
本目录保留原 `LICENSE`，改动仅在本仓库内分发。
