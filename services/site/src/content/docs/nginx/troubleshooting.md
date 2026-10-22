---
title: 'Nginx 排障'
description: '常见状态码的含义与定位顺序、host not found 的原因，以及改完配置不生效时的检查方法。'
publishDate: 2026-10-22
order: 3
---

## 先看两个地方

```bash
nginx -t                                  # 配置语法
docker logs --tail=50 nginx               # 错误日志在 stderr
```

错误日志里会写明时间、级别和原因，`502` 与 `504` 的区别在日志里一眼能看出来：

```
[error] 30#30: *1 connect() failed (111: Connection refused) while connecting to upstream
[error] 30#30: *2 upstream timed out (110: Connection timed out) while reading response header
```

前者是连不上，后者是连上了但等不到响应。

## 502 Bad Gateway

nginx 无法从上游拿到有效响应。按概率排：

1. **上游没起**：容器退出、还在启动、或端口写错。
2. **上游地址变了**：容器重建后 IP 变化，nginx 仍用启动时解析的旧地址。
3. **上游进程只监听回环**：应用绑 `127.0.0.1:3000`，容器之间访问不到，要绑 `0.0.0.0`。

定位：

```bash
docker compose ps                          # 上游在不在
docker compose exec nginx getent hosts app # 域名能否解析
docker compose exec nginx wget -qO- http://app:3000/healthz   # 容器内直连上游
docker compose exec nginx nginx -T | grep proxy_pass          # 看实际生效的地址
```

镜像里没有 `wget` 时，用运行时自带的工具发请求，例如 `node -e "fetch(...)"`。

确认是地址变了导致的，重载即可：

```bash
docker compose exec nginx nginx -s reload
```

## 504 Gateway Timeout

连接建立了，但上游在超时时间内没有返回。

- `proxy_read_timeout` 默认 60 秒，慢接口会先撞上这个限制。
- 上游确实卡住时，`504` 只是结果，原因要去看上游日志。
- 长轮询、导出大文件这类接口，需要单独放宽超时，别的 location 不受影响。

```nginx
location /export/ {
    proxy_read_timeout 300s;
}
```

## 413 Request Entity Too Large

上传超过 `client_max_body_size`，默认 **1m**。

```nginx
client_max_body_size 20m;
```

写在 `server` 块里对该站点全部生效；只放宽某个上传接口时写在对应 `location` 里。

## 404 Not Found

- `root` 拼接后文件不存在：`root /data` + 请求 `/a.png` → 找 `/data/a.png`。
- `alias` 用错：`location /static/ { alias /data/; }` 会把 `/static/a.png` 映射到 `/data/a.png`，末尾斜杠不能少。
- 单页应用缺 `try_files`：刷新子路由时找不到对应文件。

## 403 Forbidden

- 目录没有 `index` 文件且未开 `autoindex`。
- 文件权限或属主不对，nginx 的 worker 用户读不到。
- 请求路径命中了拒绝规则（如 `deny all`）。

## host not found in upstream

启动或重载时解析不到 upstream 域名，配置整体加载失败。

```
nginx: [emerg] host not found in upstream "app" in /etc/nginx/conf.d/default.conf:12
```

- 容器名写错，或该服务没有加入同一个网络。
- 服务被下线了，配置里的 `location` 还指向它。
- 上游还没启动：nginx 启动时需要能解析，先起上游再起 nginx，或用 `resolver` 做运行时解析。

这类错误会让 nginx 起不来或反复重启，`docker compose ps` 里表现为 `Restarting`。

## 改完配置没生效

按顺序检查：

1. **改的是不是生效中的文件**：`nginx -T` 会打印合并后的完整配置，搜关键字确认。
2. **是否 reload 过**：`up -d` 重建容器会加载新配置，`restart` 也会；但只改文件不 reload 不会生效。
3. **挂载是否覆盖了容器内文件**：宿主目录挂到 `/etc/nginx/conf.d` 时，镜像自带的 `default.conf` 可能仍在，两个 server 抢同一个端口。
4. **语法是否通过**：`nginx -t` 失败时 reload 不会生效，旧配置继续运行。

```bash
docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
```

## 查看实际生效的配置

```bash
docker compose exec nginx nginx -T | less
```

`-T` 会把 `include` 展开成一份完整配置，用来确认「你以为的配置」和「实际加载的配置」是否一致。

## 日志相关

- 访问日志默认在 `/var/log/nginx/access.log`，错误日志在 `error.log`；容器里通常软链到 stdout/stderr。
- 日志时间默认 UTC，与本地时间差几小时，换算后再对照请求时间。
- 探针类请求可以单独 `access_log off`，避免把有用的记录冲掉。
