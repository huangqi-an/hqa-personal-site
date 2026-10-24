---
title: 'CSRF'
publishDate: 2024-01-18
description: 'CSRF 利用的是浏览器会自动带上 cookie 这件事；防它不能靠同源策略，得靠 SameSite 与 Token。'
tags:
  - security
  - web
language: '中文'
draft: false
---

## 1. CSRF 利用的是自动携带的凭证

三个条件同时满足才会发生：

1. 用户在当前站点处于已登录状态，凭证放在 cookie 里
2. 攻击者能让用户的浏览器向目标站点发一个请求
3. 浏览器发请求时自动带上 cookie

攻击者全程不需要看到响应。转账、改密码、发帖，这类操作一旦被触发，结果已经发生。

**和 XSS 的边界：**

| | XSS | CSRF |
| :--- | :--- | :--- |
| 代码在哪执行 | 目标站点自己的页面 | 攻击者的站点 |
| 能否读响应 | 能 | 不能，同源策略挡着 |
| 利用的是 | 站点输出没转义 | 浏览器自动带 cookie |
| 防御 | 输出编码、CSP | SameSite、CSRF Token、Origin 校验 |

XSS 是在目标站点里执行攻击者的代码，CSRF 是借用户的手发一个请求。

## 2. 改 POST 只是抬高门槛

`GET /transfer?to=x&amount=100` 这种接口，攻击者一个 `<img>` 就能触发。换成 POST 之后 `<img>` 不行了，但表单可以：

```html
<form action="https://bank.example/transfer" method="POST">
  <input name="to" value="attacker">
  <input name="amount" value="100">
</form>
<script>document.forms[0].submit()</script>
```

从 `http://127.0.0.1` 的页面提交到 `http://127.0.0.1:8080`，服务端确实收到了：

```
POST /transfer ct=application/x-www-form-urlencoded origin=http://127.0.0.1 body=amount=100
```

注意 `origin` 头是浏览器自动加的，服务端能看到请求来自别的站点——这是后面几层防御的抓手。

POST 挡住的只是 `<img>`、`<a>` 这类最省事的触发方式，表单照样能跨站提交。HTTPS 也不在这条线上——它防的是链路被窃听和篡改，CSRF 发出去的是一个合法的、浏览器自己发起的请求。

## 3. 同源策略挡读不挡写

同源策略限制的是**读取**，不是**发送**。跨源的写请求照样到达服务器，只是攻击者的页面读不到响应。

CORS 进一步限制了哪些请求能带自定义头、能读响应，但有一类请求不受约束——简单请求：方法只能是 GET/HEAD/POST，头部限于少数安全头，`Content-Type` 只能是 `application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain`。

三类请求实测下来，结局完全不同：

| 方式 | 服务端是否收到 | 客户端结果 |
| :--- | :--- | :--- |
| 表单 POST | 收到 | 正常提交 |
| `fetch` + `application/json` | 没收到 | `Failed to fetch`，预检被拒 |
| `fetch` + `text/plain` | 收到 | `Failed to fetch`，响应被拒 |

服务端日志：

```
POST /transfer ct=application/x-www-form-urlencoded origin=http://127.0.0.1 body=amount=100
OPTIONS /api/json ct=None origin=http://127.0.0.1 body=
POST /api/text ct=text/plain origin=http://127.0.0.1 body=amount=100
```

第二行是 JSON 请求的预检，服务端没返回 CORS 头，预检失败，真正的 POST 没有发出。第三行是 `text/plain`，不触发预检，请求直接到达、业务逻辑已经执行，只是响应被浏览器拦下——而 CSRF 本来就不需要响应。

要求 `application/json` 能挡住大部分跨站请求，但它的作用是抬高门槛。服务端如果不校验 `Content-Type`，攻击者改用 `text/plain` 就能绕过去。

## 4. SameSite 限制跨站携带 Cookie

给 cookie 加上 `SameSite`，浏览器在跨站请求时就不带了。这是成本最低的一层。

| 值 | 行为 |
| :--- | :--- |
| `Strict` | 任何跨站请求都不带 cookie |
| `Lax` | 跨站的顶层导航且方法是 GET 时带，其他不带 |
| `None` | 都带，必须同时加 `Secure` |

```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax
```

