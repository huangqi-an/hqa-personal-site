#!/usr/bin/env bash
#
# 从模板生成一篇新文章
#
# 用法：./scripts/new-post.sh <slug> "标题"
# 示例：./scripts/new-post.sh hello-world "你好，世界"
#
# 生成位置：services/site/src/content/blog/<slug>/index.md
# 新建的文章默认 draft: true，不会出现在列表和搜索里，写完改 false 再构建。
#
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
site_dir="$repo_root/services/site"
template="$site_dir/templates/post.md"

if [ $# -lt 2 ]; then
  echo "用法: $0 <slug> \"标题\"" >&2
  echo "示例: $0 hello-world \"你好，世界\"" >&2
  exit 1
fi

slug="$1"
title="$2"

# slug 会变成 URL 路径，限制字符集避免中文/空格带来的转义问题
case "$slug" in
  *[!a-z0-9-]*) echo "slug 只能用小写字母、数字和连字符：$slug" >&2; exit 1 ;;
  -*|*-)         echo "slug 不能以连字符开头或结尾：$slug" >&2; exit 1 ;;
esac

if [ ! -f "$template" ]; then
  echo "找不到模板：$template" >&2
  exit 1
fi

dest="$site_dir/src/content/blog/$slug/index.md"
if [ -e "$dest" ]; then
  echo "已经存在：$dest" >&2
  exit 1
fi

mkdir -p "$(dirname "$dest")"
today="$(date +%F)"

# 用 python 做替换而不是 sed：标题里出现 / & \ 等字符时 sed 会出错
python3 - "$template" "$dest" "$title" "$today" <<'PY'
import sys

template, dest, title, date = sys.argv[1:5]
text = open(template, encoding='utf-8').read()
text = text.replace('{{TITLE}}', title).replace('{{DATE}}', date)
open(dest, 'w', encoding='utf-8').write(text)
PY

echo "已创建：$dest"
echo
echo "下一步："
echo "  1. 编辑正文，确认标题与摘要"
echo "  2. 写完把 frontmatter 里的 draft 改成 false"
echo "  3. 重建：docker compose up -d --build site"
