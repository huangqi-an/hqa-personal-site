---
title: '{{TITLE}}'
publishDate: '{{DATE}}'
description: '一句话摘要，出现在列表页和 SEO 描述里，不超过 160 字'
tags:
  - 随笔
language: '中文'
# draft 为 true 时不会出现在列表、标签页和搜索索引里；写完改 false 再构建
draft: true
---

正文从这里开始。

## 小标题

段落之间空一行。行内代码用 `反引号`，代码块用三个反引号并标注语言：

```ts
const answer = 42
```

图片放在本目录下，用相对路径引用，构建期会做优化并生成尺寸：

```md
![说明文字](./cover.png)
```

<!--
写作清单：
1. title ≤ 60 字，description ≤ 160 字（超出会被 schema 拒绝，构建直接失败）
2. 标签用小写，重复的会自动去重
3. 确认 draft 改成 false
4. 构建：docker compose up -d --build site
-->