Chrome 80 之后，不写 `SameSite` 时默认就是 `Lax`。从别的站点点链接过来仍然带着登录态，跨站的 POST 表单则不带 cookie。

`Lax` 覆盖不到三种情况：

- 跨站的 GET 请求会带 cookie。写操作用 GET，这层就失效了
- 同站但不同子域（`a.example.com` 与 `b.example.com`）算 same-site，跨子域请求仍然带 cookie
- 老浏览器不认这个属性，当成没写

`Strict` 更彻底，代价是从外部链接进来时用户看起来像没登录。多数站点在敏感操作上要求重新验证，而不是全站 `Strict`。

`HttpOnly` 不在这层防御里。它只让脚本读不到 cookie，浏览器发请求时照带不误，防的是 XSS 偷 cookie。

## 5. Token 绑定会话

服务端生成一个随机值，绑定当前会话；页面把它放进表单或请求头；服务端逐个校验。攻击者拿不到这个值——它只出现在目标站点的 HTML 里，跨站读不到。

```html
<form method="POST" action="/transfer">
  <input type="hidden" name="csrf_token" value="a8f3...">
  ...
</form>
```

```js
if (req.body.csrf_token !== req.session.csrfToken) {
  return res.status(403).end()
}
```

有效性来自三点：攻击者的页面读不到目标站的 HTML；token 绑在 session 上，换用户就对不上；token 长度足够，猜不出来。

实现时有四个坑：

| 要点 | 原因 |
| :--- | :--- |
| 不要放在 URL 里 | 会进日志、Referer、浏览器历史 |
| 绑定会话 | 否则攻击者可以拿自己的 token 用 |
| 登录后重新生成 | 防会话固定 |
| 校验失败返回 403 | 不要静默忽略 |

**双重提交 Cookie** 是无状态服务的做法：token 同时写进 cookie 和请求体/头，服务端只比较两者是否一致，不用存 session。

```js
const token = document.cookie.match(/csrf_token=([^;]+)/)[1]
fetch('/api/transfer', { method: 'POST', headers: { 'X-CSRF-Token': token } })
```

它依赖「攻击者能发请求但读不到 cookie」。子域可以写父域 cookie，存在不受信任的子域时，这个方案会被削弱。

## 6. Origin 比 Referer 可靠

浏览器在跨源请求里会带 `Origin`，服务端直接比对白名单：

```js
const origin = req.headers.origin
if (!ALLOWED_ORIGINS.includes(origin)) {
  return res.status(403).end()
}
```

表单 POST 也会带 `Origin`，上面实测日志里有。`Referer` 会被隐私设置、代理裁剪，只能作为补充：

```js
const referer = req.headers.referer || ''
if (referer && !referer.startsWith('https://example.com')) {
  return res.status(403).end()
}
```

`Origin` 缺失时不要直接放行。同源 GET 本来就不带这个头，所以这一层只在写操作上强制：没有 `Origin` 或不在白名单，一律拒绝。

## 7. 自定义请求头靠服务端强制

服务端要求每个写请求都带 `X-Requested-With` 或 `X-CSRF-Token`，跨站请求就必须走预检；预检要服务端明确放行，攻击者的站点过不了。

```js
if (req.method !== 'GET' && !req.headers['x-requested-with']) {
  return res.status(403).end()
}
```

前端加这个头，只是让请求从简单请求变成复杂请求。服务端不校验，等于没加。

## 8. 按场景组合

| 场景 | 建议 |
| :--- | :--- |
| 传统表单站点 | `SameSite=Lax` + CSRF Token（hidden input） |
| SPA + Cookie 会话 | `SameSite=Lax` + Token（请求头）+ Origin 校验 |
| Authorization 头认证 | 天然免疫，浏览器不会自动带 |
| 开放 API | 不用 cookie，用签名或 API Key |
| 关键操作 | 再加一次密码或验证码 |

检查清单：

- 写操作不用 GET
- Cookie 带 `SameSite`、`HttpOnly`、`Secure`
- 写接口校验 Token 或 Origin
- 服务端校验 `Content-Type`，拒绝非预期类型
- 关键操作二次确认
- token 不从 URL 读取

这几层不冲突：`SameSite` 挡掉大多数场景，Token 兜住老浏览器和跨站 GET，Origin 与自定义头提供额外的信号。单独任何一层都有覆盖不到的地方。
