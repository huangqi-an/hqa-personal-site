---
title: 'Nginx 基础：配置结构与请求匹配'
description: '配置文件放在哪、一个请求按什么顺序找到 location，以及反向代理与静态文件的最小写法。'
publishDate: 2026-10-22
order: 1
---

## 配置文件在哪

主配置是 `/etc/nginx/nginx.conf`，它的 `http` 块里用 `include` 把站点配置引进来：

```nginx
http {
    include /etc/nginx/conf.d/*.conf;
}
```

所以日常只改 `conf.d/` 下的文件，不碰主配置。容器里路径相同，把宿主目录挂到 `/etc/nginx/conf.d` 即可。

改完的固定动作：

```bash
nginx -t          # 先检查语法，不通过就别 reload
nginx -s reload   # 平滑加载新配置，旧连接处理完后退出
```

## 一个请求怎么被处理

按顺序做三次选择：

1. **按端口找 server**：请求进到哪个 `listen`。
2. **按域名找 server**：`server_name` 匹配请求头里的 `Host`；都不匹配时用带 `default_server` 的那个。
3. **按路径找 location**：在选中的 server 里，按下面的规则匹配 `location`。

## server 块

```nginx
server {
    listen 80;
    server_name example.com;
    root /usr/share/nginx/html;
}
```

- `listen 80` 只写端口，监听所有网卡；`listen 127.0.0.1:80` 只监听回环。
- `server_name _` 是「匹配任何域名」的占位写法，用 IP 访问时也能落到这个 server。
- 一个 `listen` 上可以有多个 server，靠 `server_name` 区分。

## location 匹配顺序

| 修饰符 | 写法 | 含义 |
|---|---|---|
| `=` | `location = /exact` | 精确匹配，命中即停 |
| `^~` | `location ^~ /img/` | 前缀匹配，命中后**不再尝试正则** |
| `~` | `location ~ \.png$` | 正则，区分大小写 |
| `~*` | `location ~* \.png$` | 正则，不区分大小写 |
| 无 | `location /static/` | 普通前缀匹配 |

优先级从高到低：

```
=   →   ^~（最长前缀）  →  正则（按出现顺序，首个命中即停）  →  普通前缀（最长匹配）
```

实测三个容易记错的点：

| 请求 | 同时存在的规则 | 实际命中 |
|---|---|---|
| `/exact` | `= /exact` 与 `~ \.png$` | `= /exact` |
| `/img/a.png` | `^~ /img/` 与 `~ \.png$` | `^~ /img/`，**不试正则** |
| `/static/a.png` | `/static/` 与 `~ \.png$` | 正则，**正则优先于普通前缀** |

所以想让某个目录里的文件绕过正则（比如图片不做特殊处理），用 `^~`；只用普通前缀是拦不住的。

## 反向代理

```nginx
location / {
    proxy_pass http://app:3000;

    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

- `proxy_pass` 里写容器名或服务名，Docker 网络会解析成容器 IP，不要写死 IP。
- `Host $host` 把原始域名传给上游，应用生成绝对链接时依赖它。
- `X-Real-IP` 与 `X-Forwarded-For` 记录客户端地址；应用拿到的 `remote_addr` 会是 nginx 的地址。
- `X-Forwarded-Proto` 告诉应用外部用的是 http 还是 https。
- 上游是 HTTP/1.1 应用时加 `proxy_http_version 1.1`，否则默认 1.0，长连接与分块传输会有问题。

`proxy_pass` 末尾有没有斜杠，会改变路径：

```nginx
location /api/ { proxy_pass http://app:3000/; }   # /api/users/1 → 上游收到 /users/1
location /raw/ { proxy_pass http://app:3000; }    # /raw/users/1 → 上游收到 /raw/users/1
```

带斜杠时，匹配到的那段前缀会被替换掉；不带斜杠时原样透传。这条规则是 502 之外最容易踩的坑。

## 静态文件

```nginx
location /assets/ {
    root /usr/share/nginx/html;   # 实际文件在 /usr/share/nginx/html/assets/
    expires 30d;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

- `root` 拼接完整路径：`root` + 请求路径。
- `try_files` 按顺序尝试，最后一个参数是兜底（单页应用常回退到 `index.html`）。
- `root` 与 `alias` 的区别：`alias` 直接替换匹配到的前缀，不再拼接 location 路径。

## 探针与纯文本响应

```nginx
location = /healthz {
    access_log off;
    default_type text/plain;
    return 200 "ok\n";
}
```

`return` 不经过磁盘，开销最低；`access_log off` 避免探针把日志刷满。

## 再看一层

- 每个指令的完整写法与边界，见 [Nginx 配置参考](/docs/nginx/reference)。
- 出现 502、504 或改完不生效，见 [Nginx 排障](/docs/nginx/troubleshooting)。
