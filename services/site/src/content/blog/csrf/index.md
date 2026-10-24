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

## 1. CSRF 怎么成立

三个条件同时满足才会发生：

1. 用户在当前站点处于**已登录状态**，凭证放在 cookie 里
2. 攻击者能让用户的浏览器向目标站点**发一个请求**
3. 浏览器发请求时**自动带上 cookie**

攻击者不需要看到响应，只要请求被执行就够了。转账、改密码、发帖，这类操作一旦被触发，结果已经发生。

**和 XSS 的边界：**

| | XSS | CSRF |
| :--- | :--- | :--- |
| 代码在哪执行 | 目标站点自己的页面 | 攻击者的站点 |
| 能否读响应 | 能 | 不能（同源策略挡着） |
| 利用的是 | 站点的输出没转义 | 浏览器自动带 cookie |
| 防御 | 输出编码、CSP | SameSite、CSRF Token、Origin 校验 |

一句话区分：**XSS 是「在你家执行我的代码」，CSRF 是「借你的手发一个请求」。**

## 2. 第一层：把 GET 换成 POST

很多接口原来是 `GET /transfer?to=x&amount=100`，攻击者一个 `<img>` 就能触发。改成 POST 之后，`<img>` 不行了，但表单可以：

```html
<form action="https://bank.example/transfer" method="POST">
  <input name="to" value="attacker">
  <input name="amount" value="100">
</form>
<script>document.forms[0].submit()</script>
```

在浏览器里实测，从 `http://127.0.0.1` 的页面提交到 `http://127.0.0.1:8080`，服务端确实收到了：

```
POST /transfer ct=application/x-www-form-urlencoded origin=http://127.0.0.1 body=amount=100
```

注意 `origin` 头是自动带上的，服务端能看到请求来自别的站点——这是后面防御的抓手。

**所以 POST 只是抬高门槛，不是防御。** 它挡住的是 `<img>` 和 `<a>` 这种最省事的写法。

## 3. 第二层：同源策略与 CORS 挡得住吗

**同源策略限制的是「读取」，不是「发送」。** 跨源的写请求照样会到达服务器，只是攻击者的页面读不到响应内容。

CORS 进一步限制了「什么样的请求能带自定义头、能读响应」，但有一类请求不受约束——**简单请求**：方法只能是 GET/HEAD/POST，头部只能是少数几个安全头，`Content-Type` 只能是 `application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain`。

三类请求实测结果：

| 方式 | 服务端是否收到 | 客户端结果 |
| :--- | :--- | :--- |
| 表单 POST | 收到 | 正常提交 |
| `fetch` + `application/json` | **没收到** | `Failed to fetch`，预检被拒 |
| `fetch` + `text/plain` | **收到** | `Failed to fetch`，响应被拒 |

服务端日志：

```
POST /transfer ct=application/x-www-form-urlencoded origin=http://127.0.0.1 body=amount=100
OPTIONS /api/json ct=None origin=http://127.0.0.1 body=
POST /api/text ct=text/plain origin=http://127.0.0.1 body=amount=100
```

第二行说明 JSON 请求先发了 `OPTIONS` 预检，服务端没返回 CORS 头，预检失败，真正的 POST 根本没发出去。第三行说明 `text/plain` 不触发预检，请求直接到了服务端、业务逻辑已经执行，只是响应被浏览器拦下——而 CSRF 本来就不需要响应。

**结论：要求 `application/json` 能挡住大部分跨站请求，但它不是防御。** 服务端如果对 `Content-Type` 不校验，攻击者用 `text/plain` 就能绕过去。

## 4. 第三层：SameSite

给 cookie 加上 `SameSite`，浏览器在跨站请求时就不带了。这是目前最省事的一层。

| 值 | 行为 |
| :--- | :--- |
| `Strict` | 任何跨站请求都不带 cookie |
| `Lax` | 跨站的**顶层导航**且方法是 GET 时带，其他不带 |
| `None` | 都带，必须同时加 `Secure` |

```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax
```

Chrome 80 之后 `SameSite` 不写时的默认值就是 `Lax`，所以「从别的站点点链接过来」仍然带着登录态（否则每个外链都要重新登录），但跨站的 POST 表单不会带 cookie。

**`Lax` 挡不住的情况：**

- 跨站的 GET 请求会带 cookie。如果某个写操作是 GET，`SameSite=Lax` 救不了
- 同站但不同子域（`a.example.com` 与 `b.example.com`）算 same-site，跨子域的请求仍然带 cookie
- 老浏览器不认这个属性，会当成没写

`Strict` 更安全，代价是从外部链接进来时用户看起来像没登录。很多站点只在敏感操作上要求重新验证，而不是全站 `Strict`。

