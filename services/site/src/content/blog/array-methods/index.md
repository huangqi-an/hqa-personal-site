---
title: '数组方法'
publishDate: 2023-10-12
description: '按「改不改原数组」分成两类，配上返回值和常见坑，用的时候不用逐个查文档。'
tags:
  - javascript
language: '中文'
draft: false
---

数组方法记不住，多半是因为没分清两件事：**这个方法改不改原数组**，**它返回什么**。

`sort` 改了原数组、返回的还是它自己；`map` 不动原数组、返回一个新数组；`push` 改了原数组、返回的是长度。这三个混在一起用，链式调用就会断。

下面按「改」和「不改」分两组。

## 1. 会改原数组的方法

| 方法 | 做什么 | 返回值 |
| :--- | :--- | :--- |
| `push(...items)` | 末尾追加 | 新长度 |
| `pop()` | 删末尾一个 | 被删的元素 |
| `unshift(...items)` | 开头插入 | 新长度 |
| `shift()` | 删开头一个 | 被删的元素 |
| `splice(start, count, ...items)` | 任意位置删/插 | 被删元素组成的数组 |
| `sort(compareFn)` | 原地排序 | 原数组（已排序） |
| `reverse()` | 原地反转 | 原数组 |
| `fill(value, start, end)` | 用同一个值填充 | 原数组 |

**`splice` 的返回值容易记反。** 它返回被删掉的部分，不是剩下的部分：

```js
const a = [1, 2, 3, 4]
const removed = a.splice(1, 2)   // a 变成 [1, 4]
console.log(removed)             // [2, 3]
```

**`sort` 默认按字符串排。** 不传比较函数时，元素先转成字符串再按 UTF-16 码元比较：

```js
console.log([10, 9, 1].sort())                 // [1, 10, 9]
console.log([10, 9, 1].sort((a, b) => a - b))  // [1, 9, 10]
```

数字排序必须传比较函数，返回负数表示 `a` 在前。字符串比较不受影响，但中文按码元排，不是拼音。

**一个 `splice` 顶三个方法。** 它同时能删、能插、能替换，区别只在参数：

```js
const a = ['a', 'b', 'c', 'd']
a.splice(1, 2)           // 删除，a 变成 ['a', 'd']

const b = ['a', 'b', 'c', 'd']
b.splice(1, 0, 'x')      // 插入，b 变成 ['a', 'x', 'b', 'c', 'd']

const c = ['a', 'b', 'c', 'd']
c.splice(1, 1, 'y')      // 替换，c 变成 ['a', 'y', 'c', 'd']
```

## 2. 不改原数组的方法

| 方法 | 作用 | 返回值 |
| :--- | :--- | :--- |
| `forEach(fn)` | 遍历，执行副作用 | `undefined` |
| `map(fn)` | 一对一转换 | 新数组，长度不变 |
| `filter(fn)` | 按条件筛选 | 新数组，长度可能变 |
| `reduce(fn, init)` | 汇总成一个值 | 任意类型 |
| `some(fn)` / `every(fn)` | 是否存在 / 是否全部满足 | 布尔值 |
| `find(fn)` / `findIndex(fn)` | 找第一个匹配项 | 元素 / 下标，找不到是 `undefined` / `-1` |
| `includes(v)` / `indexOf(v)` | 是否包含 / 首次出现位置 | 布尔值 / 下标 |
| `slice(start, end)` | 截取一段 | 新数组 |
| `concat(...arrs)` | 拼接 | 新数组 |
| `join(sep)` | 拼成字符串 | 字符串 |
| `flat(depth)` / `flatMap(fn)` | 拍平 / 映射后拍平 | 新数组 |

**`forEach` 返回 `undefined`，不能链式调用。** `map`、`filter` 返回新数组，可以接着 `.filter().map()`。`forEach` 里写 `return` 只是跳过当前循环，效果等同于 `continue`，不能 `break`，要提前退出用 `for...of`。

**`find` 和 `filter` 的区别在返回类型。** 找第一个用 `find`，返回元素本身；要全部匹配用 `filter`，返回数组。用了 `filter()[0]` 的地方，基本都能换成 `find`。

**`reduce` 的第二个参数决定返回类型。** 不传初始值时，第一个元素当初始值，从第二个开始遍历；传了 `{}` 或 `[]`，就能用来分组、计数：

```js
['a', 'b', 'a'].reduce((acc, x) => {
  acc[x] = (acc[x] || 0) + 1
  return acc
}, {})   // { a: 2, b: 1 }
```

**`reduce` 不给初始值时，空数组会抛错。** 只有一个元素时，它直接返回那个元素、不调用回调，容易掩盖 bug：

```js
[].reduce((a, b) => a + b)        // TypeError: Reduce of empty array with no initial value
[].reduce((a, b) => a + b, 0)     // 0
```

## 3. 几个容易记错的点

- **`slice` 和 `splice` 名字像，行为相反。** `slice` 只读，返回截取的新数组；`splice` 改原数组，返回被删的部分。
- **`includes` 能找 `NaN`，`indexOf` 不能。** 前者用 SameValueZero 比较，后者用严格相等，`[NaN].indexOf(NaN)` 是 `-1`。
- **空数组上 `every` 返回 `true`，`some` 返回 `false`。** 这是逻辑上的「全称命题为真」，写校验时要注意空数组会直接通过。
- **`map` 保留稀疏数组的空位。** `[1, , 3].map(x => x * 2)` 结果仍是 `[2, , 6]`，回调只跑了两次。
- **`fill` 填的是同一个引用。** `new Array(3).fill([])` 得到三个指向同一个数组的元素，改一个全变。
- **`map`、`filter` 只复制数组本身，不复制元素。** 数组里放对象时，新数组和原数组共享同一批对象，改对象的属性两边都变；要独立副本得自己深拷贝。

## 4. 按用途选

| 想要 | 用 |
| :--- | :--- |
| 遍历、执行副作用 | `forEach` |
| 生成等长新数组 | `map` |
| 筛出一部分 | `filter` |
| 汇总成一个值 | `reduce` |
| 判断有没有 / 是不是全部 | `some` / `every` |
| 找元素或下标 | `find` / `findIndex` |
| 只要一个布尔结果 | `includes` |
| 就地增删改 | `push` / `pop` / `splice` |
| 排序、反转 | `sort` / `reverse` |

需要链式调用时，只用第二组的方法；第一组返回的不是数组，接下去就会报错。
