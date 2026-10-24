---
title: 'fetch'
publishDate: 2023-12-08
description: 'fetch 只在网络层失败时 reject，404 也照常 resolve；body 只能读一次，超时靠 AbortSignal。'
tags:
  - javascript
  - http
language: '中文'
draft: false
---

## 1. 最小的一个请求

```js
fetch('/api/user')
  .then((res) => res.json())
  .then((data) => console.log(data))
```

`fetch` 返回 Promise，**resolve 的时机是收到响应头**，不是 body 下载完。所以 `await fetch(...)` 之后，body 可能还在传输。

这一点决定了两件事：`res.ok`/`res.status` 此时已经可读，而 `res.json()` 需要等 body。

## 2. Response：body 只能读一次

```js
const res = await fetch('/api/user')

res.ok            // true，status 在 200-299
res.status        // 200
res.statusText    // 'OK'
res.url           // 最终地址，跟随重定向后
res.redirected    // 是否发生过重定向
res.headers.get('content-type')   // 头名大小写不敏感
```

**body 是流，只能消费一次。** 读完 `bodyUsed` 变成 `true`，再读就报错：

```js
res.bodyUsed        // false
await res.text()
res.bodyUsed        // true
await res.text()    // TypeError: Failed to execute 'text' on 'Response': body stream already read
```

读取方法有五种，都返回 Promise：

| 方法 | 结果 |
| :--- | :--- |
| `res.json()` | 解析成对象，格式不对则抛 `SyntaxError` |
| `res.text()` | 字符串 |
| `res.blob()` | `Blob`，下载文件用 |
| `res.arrayBuffer()` | `ArrayBuffer` |
| `res.formData()` | `FormData`，解析 `multipart/form-data` |

**要读两次，先 `clone()`**：

```js
const res = await fetch('/api/user')
const copy = res.clone()

const data = await res.json()
const raw = await copy.text()      // 另一个流，不受影响
```

注意 `clone()` 会把 body 缓冲在内存里，大文件不要这么做。

## 3. 请求配置

```js
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'a' }),
  credentials: 'include',
  signal
})
```

| 选项 | 说明 |
| :--- | :--- |
| `method` | 默认 `GET`，可为 `POST`、`PUT`、`DELETE`、`PATCH` 等 |
| `headers` | 普通对象或 `Headers` 实例 |
| `body` | 请求体，见下表 |
| `credentials` | `omit` / `same-origin`（默认）/ `include` |
| `mode` | `cors`（默认）/ `no-cors` / `same-origin` |
| `cache` | `default` / `no-store` / `reload` / `no-cache` / `force-cache` 等 |
| `redirect` | `follow`（默认）/ `error` / `manual` |
| `signal` | `AbortSignal`，用于取消或超时 |
| `keepalive` | 页面卸载后继续发送，总量上限 64KB |

**`body` 支持的类型：**

| 类型 | 说明 |
| :--- | :--- |
| 字符串 | 需要自己设 `Content-Type` |
| `FormData` | 自动带 boundary，不要手动设头 |
| `URLSearchParams` | 自动变成 `application/x-www-form-urlencoded` |
| `Blob` / `File` | 上传文件 |
| `ArrayBuffer` / TypedArray | 二进制 |
| `ReadableStream` | 流式上传，需同时传 `duplex: 'half'` |

**GET 和 HEAD 不能带 body**，带了直接报错：

```js
fetch('/healthz', { method: 'GET', body: 'x' })
// TypeError: Failed to execute 'fetch' on 'Window': Request with GET/HEAD method cannot have body.
```

## 4. 错误处理

**`fetch` 只在网络层失败时 reject。** HTTP 的 404、500 都会正常 resolve，`ok` 为 `false`：

```js
const res = await fetch('/no-such-page')
res.ok       // false
res.status   // 404
```

所以判断成功必须自己写：

```js
const res = await fetch(url)
if (!res.ok) {
  throw new Error(`HTTP ${res.status}`)
}
const data = await res.json()
```

**只有这些情况会 reject：**

