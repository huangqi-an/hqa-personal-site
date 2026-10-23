---
title: 'ES6 特性'
publishDate: 2023-10-26
description: 'ES6 也叫 ES2015，是 JavaScript 历史上变化最大的一次语言升级。它补齐了大型工程所需的多个语言能力。'
tags:
  - javascript
language: '中文'
draft: false
---

## 1. 变量：let / const

`var` 只有函数作用域，会变量提升，还能重复声明。`let` 和 `const` 补上了块级作用域。

```js
console.log(a)   // undefined，var 声明被提升，值是空的
var a = 1

console.log(b)   // ReferenceError: Cannot access 'b' before initialization
let b = 1
```

`let` 也有提升，但提升后到声明前这一段叫**暂时性死区**，访问直接报错，而不是给 `undefined`。

**`const` 锁的是绑定，不是内容。**

```js
const obj = { n: 1 }
obj.n = 2        // 可以，改的是属性
obj = {}         // TypeError: Assignment to constant variable
```

**循环里的闭包**是 `var` 最典型的坑：

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i))   // 3 3 3
}

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j))   // 0 1 2
}
```

`var` 只有一个 `i`，三个回调共享它，循环结束时是 3；`let` 每轮生成一个新的绑定。

## 2. 函数：箭头函数、默认参数、剩余参数、生成器

**箭头函数没有自己的 `this`**，它取定义时外层的 `this`：

```js
const obj = {
  n: 1,
  inc() {
    setTimeout(() => console.log(this.n), 0)          // 1，this 是 obj
    setTimeout(function () { console.log(this.n) }, 0) // undefined 或报错，this 不是 obj
  }
}
```

普通函数里的 `this` 由调用方式决定，这里变成了全局对象（严格模式下是 `undefined`）。所以回调里要用外层 `this` 时，箭头函数几乎总是对的。

箭头函数另外两个限制：**不能 `new`**，**没有 `arguments`**。

**默认参数只在 `undefined` 时生效**，`null` 不会触发：

```js
function f(a = 1, b = 2) { return [a, b] }

f()                // [1, 2]
f(undefined, 5)    // [1, 5]
f(null)            // [null, 2]
```

**剩余参数是真数组**，能直接用 `reduce`，`arguments` 是类数组：

```js
function sum(...nums) { return nums.reduce((a, b) => a + b, 0) }

sum(1, 2, 3)       // 6
```

剩余参数只能放最后，`function f(...a, b)` 是语法错误。

**生成器用 `function*` 声明，`yield` 暂停，`next()` 恢复。**

```js
function* gen() {
  const x = yield 1
  console.log(x)        // 'a'，next 传进来的值成为上一个 yield 的结果
  yield 2
}

const it = gen()
it.next()               // { value: 1, done: false }
it.next('a')            // 打印 'a'，返回 { value: 2, done: false }
it.next()               // { value: undefined, done: true }
```

**`next()` 的参数会成为上一个 `yield` 表达式的返回值。** 第一次调用传参没意义，那时还没有 `yield` 在等。

生成器自带迭代器，可以直接 `for...of` 或展开：

```js
function* range(n) {
  for (let i = 0; i < n; i++) yield i
}

[...range(3)]           // [0, 1, 2]
```

适合惰性序列、分批产出，也用来实现自定义迭代器。

## 3. 数据：Symbol、Map 与 Set

**`Symbol` 是原始类型，每次创建都是唯一值。**

```js
const a = Symbol('id')
const b = Symbol('id')

a === b                 // false，描述相同也是两个值
typeof a                // 'symbol'
```

**用来做对象键，避免和别人的字段重名。** 这种键不会被 `Object.keys`、`for...in`、`JSON.stringify` 取到：

```js
const key = Symbol('k')
const o = { [key]: 1, normal: 2 }

o[key]                  // 1
Object.keys(o)          // ['normal']
JSON.stringify(o)       // '{"normal":2}'
```

**`Symbol.for` 走全局注册表**，同样的字符串拿到同一个值，适合跨模块共享：

```js
Symbol.for('x') === Symbol.for('x')   // true
Symbol('x') === Symbol('x')           // false
```

内置的 `Symbol.iterator` 就是 `for...of` 调用的那个键，最后一节会用到。

**`Set` 用来去重，元素唯一。**

```js
const s = new Set([1, 2, 2, 3])

s.size             // 3
s.has(2)           // true
console.log([...s]) // [1, 2, 3]
```

判断唯一性用的是 SameValueZero，`NaN` 和 `NaN` 算同一个。

**`Map` 的键可以是任意类型**，对象也行，`Object` 的键只能是字符串或 Symbol：

```js
const m = new Map()
m.set('a', 1).set(1, 2).set({}, 3)

m.get('a')         // 1
m.get(1)           // 2，数字 1 和字符串 'a' 是两个键
m.size             // 3
```

遍历按插入顺序，`forEach` 和 `for...of` 都能走。

## 4. 解构、展开、简写、模板字符串

**解构可以带默认值和重命名**，默认值同样只在 `undefined` 时生效：

```js
const { a, b: renamed, c = 3 } = { a: 1, b: 2 }

