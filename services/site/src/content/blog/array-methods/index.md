---
title: '数组方法'
publishDate: 2023-10-12
description: 'push 返回新长度，splice 返回被删的元素，sort 返回原数组本身：按改不改原数组分两类，写明返回值、复杂度与常见误用。'
tags:
  - javascript
language: '中文'
draft: false
---

## 1. 会改原数组的方法

这组方法直接操作原数组，返回值各不相同，多数不是数组。

### 1.1 首尾插删：push / pop / shift / unshift

```js
const arr = [1, 2, 3]
arr.push(4)       // 返回新长度 4，arr 变成 [1, 2, 3, 4]（尾部加）
arr.pop()         // 返回被弹出的 4，arr 变成 [1, 2, 3]（尾部删）
arr.unshift(0)    // 返回新长度 4，arr 变成 [0, 1, 2, 3]（头部加）
arr.shift()       // 返回被移除的 0，arr 变成 [1, 2, 3]（头部删）
```

**返回值规律：** `push` / `unshift` 返回新长度（数字），`pop` / `shift` 返回被移除的元素（空数组时是 `undefined`）。

**性能：** `push` / `pop` 是 O(1)（`push` 扩容时均摊 O(1)）；`shift` / `unshift` 是 O(n)，头部插入删除要整体搬移后面所有元素。超大数组上频繁 `shift` 会明显变慢，栈式场景用 `push` / `pop`，需要队列时用下标指针而不是 `shift`。

### 1.2 任意位置删改：splice

```js
const arr = [1, 2, 3, 4, 5]

arr.splice(1, 2)          // 返回被删的 [2, 3]，arr 变成 [1, 4, 5]
arr.splice(1, 0, 9)       // 返回 []，arr 变成 [1, 9, 4, 5]（插入）
arr.splice(1, 2, 8, 7)    // 返回被删的 [9, 4]，arr 变成 [1, 8, 7, 5]（替换成两项）
```

**参数：** `splice(起始下标, 删除个数, 要插入的元素...)`。删除个数为 0 就是纯插入，插入项和删除数不等就是替换。

**返回值规律：** 永远返回**被删掉的元素**组成的新数组，没删就是 `[]`。这点最容易记反，很多人以为返回剩下的部分。

**性能：** O(n)，同样是中间位置搬移。

### 1.3 排序、反转、填充：sort / reverse / fill

```js
const arr = [10, 9, 1]

arr.sort()                     // [1, 10, 9]，默认按字符串比，不是数字大小
arr.sort((a, b) => a - b)      // [1, 9, 10]，升序
arr.sort((a, b) => b - a)      // [10, 9, 1]，降序

const b = [3, 1, 2]
const sorted = b.sort()
console.log(sorted === b)      // true，返回的就是原数组本身
console.log(b)                 // [1, 2, 3]，原数组被改了

const c = new Array(3).fill(0) // [0, 0, 0]，fill 也改原数组
c.fill(1, 1)                   // [0, 1, 1]，从下标 1 开始填
```

**默认排序按字符串。** 元素先转成字符串再按 UTF-16 码元比较，所以 `10` 排在 `9` 前面。数字数组必须传比较函数。

**比较函数的返回值：** 负数表示 `a` 排前面，正数表示 `b` 排前面，0 表示相等。写 `a - b` 是升序，`b - a` 是降序。

**`sort` / `reverse` 返回原数组本身**，所以 `sorted === b` 是 `true`。能链式，但链的是同一个数组，中间结果不好排查；要保留原顺序，先 `slice()` 一份。

**`fill` 填的是同一个引用。** `new Array(3).fill([])` 得到三个指向同一数组的元素，改一个全变。

## 2. 不改原数组的方法

这组都返回新值，原数组不动，可以链式调用。

### 2.1 遍历：forEach

```js
const arr = [1, 2, 3]

const r = arr.forEach((x) => x * 2)
console.log(r)            // undefined
console.log(arr)          // [1, 2, 3]，原数组不变
```

**返回值：** 永远是 `undefined`，所以 `arr.forEach(...).map(...)` 必然报错。

**提前退出：** 回调里 `return` 只相当于 `continue`，跳过当前这轮；`break` 直接语法错误。要中途停下来，用 `for...of` 加 `break`，或者用 `some` 借布尔短路。

```js
for (const x of arr) {
  if (x === 2) break      // for...of 可以 break
}
```

### 2.2 映射与筛选：map / filter

```js
const arr = [1, 2, 3, 4]

const doubled = arr.map((x) => x * 2)       // [2, 4, 6, 8]，arr 不变
const even = arr.filter((x) => x % 2 === 0) // [2, 4]，arr 不变
```

**返回值规律：** 都返回**新数组**，原数组不动。`map` 长度不变，`filter` 长度可能变短。