| 情况 | 错误类型 |
| :--- | :--- |
| 断网、DNS 失败、连接被拒 | `TypeError: Failed to fetch` |
| CORS 预检失败 | `TypeError: Failed to fetch` |
| 被 `abort()` 取消 | `DOMException`，`name` 是 `AbortError` |
| 超时 | `DOMException`，`name` 是 `TimeoutError` |

`TypeError: Failed to fetch` 是个很含糊的错误，浏览器出于安全不告诉你是 DNS 还是 CORS 导致的。排查时看控制台的 CORS 报错，或者用 `curl` 单独验证接口。

## 5. 取消与超时

用 `AbortController`：

```js
const ac = new AbortController()

const p = fetch('/api/slow', { signal: ac.signal })
  .catch((e) => {
    if (e.name === 'AbortError') {
      console.log('已取消')
    }
  })

ac.abort()      // 触发取消
```

取消之后 Promise 以 `AbortError` reject，**不是 resolve**，所以必须有 `catch`，否则控制台会出现未处理的拒绝。

**超时**可以直接用 `AbortSignal.timeout()`：

```js
fetch('/api/slow', { signal: AbortSignal.timeout(3000) })
  .catch((e) => {
    if (e.name === 'TimeoutError') console.log('超时')
  })
// 3 秒后：TimeoutError: signal timed out
```

老浏览器没有这个静态方法，可以手动组合：

```js
const ac = new AbortController()
const timer = setTimeout(() => ac.abort(), 3000)
fetch(url, { signal: ac.signal }).finally(() => clearTimeout(timer))
```

区别是手动 `abort()` 抛的是 `AbortError`，不是 `TimeoutError`，靠名字区分不了超时和用户取消。

**一个 signal 可以同时取消多个请求**，适合「切换页面时取消所有未完成请求」：

```js
const ac = new AbortController()
window.addEventListener('beforeunload', () => ac.abort())

fetch('/api/a', { signal: ac.signal })
fetch('/api/b', { signal: ac.signal })
```

## 6. 读下载进度

`fetch` 没有上传进度（XHR 的 `xhr.upload.onprogress` 那套没有对应物）。下载进度要自己读流：

```js
const res = await fetch('/big-file')
const total = Number(res.headers.get('content-length')) || 0

const reader = res.body.getReader()
let loaded = 0
const chunks = []

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  chunks.push(value)
  loaded += value.length
  if (total) console.log(`${Math.round((loaded / total) * 100)}%`)
}
```

**`loaded` 和 `content-length` 可能对不上。** 服务端开了 gzip 时，`content-length` 是压缩后的长度，而读到的 `value.length` 是解压后的字节数，进度会超过 100%。要准确进度，就别对文本资源启用压缩，或者只用它做个粗略估计。

## 7. 流式读取

`res.body` 是 `ReadableStream`，可以一块一块处理，不用等全部下载完：

```js
const res = await fetch('/api/stream')
const reader = res.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  process.stdout.write(decoder.decode(value, { stream: true }))
}
```

`decoder.decode(value, { stream: true })` 里的 `stream` 很关键：一个 UTF-8 汉字可能被切在两个 chunk 里，不加这个参数会解出乱码。

这个能力让 fetch 可以处理 SSE、大模型流式输出这类场景——响应还没结束时就能开始渲染。

## 8. 几个常踩的坑

**忘了检查 `res.ok`。** 404 页面会被当成成功响应，`res.json()` 解析 HTML 时报 `Unexpected token '<'`，报错信息完全不指向真正的问题。

**body 读两次。** `res.json()` 之后再 `res.text()` 必失败。需要两种格式就先 `clone()`。

**默认不带跨域 Cookie。** `credentials` 默认是 `same-origin`（实测值），跨域要显式设 `include`，服务端还要返回 `Access-Control-Allow-Credentials: true`。

**`fetch` 不是「不受同源策略限制」。** 在浏览器里它照样受 CORS 约束，只是错误被简化成 `Failed to fetch`。Node 18+ 内置的 fetch 没有 CORS，行为不一样，调试时别混。

**没有自动重试。** 网络抖动导致的失败要自己包一层重试逻辑，注意只对幂等请求重试。

**`keepalive` 不是万能的。** 页面卸载时的埋点请求可以用它，但总量上限 64KB，超了直接失败，而且不能保证一定送达。
