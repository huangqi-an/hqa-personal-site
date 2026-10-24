---
title: 'XMLHttpRequest'
publishDate: 2023-12-07
description: 'XMLHttpRequest（简称 XHR）是浏览器内置的一个 API 对象，主要用于在后台与服务器交换数据。'
tags:
  - javascript
  - http
language: '中文'
draft: false
---

## 1. 最小的一个请求

```js
const xhr = new XMLHttpRequest()

xhr.open('GET', '/api/user')
xhr.onload = () => {
  if (xhr.status === 200) {
    console.log(xhr.responseText)
  }
}
xhr.send()
```

四步固定：`new` 创建、`open` 配置、挂回调、`send` 发出。

**`open` 不发请求**，它只记录方法和地址；`send` 才真正发起。这个命名误导了很多人，以为 `open` 是「打开连接」。

## 2. open：配置请求

```js
xhr.open(method, url, async, user, password)
```

| 参数 | 说明 |
| :--- | :--- |
| `method` | `GET`、`POST`、`PUT`、`DELETE` 等，大小写不敏感 |
| `url` | 相对或绝对地址，跨域要服务端允许 |
| `async` | 是否异步，默认 `true`；传 `false` 是同步请求，已废弃 |
| `user` / `password` | HTTP 基本认证的用户名密码，很少用 |

**设置请求头**必须在 `open` 之后、`send` 之前：

```js
xhr.open('POST', '/api/user')
xhr.setRequestHeader('Content-Type', 'application/json')
xhr.setRequestHeader('X-Trace-Id', 'abc123')
xhr.send(JSON.stringify({ name: 'a' }))
```

同名请求头多次设置会合并成一个，用逗号分隔。

**有些头浏览器不让你设**：`Content-Length`、`Host`、`Cookie`、`Origin`、`Referer` 等，它们由浏览器自己算。强行设置会被忽略，部分浏览器会在控制台警告。

**跨域带 Cookie** 要单独开：

```js
xhr.withCredentials = true
```

同时服务端必须返回 `Access-Control-Allow-Credentials: true`，且 `Access-Control-Allow-Origin` 不能是 `*`。

## 3. send：请求体

```js
xhr.send()              // GET、HEAD 用这个
xhr.send(body)          // POST、PUT 传数据
```

`body` 支持这几种类型：

| 类型 | Content-Type | 说明 |
| :--- | :--- | :--- |
| 字符串 | 手动设 | JSON 要自己 `JSON.stringify` 并设 `application/json` |
| `FormData` | 自动 | 带 boundary，**不要手动设 Content-Type** |
| `URLSearchParams` | 自动 | 变成 `application/x-www-form-urlencoded` |
| `Blob` / `File` | 按文件类型 | 上传文件 |
| `ArrayBuffer` | 手动设 | 二进制数据 |

```js
// 表单，包含文件
const form = new FormData()
form.append('name', 'a')
form.append('file', fileInput.files[0])
xhr.open('POST', '/upload')
xhr.send(form)          // 不要设 Content-Type，浏览器会带 boundary
```

手动给 `FormData` 设 `Content-Type: multipart/form-data` 会丢掉 boundary，服务端解析不了。

## 4. 事件：readyState 与监听方式

`readyState` 有五个值：

| 值 | 常量 | 含义 |
| :--- | :--- | :--- |
| `0` | `UNSENT` | 刚创建，还没 `open` |
| `1` | `OPENED` | 已 `open`，还没 `send` |
| `2` | `HEADERS_RECEIVED` | 收到响应头 |
| `3` | `LOADING` | 正在接收响应体 |
| `4` | `DONE` | 请求结束（成功或失败都算） |

浏览器里实测一次 200 请求，事件顺序是这样：

```
loadstart(rs=1,status=0)
rsc:2
rsc:3
progress(rs=3,status=200)
rsc:4
load(rs=4,status=200)
loadend(rs=4,status=200)
```

`rsc` 是 `readystatechange`。可以看到 `loadstart` 在 `readyState` 变成 1 时触发，`progress` 在 3，`load` 在 4。

**不要再用 `onreadystatechange` 判断完成**，它的写法是：

```js
xhr.onreadystatechange = () => {
  if (xhr.readyState === 4 && xhr.status === 200) { /* ... */ }
}
```

现代浏览器提供了语义更清楚的事件：

| 事件 | 触发时机 |
| :--- | :--- |
| `loadstart` | 开始发送 |
| `progress` | 接收数据过程中，可能多次 |
| `load` | 请求成功完成（**包括 4xx / 5xx**） |
| `error` | 网络层失败 |
| `timeout` | 超过 `xhr.timeout` |
| `abort` | 调用 `xhr.abort()` |
| `loadend` | 无论成功失败都会触发，在以上事件之后 |

