---
title: '写作约定'
description: '新建文章的命令、frontmatter 字段含义，以及图片怎么放'
publishDate: 2026-10-21
order: 2
---

## 新建一篇文章

```bash
./scripts/new-post.sh hello-world "你好，世界"
```

会在 `src/content/blog/hello-world/` 下生成 `index.md`，标题和日期自动填好。
新文章默认 `draft: true`，不会出现在列表、标签页和搜索索引里。

写完把 `draft` 改成 `false`，然后重建：

```bash
docker compose up -d --build site
```

## Frontmatter 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | 是 | 最多 60 字，超了会构建失败 |
| `description` | 是 | 最多 160 字，用在列表页和 SEO 描述 |
| `publishDate` | 是 | `YYYY-MM-DD` |
| `updatedDate` | 否 | 有更新时补上 |
| `tags` | 否 | 数组，自动转小写去重 |
| `draft` | 否 | 默认 `false`，草稿设 `true` |
| `pin` | 否 | 置顶 |

## 图片

图片放在文章同目录，用相对路径引用，构建期会自动优化尺寸：

```md
![说明文字](./cover.png)
```

不要用外部图床的链接。构建时需要下载远程图来确定尺寸，对方站点抖一下，构建就会失败。

## 标题层级

正文从 `##` 开始，页面标题由 frontmatter 的 `title` 渲染成 `h1`。
用 `###` 会出现在右侧目录里。
