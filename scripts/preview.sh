#!/usr/bin/env bash
#
# 重建站点，在 80 端口验证效果
#
# 用法：./scripts/preview.sh
#
# 构建 site 镜像 → 重启容器 → 等首页返回 200 → 打印访问地址。
#
# 为什么需要这一步：文档页和文章页是构建期预渲染成 HTML 的，
# 改完源码不重建，80 端口看到的还是旧内容。
# 只想边改边看用 dev 容器（4321），但那是 Vite 实时编译，
# 样式由 JS 注入、切换页面会有重排，观感不代表线上。
#
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

port="${NGINX_PORT:-80}"
if [ "$port" = "80" ]; then suffix=""; else suffix=":${port}"; fi
lan_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
start="$(date +%s)"

echo "构建 site 镜像…"
docker compose build site

echo
echo "重启容器…"
docker compose up -d site

echo
printf "等待服务就绪"
for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "http://localhost:${port}/" || true)"
  if [ "$code" = "200" ]; then
    echo
    echo
    echo "完成，用时 $(( $(date +%s) - start ))s"
    echo "  本机：http://localhost${suffix}/"
    [ -n "$lan_ip" ] && echo "  局域网：http://${lan_ip}${suffix}/"
    exit 0
  fi
  printf "."
  sleep 1
done

echo
echo "容器已启动，但 30 秒内首页没有返回 200" >&2
echo "查看日志：docker compose logs --tail=50 site" >&2
exit 1