**能链式：** `arr.filter(...).map(...)` 可以接着写，因为中间结果还是数组。

**一个坑：** 只复制数组，不复制元素。数组里装对象时，新旧两个数组共享同一批对象，改属性两边都变。

```js
const users = [{ n: 1 }]
const copy = users.map((u) => u)
copy[0].n = 99
console.log(users[0].n)   // 99，改的是同一个对象
```

### 2.3 聚合：reduce

```js
const arr = [1, 2, 3]

arr.reduce((sum, x) => sum + x)       // 6，没给初始值，第一个元素当起点
arr.reduce((sum, x) => sum + x, 10)   // 16，给了初始值就从 10 开始累加

[].reduce((a, b) => a + b, 0)         // 0
[].reduce((a, b) => a + b)            // TypeError: Reduce of empty array with no initial value
```

**初始值决定返回类型。** 上面返回数字，传 `{}` 就能返回对象，常用来计数或分组：

```js
['a', 'b', 'a'].reduce((acc, x) => {
  acc[x] = (acc[x] || 0) + 1
  return acc
}, {})                                 // { a: 2, b: 1 }
```

**没给初始值时**，第一个元素直接当初始值、回调从第二个元素开始跑。只有一个元素的数组会原样返回、回调一次都不执行——这类 bug 很隐蔽。

### 2.4 查找与判断：find / findIndex / includes / indexOf / some / every

```js
const users = [
  { id: 1, name: 'a' },
  { id: 2, name: 'b' }
]

users.find((u) => u.id === 2)       // { id: 2, name: 'b' }，找不到是 undefined
users.findIndex((u) => u.id === 2)  // 1，找不到是 -1
users.filter((u) => u.id === 2)     // [{ id: 2, name: 'b' }]，永远返回数组

console.log([1, 2, 3].includes(2))          // true
console.log([1, 2, 3].indexOf(2))           // 1，找不到是 -1
console.log([NaN].includes(NaN))            // true
console.log([NaN].indexOf(NaN))             // -1，严格相等比不出 NaN

console.log([1, 2, 3].some((x) => x > 2))   // true，遇到第一个满足的就停
console.log([1, 2, 3].every((x) => x > 0))  // true
console.log([].some(() => true))            // false
console.log([].every(() => false))          // true，空数组上 every 恒为真
```

**返回值规律：**

- `find` 返回元素本身，`filter` 返回数组。`filter(...)[0]` 基本都能换成 `find`。
- `findIndex` / `indexOf` 返回下标，找不到都是 `-1`。
- `includes` 返回布尔，`indexOf` 返回下标——只判断存在性时用 `includes`。
- `some` / `every` 返回布尔，且**短路**：`some` 命中第一个真就停，`every` 命中第一个假就停。

**空数组是特例：** `every` 恒为 `true`（没有反例），`some` 恒为 `false`。写校验逻辑时，空数组会直接通过。

### 2.5 截取、拼接、转换：slice / concat / join / flat / flatMap

```js
const arr = [1, 2, 3, 4]

arr.slice(1, 3)          // [2, 3]，左闭右开，arr 不变
arr.slice(-2)            // [3, 4]，负数从末尾数
arr.concat([5], 6)       // [1, 2, 3, 4, 5, 6]
arr.join('-')            // '1-2-3-4'

[[1, [2]], 3].flat()     // [1, [2], 3]，默认只拍平一层
[[1, [2]], 3].flat(2)    // [1, 2, 3]
[1, 2].flatMap((x) => [x, x * 2])  // [1, 2, 2, 4]
```

**`slice` 与 `splice` 只差两个字母，行为相反：** `slice` 只读、不改原数组、返回截取结果；`splice` 改原数组、返回被删部分。

**`flat` 默认深度是 1**，嵌套两层要传 `2`，全拍平用 `Infinity`。

**`flatMap` 等于 `map` 再 `flat(1)`**，适合「一个元素展开成多个」的场景，比如把句子切成单词。

## 3. 速查表

| 方法 | 改原数组 | 返回 |
| :--- | :--- | :--- |
| `push` / `unshift` | 是 | 新长度 |
| `pop` / `shift` | 是 | 被移除的元素 |
| `splice` | 是 | 被删元素组成的数组 |
| `sort` / `reverse` / `fill` | 是 | 原数组 |
| `forEach` | 否 | `undefined` |
| `map` / `filter` / `slice` / `concat` / `flat` / `flatMap` | 否 | 新数组 |
| `reduce` | 否 | 任意类型，由初始值决定 |
| `find` | 否 | 元素或 `undefined` |
| `findIndex` / `indexOf` | 否 | 下标或 `-1` |
| `includes` / `some` / `every` | 否 | 布尔值 |
| `join` | 否 | 字符串 |
