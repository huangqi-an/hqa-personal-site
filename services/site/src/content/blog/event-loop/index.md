---
title: '事件循环'
publishDate: 2023-09-15
description: '事件循环是程序持续监听并处理事件的机制，尤其在 JavaScript 中，它让单线程语言能实现非阻塞异步操作。'
tags:
  - javascript
  - node
language: '中文'
draft: false
---

**定义：** 事件循环是 JavaScript 运行时调度任务的一套规则。同步代码在调用栈里执行，异步任务的回调进入队列，调用栈清空后由事件循环取出执行。

JS 引擎本身没有异步能力。定时器、网络请求、DOM 事件都由宿主环境提供，完成后把回调放进队列，等主线程空闲时再执行。

## 1. 调用栈

**定义：** 函数调用时压栈，返回时弹栈，后进先出。**栈不为空，不会处理任何排队的事件。**

```js
function a() {
  b()
  console.log('a 结束')
}
function b() {
  console.log('b')
}
a()
// b
// a 结束
```

`b` 先入栈，执行完出栈，`a` 才继续。整段同步代码跑完、栈清空，事件循环才有机会取下一个任务。

## 2. 任务队列的两层

**宏任务（task）**

| 来源 | 说明 |
| :--- | :--- |
| `setTimeout` / `setInterval` | 定时器到期后把回调入队 |
| DOM 事件 | 点击、滚动等事件回调 |
| `<script>` 整体执行 | 整段脚本本身就是一个宏任务 |
| I/O | 网络、文件读写完成的回调 |

`setTimeout` 的延迟不是精确值：嵌套超过 5 层后最小延迟 4ms，标签页在后台时浏览器还会进一步节流。

**微任务（microtask）**

| 来源 | 说明 |
| :--- | :--- |
| `Promise.then/catch/finally` | 状态确定后入队 |
| `queueMicrotask` | 显式排一个微任务 |
| `MutationObserver` | DOM 变化回调 |

`await` 后面的代码会被包成微任务，所以它不会同步执行，而是让出当前这段代码。

**两条规则：**

1. 每执行完一个宏任务，**把微任务队列清空**，清空过程中新产生的微任务也一并执行。
2. 微任务清空之后，才可能进入渲染，然后取下一个宏任务。

```js
console.log('1')

setTimeout(() => console.log('2'), 0)

Promise.resolve().then(() => console.log('3'))

console.log('4')
// 1 4 3 2
```

`1`、`4` 是同步代码；栈空后先清微任务（`3`），再取宏任务（`2`）。

微任务执行中新产生的微任务，也在这一轮清空，不会漏到下一轮：

```js
Promise.resolve().then(() => {
  console.log('A')
  Promise.resolve().then(() => console.log('B'))
})
setTimeout(() => console.log('C'), 0)
// A B C
```

`A` 执行时又排进一个 `B`，队列没空就继续取，所以 `B` 仍在 `C` 之前。

**注意：「宏任务」是社区叫法。** HTML 规范里只有 task，没有 macrotask。而且它**不是一个队列**——规范按任务来源分成多个队列（定时器、用户交互、网络、DOM），从哪个队列取由浏览器决定，实践中用户输入优先于定时器。微任务只有一个队列，取空为止。

## 3. 一轮循环

![浏览器事件循环：调用栈、宿主环境与两个队列](./loop-browser.svg)

1. 取出一个宏任务，执行到栈空
2. 清空微任务队列
3. 需要的话进行渲染：样式计算、布局、绘制
4. 回到第 1 步

**渲染不是每轮都有。** 浏览器按屏幕刷新率决定是否渲染（通常 60Hz，约 16.7ms），中间可能连续执行多个宏任务。微任务里死循环会卡死页面，因为微任务不清空，渲染永远轮不到。

在 DevTools 的 Performance 面板录一段，能看到 Task 块之间夹着更细的微任务标记；长任务标红，通常就是某个宏任务或微任务占用了太久。

事件循环是单线程调度，CPU 密集的计算不管放在宏任务还是微任务里都会占住线程。要避免阻塞，只能拆成小片，或者交给 Worker。

## 4. Node 的六个阶段

Node 的事件循环由 libuv 驱动，不是一个队列，而是按阶段轮转，每个阶段维护自己的回调队列。

![Node 事件循环的六个阶段](./loop-node.svg)

| 阶段 | 处理什么 |
| :--- | :--- |
| timers（定时器） | `setTimeout`、`setInterval` 到期回调 |
| pending callbacks（待处理回调） | 上一轮延迟的系统级回调，如 TCP 错误 |
| idle, prepare（空闲与准备） | libuv 内部使用 |
| poll（轮询） | 等待并执行 I/O 回调，多数业务代码在这里 |
| check（检查） | `setImmediate` 的回调 |
| close callbacks（关闭回调） | `socket.on('close')` 这类关闭回调 |

**`process.nextTick` 不属于任何阶段。** 它在当前操作结束后立刻执行，比 Promise 微任务还早：

```js
Promise.resolve().then(() => console.log('promise'))
process.nextTick(() => console.log('nextTick'))
// nextTick
// promise
```

**`setTimeout(fn, 0)` 和 `setImmediate` 的顺序不固定。** 在主模块里，谁先取决于进程启动耗时是否超过 1ms；在 I/O 回调内部，`setImmediate` 一定先执行，因为 poll 阶段之后紧接着就是 check 阶段。

```js
const fs = require('node:fs')

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0)
  setImmediate(() => console.log('immediate'))
})
// immediate
// timeout
```

阶段顺序带来两个实际后果：

- **定时器可能比预期晚。** poll 阶段有源源不断的 I/O 回调时，这一轮会一直停在 poll，timers 要等下一轮。设了 100ms 的定时器 300ms 才执行，多半是前面有活没干完。
- **空闲时不耗 CPU。** 没有事件时 poll 会阻塞等待，直到有新事件或最近的定时器到期，不是空转。

## 5. 浏览器与 Node 的差异

| 维度 | 浏览器 | Node |
| :--- | :--- | :--- |
| 调度者 | 浏览器内核 | libuv |
| 队列结构 | 宏任务队列 + 微任务队列 | 六个阶段，各自有队列 |
| 微任务时机 | 每个宏任务之后 | 每个阶段回调之后、阶段切换时 |
| 特有的高优先级队列 | 无 | `process.nextTick` |
| 渲染 | 每轮可能渲染一次 | 没有渲染概念 |

共同点更重要：**同步代码优先、微任务先于宏任务、微任务一次清空**。这三条两边都成立。
