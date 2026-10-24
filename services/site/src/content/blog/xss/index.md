---
title: 'XSS'
publishDate: 2024-01-04
description: 'XSS 的本质是不可信的数据被浏览器当成了代码执行。'
tags:
  - security
  - web
language: '中文'
draft: false
---

## 1. XSS 是什么

一句话：**用户能控制的内容，被浏览器当成代码执行了。**

不是「输入了 `<script>` 就算 XSS」，而是这段内容最终被放进了 HTML 解析器、JS 引擎或 CSS 解析器，而它本该只作为数据显示。

按注入位置分三类：

| 类型 | 数据从哪来 | 什么时候触发 | 典型场景 |
| :--- | :--- | :--- | :--- |
| 存储型 | 存进数据库 | 别人打开页面时 | 评论、昵称、个人简介 |
| 反射型 | URL 参数 | 构造链接诱导点击，立即回显 | 搜索结果页、错误提示 |
| DOM 型 | 前端自己从 URL / storage 取 | 页面脚本把它写进 DOM | 前端路由、`innerHTML` 拼接 |

三者的共同点是最后一步：字符串进了危险的位置。区别只在数据怎么来的。

## 2. 三种类型的最小示例

**存储型**：评论内容原样存库、原样输出。

```html
<!-- 用户提交 -->
<img src=x onerror="fetch('/api/steal?c='+document.cookie)">

<!-- 服务端渲染时直接拼接 -->
<div class="comment">{!! $comment !!}</div>
```

浏览器解析这段 HTML，`img` 加载失败，`onerror` 里的 JS 就执行了。

**反射型**：搜索词直接回显。

```js
// /search?q=<img src=x onerror=...>
res.send(`<p>没有找到「${req.query.q}」的结果</p>`)
```

payload 不落库，靠一条链接骗人点。危害不比存储型小，因为链接可以伪装。

**DOM 型**：前端脚本从 URL 取值，写进 DOM。

```js
const keyword = new URLSearchParams(location.search).get('q')
document.getElementById('result').innerHTML = `没有找到「${keyword}」`
```

服务端完全没参与，日志里看不到 payload，传统的服务端过滤也拦不住。

## 3. 输出上下文决定转义方式

同一个字符串，放在不同位置，需要的处理完全不同：

| 位置 | 例子 | 处理方式 |
| :--- | :--- | :--- |
| HTML 文本 | `<p>这里</p>` | 转义 `& < > " '` |
| HTML 属性（带引号） | `<div title="这里">` | 转义 `" & <`，属性值必须加引号 |
| URL 参数 | `<a href="/s?q=这里">` | URL 编码，并校验协议 |
| JS 字符串 | `<script>var a = '这里'</script>` | 用 JSON 序列化，转义 `<` |
| CSS | `<div style="color:这里">` | 不要拼用户输入 |

**只转义 `<` 和 `>` 是不够的。** 属性里没加引号时，一个空格就能注入新属性：

```html
<div class="user" title=用户名>       <!-- 没加引号 -->
<div class="user" title=x onmouseover=alert(1)>   <!-- 输入 "x onmouseover=..." -->
```

同一个输入放进 `<script>` 里，又是另一套规则——HTML 实体在那里不生效，`&lt;` 不会变成 `<`。

## 4. HTML 文本上下文

最基本的一种，把五个字符换成实体：

| 字符 | 实体 |
| :--- | :--- |
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#39;` |

现代框架默认就做了这件事：

```jsx
// React：花括号里的内容会被转义
<div>{comment}</div>

// 需要渲染 HTML 时，唯一的出口是这个，名字本身就是警告
<div dangerouslySetInnerHTML={{ __html: comment }} />
```

```html
<!-- Vue：双大括号转义，v-html 不转义 -->
<p>{{ comment }}</p>
<p v-html="comment"></p>
```

模板引擎同理，看它用哪个定界符：

```ejs
<%= comment %>   <!-- 转义 -->
<%- comment %>   <!-- 不转义，危险 -->
```

**代码里搜这几个词就能找到风险点**：`dangerouslySetInnerHTML`、`v-html`、`innerHTML`、`<%-`、`th:utext`。

## 5. 属性与 URL 上下文

**属性值必须加引号。** 加了引号之后，只要转义 `"`，攻击者就无法跳出属性值。

**`href` 和 `src` 还多一层**：即使内容被正确转义，协议本身也可能是可执行的。

```html
<a href="javascript:alert(1)">点我</a>
```

这不需要任何 `<` 或 `>`，转义完全拦不住。处理方式是**白名单协议**：

```js
function safeHref(url) {
  try {
    const u = new URL(url, location.origin)
    return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? u.href : '#'
  } catch {
    return '#'
  }
}
```

同样的坑在 `src`、`formaction`、`data:`、`iframe srcdoc` 上都存在。**只允许 http/https/相对路径**，其他一律拒绝。

## 6. JS 与 CSS 上下文

