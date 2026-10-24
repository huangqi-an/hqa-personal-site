---
title: 'Node.js'
publishDate: 2023-12-21
description: 'Node.js 是一个开源、跨平台的 JavaScript 运行时环境，让 JavaScript 代码能在浏览器之外的服务器端运行。'
tags:
  - node
  - javascript
language: '中文'
draft: false
---

## 1. node 命令之后发生了什么

```
node app.js
```

这条命令做了三件事：读入口文件、交给 V8 编译执行、把异步 I/O 交给 libuv。

Node 不是一个语言，是一个运行时。它由三部分组成：

| 组成 | 负责 |
| :--- | :--- |
| V8 | 解析、编译、执行 JavaScript，做垃圾回收 |
| libuv | 事件循环、线程池、跨平台 I/O（epoll / kqueue / IOCP） |
| 核心库 | `fs`、`net`、`http`、`crypto` 这些内置模块，多数是 C++ 绑定加 JS 包装 |

**浏览器里有的东西这里大多没有。** 没有 `window`、`document`、`localStorage`，也没有 DOM 事件。全局对象叫 `global`（ES2020 起也可以写 `globalThis`）。

## 2. 模块解析：先找到文件

`require('./utils')` 到底加载哪个文件，按这个顺序找：

1. 核心模块（`fs`、`path`）——命中就返回，不会去 `node_modules` 找
2. 以 `./`、`../`、`/` 开头——按路径找，依次补 `.js`、`.json`、`.node`，再试目录下的 `package.json` 的 `main`
3. 其他——从当前目录开始逐级向上找 `node_modules`

```js
require('fs')            // 核心模块
require('./a')           // ./a.js
require('./data.json')   // 直接给扩展名，按 JSON 解析
require('lodash')        // node_modules/lodash/package.json 的 main
```

**ESM 的规则更严格**：相对导入必须写扩展名，`import './a.js'`，写 `./a` 会报 `ERR_MODULE_NOT_FOUND`。

文件用 CJS 还是 ESM 解析，取决于两件事：

| 情况 | 结果 |
| :--- | :--- |
| 后缀是 `.mjs` | ESM |
| 后缀是 `.cjs` | CommonJS |
| 后缀是 `.js`，最近的 `package.json` 里 `"type": "module"` | ESM |
| 后缀是 `.js`，没有 `type` 或 `"type": "commonjs"` | CommonJS |

`package.json` 的 `exports` 字段会覆盖 `main`，还能按条件导出不同入口（`import` / `require` / `browser`），这是双包（dual package）的实现方式，也容易出「同一个包被加载了两份」的问题。

## 3. 模块加载：缓存、快照、循环依赖

**`require` 有缓存，同一个文件只会执行一次。**

```js
const a = require('./counter')
const b = require('./counter')

console.log(a === b)     // true，拿到的是同一个对象
```

缓存按解析后的绝对路径存，所以在不同目录里 `require` 同一个文件，拿到的仍是同一份。

**`exports` 是 `module.exports` 的引用，重新赋值会断开。**

```js
// bad.js
exports = { a: 1 }       // module.exports 没变

// good.js
exports.a = 1            // 挂在原对象上
```

```js
console.log(require('./bad'))    // {}
console.log(require('./good'))   // { a: 1 }
```

要么一直挂属性，要么一开始就写 `module.exports = {...}`，别混着用。

**CommonJS 导出的是值的快照，ESM 是活绑定。**

```js
// snap.cjs
exports.value = 1
exports.change = () => { exports.value = 2 }
```

```js
const s = require('./snap.cjs')
const before = s.value
s.change()

console.log(before)      // 1，解构/赋值那一刻的值
console.log(s.value)     // 2，通过属性读是实时的
```

ESM 不一样，导入方看到的总是指向模块内部的最新值：

```js
// live.mjs
export let count = 0
export function inc() { count++ }
```

```js
const m = await import('./live.mjs')
console.log(m.count)     // 0
m.inc()
console.log(m.count)     // 1，跟着变
```

**循环依赖在 CJS 里不会报错，但会拿到半成品。** A 引用 B、B 又引用 A 时，B 拿到的是 A 执行到一半的 `module.exports`：

```js
// c1.cjs
exports.a = 1
const c2 = require('./c2.cjs')
exports.b = c2.b

// c2.cjs
const c1 = require('./c1.cjs')
exports.seen = c1.a
exports.b = 2
```

最终 `require('./c1.cjs')` 得到 `{ a: 1, b: 2 }`，而 `c2` 里的 `c1.a` 能读到 1——因为在 `require('./c2.cjs')` 之前，`a` 已经挂上去了。如果顺序反过来，读到的就是 `undefined`。

## 4. 执行：几个只在 Node 里存在的对象

| 对象 | 说明 |
| :--- | :--- |
| `global` | 全局对象，等价于浏览器的 `window` |
| `process` | 进程信息与控制：`argv`、`env`、`cwd()`、`exit()` |
| `Buffer` | 二进制数据，继承自 `Uint8Array` |
| `__dirname` / `__filename` | 当前文件所在目录 / 完整路径，**只在 CJS 里存在** |

ESM 里没有 `__dirname`，用 `import.meta.url` 换算：

```js
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
```

**顶层 `await` 只在 ESM 里可用**，CJS 里写会直接语法错误。

