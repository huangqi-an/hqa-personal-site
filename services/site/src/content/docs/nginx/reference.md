---
title: 'Nginx 配置参考'
description: '常用指令的写法与默认值：listen、location、proxy_pass、请求头、超时、gzip、日志与 upstream。'
publishDate: 2026-10-22
order: 2
---

## listen

指定监听地址与端口。

```nginx
server {
    listen 80;                  # 所有网卡
    listen 127.0.0.1:8080;      # 只监听回环
    listen 443 ssl;             # 连接口与协议一起写
    listen 80 default_server;   # 该端口上匹配不到域名时用它
}
```

- 同一端口上多个 server 时，只有一个能标 `default_server`。
- 只写端口等价于 `*:端口`，对所有网卡开放。

## server_name

按请求头里的 `Host` 选择 server。

```nginx
server_name example.com www.example.com;   # 多个域名
server_name *.example.com;                 # 通配，只能放开头或结尾
server_name _;                             # 占位，匹配不上时也落到这里
```

- 匹配顺序：精确域名 → 通配 → 正则 → `default_server`。
- 用 IP 直接访问时没有域名可匹配，会落到 `default_server` 或第一个 server。

## location

匹配规则与优先级见 [Nginx 基础](/docs/nginx/basics) 的「location 匹配顺序」，这里只列写法上的差异。

```nginx
location = /exact { ... }        # 精确
location ^~ /img/ { ... }        # 前缀，命中后跳过正则
location ~ \.php$ { ... }        # 正则，区分大小写
location ~* \.(png|jpg)$ { ... } # 正则，不区分大小写
location /api/ { ... }           # 普通前缀
```

- `location` 里可以再嵌套 `location`，嵌套只在前缀匹配内部生效。
- 正则里用 `( )` 捕获时，`$1`、`$2` 可在后续指令中引用。
- 正则按配置文件中的出现顺序尝试，先匹配到的生效，不是「最长优先」。

## proxy_pass

把请求转发给上游。

```nginx
location /api/ {
    proxy_pass http://app:3000/;
}

location /raw/ {
    proxy_pass http://app:3000;
}
```

| 写法 | 请求 `/api/users/1` | 上游收到 |
|---|---|---|
| `proxy_pass http://app:3000/;` | 带斜杠 | `/users/1`，前缀被替换 |
| `proxy_pass http://app:3000;` | 不带斜杠 | `/api/users/1`，原样透传 |

- 两种写法只差一个字符，行为完全不同，改完必须实际请求验证。
- 上游地址写容器名或服务名，交给 Docker 的 DNS 解析；写死 IP 会在容器重建后失效。
- `proxy_pass` 里带变量时，nginx 不再做静态解析，需要自己配 `resolver`。

## proxy_set_header

向上游传递请求头。

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

| 头 | 作用 |
|---|---|
| `Host` | 上游拿到的域名；不传时是上游地址，应用生成绝对链接会错 |
| `X-Real-IP` | 客户端 IP 的单一值 |
| `X-Forwarded-For` | 代理链上的 IP 列表，`$proxy_add_x_forwarded_for` 会自动追加 |
| `X-Forwarded-Proto` | 外部协议，应用判断是否 https 时用 |

- `proxy_set_header` 写在 `location` 里只对该 location 生效；写在 `server` 里对所有 location 生效。
- 上游若按 `Host` 做虚拟主机区分，这个头不能漏。

## 超时与请求体上限

```nginx
client_max_body_size 20m;
proxy_connect_timeout 5s;
proxy_read_timeout    60s;
proxy_send_timeout    60s;
```

- `client_max_body_size` 默认 **1m**，上传大文件时超限返回 `413`。
- `proxy_connect_timeout` 是与上游建立连接的时间上限。
- `proxy_read_timeout` 是等待上游响应的间隔上限，长轮询或慢接口要调大。
- 超时表现为 `504`，不是 `502`。

## gzip

```nginx
gzip on;
gzip_vary on;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types text/plain text/css application/javascript application/json application/xml image/svg+xml;
```

- 默认关闭。
- `text/html` 总会被压缩，不需要写进 `gzip_types`。
- `gzip_vary on` 让响应带上 `Vary: Accept-Encoding`，缓存服务器据此区分压缩版本。
- 已经压缩过的格式（图片、字体、zip）不要加进来，压不动还费 CPU。

## 日志

```nginx
access_log /var/log/nginx/access.log main;
error_log  /var/log/nginx/error.log warn;
```

- `access_log off;` 可对探针等高频请求关闭访问日志。
- 容器里把日志打到 stdout 更方便 `docker logs` 查看，官方镜像默认做了软链。
- `error_log` 的级别从低到高：`debug`、`info`、`notice`、`warn`、`error`、`crit`。

## upstream

把多个上游组成一组，做负载均衡与失效重试。

```nginx
upstream app {
    server app-1:3000;
    server app-2:3000;
    keepalive 16;
}

location / {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
}
```

- 默认轮询；`least_conn` 按连接数、`ip_hash` 按客户端 IP。
- 用 `keepalive` 复用连接时，必须配 `proxy_http_version 1.1` 并把 `Connection` 置空，否则长连接不生效。
- 单实例场景不必用 `upstream`，直接写地址更直观。

## return 与 rewrite

```nginx
location = /old { return 301 /new; }
location /v1/   { rewrite ^/v1/(.*)$ /v2/$1 permanent; }
```

| 形式 | 行为 |
|---|---|
| `return 200 "ok";` | 直接返回，不读磁盘 |
| `return 301 /new;` | 永久重定向 |
| `return 302 /new;` | 临时重定向 |
| `rewrite ... last` | 重写后重新匹配 location |
| `rewrite ... break` | 重写后在本 location 内继续 |
| `rewrite ... permanent` | 返回 301 |

需要保留原路径时用 `rewrite`，只是换个地址时 `return` 更直接。

## try_files

按顺序尝试路径，返回第一个存在的。

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

- `$uri` 是请求路径，`$uri/` 当作目录再试一次。
- 最后一项是兜底，可以是文件、状态码（`=404`）或命名 location（`@name`）。
- 单页应用回退到 `index.html` 就靠这一条。

## include

把配置拆成多个文件。

```nginx
include /etc/nginx/conf.d/*.conf;
include /etc/nginx/snippets/proxy-params.conf;
```

- 通配符按字典序加载，文件名加数字前缀（`10-`、`20-`）可控制顺序。
- 被 include 的内容直接展开到当前位置，上下文必须匹配：`server` 块不能 include 到一个 `location` 里。