a                  // 1
renamed            // 2，把 b 重命名为 renamed
c                  // 3，原对象没有 c，用默认值

const [x, , y] = [1, 2, 3]
x                  // 1
y                  // 3，中间空一位跳过
```

**展开是浅拷贝。** 顶层属性复制，嵌套对象仍然共享引用：

```js
const o1 = { a: 1, nested: { n: 1 } }
const o2 = { ...o1, b: 2 }

o2.nested.n = 99
console.log(o1.nested.n)   // 99，嵌套对象还是同一个
```

**数组展开**可以替代 `apply`：

```js
Math.max(...[1, 5, 3])     // 5
[0, ...[1, 2], 3]          // [0, 1, 2, 3]
```

**属性简写**在变量名和键名相同时省掉重复：

```js
const name = 'a'
const age = 1
const o = { name, age, say() { return this.name } }

o.name             // 'a'
o.say()            // 'a'
```

**模板字符串**支持插值和换行，插值里的表达式会求值：

```js
const n = 2
`结果是 ${n + 1}`    // '结果是 3'
```

## 5. 类：class 与继承

`class` 是原型继承的语法糖，写法变了，底层机制没变。

```js
class Animal {
  constructor(name) {
    this.name = name
  }

  speak() {
    return `${this.name} makes a sound`
  }

  static create(name) {
    return new Animal(name)
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name)              // 必须先调用，否则 this 不可用
  }

  speak() {
    return `${super.speak()}，汪汪`
  }
}

new Dog('a').speak()         // 'a makes a sound，汪汪'
Animal.create('b').speak()   // 'b makes a sound'
```

**与构造函数写法不同的两点：**

- `class` 不会提升，声明前使用报 `ReferenceError`。
- 原型上的方法不可枚举，`for...in` 遍历不到。

## 6. 对象拦截：Proxy 与 Reflect

**`Proxy` 包住一个对象，拦截读写等操作。**

```js
const target = { n: 1 }

const p = new Proxy(target, {
  get(t, key) {
    return key in t ? t[key] : 0
  },
  set(t, key, value) {
    if (key === 'n' && typeof value !== 'number') {
      throw new TypeError('n 必须是数字')
    }
    t[key] = value
    return true
  }
})

p.n                     // 1
p.missing               // 0，读不到时给默认值
p.n = 'x'               // TypeError: n 必须是数字
```

**`Reflect` 是这些操作的函数版**，行为与直接操作一致，配合 Proxy 用可以少写判断：

```js
const p = new Proxy({}, {
  get(t, key, receiver) {
    return Reflect.get(t, key, receiver)
  }
})
```

常见用途是默认值、参数校验、访问日志。Vue 3 的响应式就是这么实现的。

**注意：** `Proxy` 只能拦住经过代理对象的操作，直接改 `target` 不受影响。

## 7. 异步：Promise

Promise 有三个状态：`pending`、`fulfilled`、`rejected`，一旦确定不再改变。

```js
Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => { throw new Error('出错了') })
  .then(() => console.log('不会执行'))
  .catch((e) => e.message)     // '出错了'
  .finally(() => console.log('结束'))
```

**错误会跳过中间的 `then`，直达最近的 `catch`。** 每个 `then` 返回的都是新 Promise，所以能一路链下去。

**三个组合方法：**

| 方法 | 行为 |
| :--- | :--- |
| `Promise.all` | 全部成功才成功，有一个失败立刻失败 |
| `Promise.allSettled` | 等全部结束，不管成功失败，返回每个的结果 |
| `Promise.race` | 第一个结束的（成功或失败）决定结果 |

## 8. 模块：import 与 export

```js
// math.js
export const add = (a, b) => a + b
export default function mul(a, b) { return a * b }

// main.js
import mul, { add } from './math.js'

add(1, 2)     // 3
mul(2, 3)     // 6
```

**默认导出只能有一个，命名导出可以有多个。** 导入时默认导出随意命名，命名导出必须和导出名一致，或者用 `as` 改名。

**导出的是活绑定，不是值的快照：**

```js
// counter.js
export let count = 0
export function inc() { count++ }

// main.js
import { count, inc } from './counter.js'
console.log(count)   // 0
inc()
console.log(count)   // 1
```

模块顶层没有 `this`（是 `undefined`），也没有变量提升到全局。

## 9. 遍历：for...of 与迭代器

`for...of` 走的是迭代器协议，取的是**值**；`for...in` 取的是**键**，还会带上原型链上的可枚举属性。

```js
for (const v of [10, 20]) console.log(v)      // 10 20
for (const k in { a: 1 }) console.log(k)      // 'a'

const m = new Map([['a', 1]])
for (const [k, v] of m) console.log(k, v)     // 'a' 1
```

**数组、字符串、Map、Set 都能 `for...of`，普通对象不行**——它没有 `Symbol.iterator`，要遍历用 `Object.keys` / `values` / `entries`：

```js
for (const [k, v] of Object.entries({ a: 1 })) {
  console.log(k, v)    // 'a' 1
}
```