**不要把用户输入拼进 `<script>`。** 需要传数据给前端时，用 `JSON.stringify` 并且转义 `<`：

```js
const json = JSON.stringify(data)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026')
```

```html
<script>window.__DATA__ = <%- json %></script>
```

不转义 `<` 的话，只要数据里出现 `</script>`，就能提前闭合标签，后面的内容变成新的 HTML。

更稳的做法是把数据放在 `<script type="application/json">` 里，前端读出来 `JSON.parse`：

```html
<script type="application/json" id="data"><%- json %></script>
```

即便如此，`</script>` 依然要转义——它由 HTML 解析器处理，跟 JSON 无关。

**CSS 上下文不要拼接用户输入。** `expression()` 在现代浏览器已经移除，但 `url()`、`@import` 仍可能被用来发请求或加载外部资源。颜色、字号这类值，用白名单或枚举映射。

## 7. 富文本：不能转义，只能过滤

评论要支持加粗、链接，就不能整体转义。这时候需要 **sanitize**：解析成 DOM，按白名单删掉危险标签和属性。

```js
import DOMPurify from 'dompurify'

const clean = DOMPurify.sanitize(dirtyHtml, {
  ALLOWED_TAGS: ['b', 'i', 'a', 'p', 'ul', 'li'],
  ALLOWED_ATTR: ['href', 'title']
})
```

三条原则：

1. **白名单，不是黑名单。** 黑名单永远漏，`<svg>`、`<math>`、`<iframe>` 的组合绕过方式层出不穷。
2. **服务端也要清洗。** 前端过滤只是为了体验，攻击者可以直接调接口。
3. **清洗后不要再拼接。** 清洗发生在字符串上，拼进 DOM 时又会重新解析。

## 8. CSP 与纵深防御

即使代码写对了，也需要一层兜底。**CSP（内容安全策略）** 是最有效的一层：

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;
```

| 指令 | 作用 |
| :--- | :--- |
| `default-src 'self'` | 默认只允许同源资源 |
| `script-src 'self'` | 脚本只允许同源，**不接受内联脚本** |
| `object-src 'none'` | 禁掉 `<object>`、`<embed>` |
| `base-uri 'self'` | 防止 `<base>` 被注入改掉相对路径 |
| `frame-ancestors 'none'` | 禁止被其他站点嵌套，顺带防点击劫持 |

**关键在 `script-src` 不给 `'unsafe-inline'`。** 一旦给了，内联的 XSS payload 照样能跑，CSP 等于没有。

需要内联脚本时用 nonce：

```html
<script nonce="r4nd0m">...</script>
```

```
Content-Security-Policy: script-src 'nonce-r4nd0m' 'strict-dynamic'
```

nonce 每次请求都要随机，不能复用。

**先上报告模式**，避免一刀切把站点打挂：

```
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

其他几层：

| 措施 | 防什么 | 不防什么 |
| :--- | :--- | :--- |
| `HttpOnly` Cookie | 脚本读不到会话 cookie | 不阻止 XSS 执行，攻击者仍可代用户发请求 |
| `X-Content-Type-Options: nosniff` | 浏览器猜 MIME 类型导致的执行 | 不防注入 |
| `Secure` Cookie | 明文链路被窃取 | 与 XSS 无关 |
| Trusted Types | 强制 `innerHTML` 等赋值走净化函数 | 兼容性有限，只在 Chromium 系生效 |

`HttpOnly` 常被误解成「防 XSS」。它只是让 cookie 偷不走，页面上的恶意脚本依然能调接口、读页面内容。

## 9. 检查清单

| 位置 | 做法 |
| :--- | :--- |
| 服务端渲染的 HTML | 模板默认转义，禁用不转义的定界符 |
| 前端框架 | 不用 `dangerouslySetInnerHTML` / `v-html`，必须用时先 sanitize |
| 富文本 | DOMPurify 白名单，服务端再清洗一次 |
| URL 属性 | 协议白名单，只放行 http/https/mailto |
| 属性值 | 一律加引号并转义 |
| 内联 JSON | 转义 `<` `>` `&`，或用 `application/json` 块 |
| 响应头 | CSP 不含 `'unsafe-inline'`，`object-src 'none'` |
| Cookie | `HttpOnly` + `Secure` + `SameSite` |
| 代码审查 | 搜 `innerHTML`、`document.write`、`eval`、`insertAdjacentHTML` |

`innerHTML` 有一个反直觉的点：**赋给它的 `<script>` 不会执行，但 `onerror`、`onload` 这类事件属性会执行。** 在浏览器里实测过：

```js
div.innerHTML = '<img src=x onerror="window.__x=1">'   // 会执行
div.innerHTML = '<script>window.__y=1</script>'        // 不会执行
div.textContent = '<img src=x onerror="window.__z=1">' // 不执行，原样显示
```

所以「我试过插 `<script>` 没反应」不能证明这里安全。禁用的应该是 `innerHTML` 本身，而不是某一种写法。