## 5. 第四层：CSRF Token

原理很简单：**服务端生成一个随机值，绑定当前会话，要求每个写请求带上，服务端校验。** 攻击者拿不到这个值——它只存在于页面里，跨站读不到。

```html
<form method="POST" action="/transfer">
  <input type="hidden" name="csrf_token" value="a8f3...">
  ...
</form>
```

```js
// 服务端校验
if (req.body.csrf_token !== req.session.csrfToken) {
  return res.status(403).end()
}
```

**为什么有效：**

- 攻击者的页面读不到目标站的 HTML，拿不到 token
- token 绑定 session，换个用户就对不上
- token 不能猜，长度足够即可

**实现要点：**

| 要点 | 原因 |
| :--- | :--- |
| 不要放在 URL 里 | 会进日志、Referer、浏览器历史 |
| 绑定会话 | 否则攻击者可以拿自己的 token 用 |
| 登录后重新生成 | 防会话固定 |
| 校验失败返回 403 | 不要静默忽略 |

**双重提交 Cookie** 是另一种实现，适合无状态服务：token 同时写进 cookie 和请求体/头，服务端只比较两者是否一致，不用存 session。

```js
// 前端从 cookie 读出来，放进请求头
const token = document.cookie.match(/csrf_token=([^;]+)/)[1]
fetch('/api/transfer', { method: 'POST', headers: { 'X-CSRF-Token': token } })
```

它依赖「攻击者能发请求但读不到 cookie」这一点。子域可以写父域 cookie，所以有不受信任的子域时，这种方案会被削弱。

## 6. 第五层：Origin 与 Referer 校验

浏览器在跨源请求里会带 `Origin`，服务端可以直接比对：

```js
const origin = req.headers.origin
if (origin && !ALLOWED_ORIGINS.includes(origin)) {
  return res.status(403).end()
}
```

`Origin` 在表单 POST 里也会带（实测日志里就有），比 `Referer` 可靠。`Referer` 会被隐私设置、代理裁剪掉，只能作为补充：

```js
const referer = req.headers.referer || ''
if (referer && !referer.startsWith('https://example.com')) {
  return res.status(403).end()
}
```

注意 `origin` 缺失时不要直接放行——有些请求（同源 GET）本来就不带。**只在写操作上强制要求 Origin 存在且在白名单内。**

## 7. 第六层：强制自定义请求头

如果服务端要求每个写请求都带 `X-Requested-With: XMLHttpRequest` 或 `X-CSRF-Token`，跨站请求就必须走预检。而预检需要服务端明确放行，攻击者的站点过不了这一关。

```js
// 服务端中间件
if (req.method !== 'GET' && !req.headers['x-requested-with']) {
  return res.status(403).end()
}
```

这层防御的前提是**服务端真的强制**，而不是「前端加了所以安全」。前端加头只是让请求变成复杂请求，服务端不校验等于没加。

## 8. 组合与清单

| 场景 | 建议 |
| :--- | :--- |
| 传统表单站点 | `SameSite=Lax` + CSRF Token（hidden input） |
| SPA + Cookie 会话 | `SameSite=Lax` + Token（放请求头）+ Origin 校验 |
| 纯 Token 认证（Authorization 头） | 天然免疫 CSRF，浏览器不会自动带 |
| 开放 API | 不用 cookie，用签名或 API Key |
| 关键操作 | 再加一次密码或验证码 |

**检查清单：**

- 所有写操作不用 GET
- Cookie 带 `SameSite`、`HttpOnly`、`Secure`
- 写接口校验 CSRF Token 或 Origin
- 服务端校验 `Content-Type`，拒绝非预期的类型
- 关键操作二次确认
- 前端不从 URL 读取 token

## 9. 常见误区

**「用了 POST 就安全了。」** 表单可以跨站 POST，实测请求会到达服务器。POST 只是让 `<img>` 触发不了。

**「HTTPS 能防 CSRF。」** 无关。HTTPS 防的是链路上被窃听和篡改，CSRF 的请求是浏览器自己发出的合法请求。

**「有 CORS 就安全。」** CORS 管的是「谁能读响应」，不阻止请求发出。`text/plain` 这类简单请求会直接到达服务端并执行。

**「SameSite 是万能药。」** 跨站 GET 仍带 cookie，同站不同子域也算同站，老浏览器不支持。

**「Token 放在 URL 里也行。」** URL 会进访问日志、Referer、历史记录，等于把 token 泄露出去。

**「`HttpOnly` 能防 CSRF。」** 它只让脚本读不到 cookie，浏览器发请求时照带不误。`HttpOnly` 防的是 XSS 偷 cookie，不是 CSRF。