```js
// 只能在 ESM 顶层这么写
const data = await fetch(url).then((r) => r.json())
```

## 5. 异步：libuv 替谁干活

JS 执行是单线程的：同一时刻只有一段代码在跑。但**“Node 是单线程的”只说了一半**，I/O 并不是在这个线程里等。

- 网络 I/O 走 epoll / kqueue / IOCP，由事件循环通知
- 文件读写、DNS 解析、`crypto` 的部分计算，交给 libuv 的线程池
- 线程池默认 4 个线程，用 `UV_THREADPOOL_SIZE` 调整

所以同时读 10 个文件时，真正在磁盘上干活的是那 4 个线程，JS 线程只负责接收回调、执行回调。

事件循环的六个阶段、`nextTick` 与 Promise 的优先级，单独写在[事件循环](/blog/event-loop)里，这里不重复。

## 6. 内置模块速览

| 模块 | 用途 |
| :--- | :--- |
| `fs` / `fs/promises` | 文件读写，后者返回 Promise |
| `path` | 路径拼接、解析、取扩展名 |
| `os` | CPU、内存、平台信息 |
| `process` | 环境变量、命令行参数、退出 |
| `events` | 事件订阅，`EventEmitter` |
| `stream` | 流式处理，读写大文件时用 |
| `buffer` | 二进制数据 |
| `http` / `https` | 起服务、发请求 |
| `url` | URL 解析与拼接 |
| `crypto` | 哈希、加密、随机数 |
| `zlib` | gzip / deflate 压缩 |

```js
import { readFile } from 'node:fs/promises'

const text = await readFile('./package.json', 'utf8')
const pkg = JSON.parse(text)
```

事件订阅：

```js
import { EventEmitter } from 'node:events'

const bus = new EventEmitter()

bus.on('order', (id) => console.log('收到订单', id))
bus.emit('order', 42)
```

`EventEmitter` 是同步执行的：`emit` 会依次调用监听器，任何一个抛错都会中断后面的。

## 7. 进程、线程与集群

| 需求 | 用什么 | 说明 |
| :--- | :--- | :--- |
| 跑一个外部命令 | `child_process.spawn` | 流式输出，适合长时间运行的进程 |
| 跑命令并拿完整输出 | `child_process.exec` | 有缓冲区上限，输出大时会失败 |
| 开一个 Node 子进程 | `child_process.fork` | 自带 IPC 通道，可以互相发消息 |
| CPU 密集计算 | `worker_threads` | 真正的线程，可用 `SharedArrayBuffer` 共享内存 |
| 多核利用、同端口 | `cluster` | 主进程监听端口，分发给多个 worker |

`worker_threads` 和 `cluster` 的区别：前者共享内存、适合算，后者是独立进程、适合扛并发连接。

```js
import { Worker } from 'node:worker_threads'

const worker = new Worker(new URL('./hash-worker.js', import.meta.url))
worker.on('message', (result) => console.log(result))
worker.postMessage({ file: 'big.bin' })
```

`cluster` 起四个进程监听同一端口：

```js
import cluster from 'node:cluster'
import http from 'node:http'

if (cluster.isPrimary) {
  for (let i = 0; i < 4; i++) cluster.fork()
} else {
  http.createServer((req, res) => res.end('ok')).listen(3000)
}
```

## 8. 退出：事件循环空了才结束

Node 进程正常退出的条件只有一个：**没有待处理的任务了**——没有定时器、没有监听中的 socket、没有 pending 的 I/O。

`process.exit()` 是强制退出，**不会等未完成的 I/O**：

```js
import { writeFile } from 'node:fs'

writeFile('./out.txt', 'data', () => console.log('写完'))
process.exit(0)      // 回调可能永远不执行，文件可能没写成
```

要退出但不想丢数据，用 `process.exitCode` 让进程自己走完：

```js
process.exitCode = 1     // 任务跑完，再以 1 退出
```

**优雅退出**在服务里是必需的：

```js
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('连接已处理完')
    process.exit(0)
  })
})
```

`SIGTERM` 是 `kill` 和容器编排系统默认发的信号，收到后应该停止接受新连接、等已有请求处理完。

**未捕获的异常**默认让进程以 1 退出；未处理的 Promise rejection 在 Node 15 之后也是同样的行为，可以用 `process.on('unhandledRejection')` 接管，但只建议用来记录日志，不建议继续运行。

## 9. 几个常被误解的点

**「Node 是单线程的。」** JS 执行是单线程，但 libuv 有线程池，`worker_threads` 还能开真正的线程。准确说法是「JS 执行是单线程的」。

**「`require` 是异步的。」** 同步阻塞。加载大模块时会卡住当前线程，ESM 的 `import` 在加载阶段是异步的。

**「CJS 和 ESM 可以随便混用。」** ESM 里可以 `import` CJS 模块（拿到 `module.exports` 作为默认导出），CJS 里不能直接 `require` 纯 ESM 包，要用动态 `import()`。较新的 Node 版本开始支持 `require(esm)`，但生态里还不普遍。

**「`Buffer` 就是字符串。」** `Buffer` 是二进制字节序列，`toString()` 只是按某种编码解码，编码不对就是乱码。

**「`process.exit()` 会等清理完。」** 不会，它立即终止，回调、日志、文件写入都可能被截断。