**`load` 只表示「拿到了响应」，不代表成功。** 实测一个 404 页面，事件和 200 完全一样：

```
load(rs=4,status=404)
loadend(rs=4,status=404)
```

所以判断成功必须看 `status`，通常是 `status >= 200 && status < 300`。

## 5. 读响应

`responseType` 决定 `response` 是什么类型，**必须在 `send` 之前设置**，之后再改会抛 `InvalidStateError`。

| `responseType` | `xhr.response` 的类型 |
| :--- | :--- |
| `''` 或 `'text'` | 字符串 |
| `'json'` | 已解析的对象，解析失败为 `null` |
| `'blob'` | `Blob` |
| `'arraybuffer'` | `ArrayBuffer` |
| `'document'` | `Document`，用于解析 XML/HTML |

```js
xhr.open('GET', '/api/user')
xhr.responseType = 'json'
xhr.onload = () => {
  console.log(xhr.response)      // 已经是对象，不用 JSON.parse
}
xhr.send()
```

**`responseText` 只在 `responseType` 是空或 `text` 时可用**，设成 `json`/`blob` 之后再读会抛 `InvalidStateError`。想同时拿原文和对象，就别设 `responseType`，自己 `JSON.parse`。

**读响应头：**

```js
xhr.getResponseHeader('Content-Type')
xhr.getAllResponseHeaders()      // 一个字符串，每行一个头
```

跨域时只能读到服务端通过 `Access-Control-Expose-Headers` 暴露的头。

**下载二进制文件：**

```js
xhr.open('GET', '/report.pdf')
xhr.responseType = 'blob'
xhr.onload = () => {
  const url = URL.createObjectURL(xhr.response)
  const a = document.createElement('a')
  a.href = url
  a.download = 'report.pdf'
  a.click()
  URL.revokeObjectURL(url)
}
xhr.send()
```

## 6. 进度、超时、取消

**下载进度：**

```js
xhr.onprogress = (e) => {
  if (e.lengthComputable) {
    console.log(`${e.loaded} / ${e.total}`)
  }
}
```

`lengthComputable` 为 `false` 时说明服务端没给 `Content-Length`，只能显示已下载字节数。

**上传进度**要用 `xhr.upload`，它在请求体发送时触发：

```js
xhr.upload.onprogress = (e) => {
  if (e.lengthComputable) {
    console.log(`上传 ${Math.round((e.loaded / e.total) * 100)}%`)
  }
}
```

**超时：**

```js
xhr.timeout = 5000
xhr.ontimeout = () => console.log('超时')
```

超时后 `status` 是 `0`，`readyState` 是 `4`。

**取消：**

```js
xhr.abort()
```

实测立即取消一个刚发出的请求，事件顺序是：

```
rsc:1
loadstart(rs=1,status=0)
rsc:4
abort(rs=4,status=0)
loadend(rs=4,status=0)
```

注意 `readyState` 直接跳到了 4，中间没有 2 和 3，`status` 是 0。

## 7. 几个常踩的坑

**`error` 不包含 4xx / 5xx。** HTTP 错误照样触发 `load`，只有网络层失败（断网、DNS 失败、CORS 被拒）才触发 `error`。判断业务成败只能看 `status`。

**`status === 0` 有四种常见原因：**

| 原因 | 表现 |
| :--- | :--- |
| 请求被 `abort()` 取消 | 触发 `abort` 事件 |
| 超时 | 触发 `timeout` 事件 |
| 网络断开、DNS 失败 | 触发 `error` 事件 |
| CORS 预检失败 | 触发 `error`，控制台有 CORS 报错 |

**同步请求会卡死页面。** `open(method, url, false)` 会在主线程上阻塞到请求结束，期间页面不响应。浏览器仍允许，但会在控制台警告「Synchronous XMLHttpRequest on the main thread is deprecated」，页面卸载阶段则直接禁止。Worker 里不受影响。

**GET 请求会被浏览器缓存。** 同样的 URL 第二次可能直接读缓存，看不到新数据。要么服务端加 `Cache-Control: no-store`，要么在 URL 上加时间戳：

```js
xhr.open('GET', `/api/list?t=${Date.now()}`)
```

**一个 XHR 对象只能跑一个请求。** 重复调用 `open` 会重置状态，之前的请求和回调都作废。要并发就 `new` 多个实例。

**`send` 之后再设 `responseType` 或请求头，都会抛错。** 配置阶段（`open` 到 `send` 之间）才是设置窗口。
