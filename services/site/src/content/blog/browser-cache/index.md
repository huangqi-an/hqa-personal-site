---
title: '浏览器缓存'
publishDate: 2023-09-28
description: '强缓存为什么不发请求，协商缓存为什么只回 304：把 Cache-Control 指令、ETag 与 Last-Modified 串成一条判定链。'
tags:
  - http
  - browser
  - performance
language: '中文'
draft: false
---

改了一个按钮的文案，部署，刷新，还是旧的那句。强制刷新就好了，下次上线又有人来问一遍。

这类问题多半卡在同一处：浏览器手里留着一份副本，它要先判断用不用。判断规则写在响应头里，服务端定，浏览器照做。

常见的组合就几种。`max-age=31536000, immutable` 是一年不管；`no-store` 是一个字都不留；`no-cache` 是留着，但每次用之前问一句。一次请求会走到三条路之一：没有副本，完整下载；副本还新，直接用；副本过期，问一句。

![浏览器的缓存判定：新鲜则直接使用，过期则发条件请求，304 复用本地副本](./cache-flow.svg)

## 副本还新不新

缓存一份响应时，会顺手记下它的年龄和保质期。年龄从响应生成的 `Date` 算起，保质期来自 `max-age`。

响应头是 `Date: 10:00:00`、`max-age=600`，浏览器 10:04 拿到，年龄 240 秒，还剩 360 秒。中间隔一层缓存，它返回 `Age: 300`，到手只剩 300 秒。

年龄小于保质期，直接用，一个请求都不发。Network 面板里显示 `200 (from disk cache)`，耗时 0ms，点进去没有请求头也没有响应头。那个 200 是面板为了统一格式画出来的，服务端没参与。

没有 `max-age` 也没有 `Expires`，但有 `Last-Modified` 时，浏览器会自己估一个保质期。Chrome 和 Firefox 的做法是取 `Date` 减去 `Last-Modified` 的 10%。这是实现惯例，规范只允许估，没规定比例。不想被估就显式写 `max-age`。

## 过期之后

过期不等于删除。副本还在，只是到了该问一句的时候。

问的方式是条件请求，带 `If-None-Match` 或 `If-Modified-Since`，分别对应上次响应里的 `ETag` 和 `Last-Modified`。两个都带时，服务端只看 `If-None-Match`。

```http
GET /index.html HTTP/1.1
Host: example.com
If-None-Match: "d4e5f6"
If-Modified-Since: Wed, 27 Sep 2023 10:00:00 GMT

HTTP/1.1 304 Not Modified
Cache-Control: no-cache
ETag: "d4e5f6"
Date: Wed, 27 Sep 2023 12:30:00 GMT
```

304 没有 body。浏览器拿它做三件事：用本地副本、拿 304 的头部更新已存的那份（包括新的 `Date`）、重新算保质期。`ETag` 变了就回 200 和新内容，走另一条路。

省下来的是传输，不是往返。一份 48KB 的 HTML，200 要把 body 传完，304 只有头部，几百字节。网速慢的时候差别明显，本机测试反而看不出来。

`ETag` 和 `Last-Modified` 的区别在两处。时间只到秒，同一秒里改两次，修改时间没变，服务端会错误地回 304。时间也不代表内容，拷贝、回滚之后时间就乱了。所以能生成 `ETag` 时优先用它。

静态文件服务器常常只给时间戳。Nginx 默认发的 `ETag` 是修改时间和文件大小拼出来的，不是内容哈希，出问题的概率和时间戳一样。内容变更不频繁、同一秒内不会被改两次时，这么用也没事。

「强缓存」「协商缓存」是中文社区的叫法，规范里只有 freshness 和 validation。前者指保质期内直接用，后者指过期后问一句。概念没问题，搜规范原文时搜不到这两个词。

## 一个 URL 存不下

第一次请求没什么可判断的：发出去，拿回 200 和 body，存下来。存的时候除了 body，还记下 URL、响应头和过期时间。

缓存按 key 找，key 默认是 URL。同一个地址有两种内容时，得靠 `Vary` 把它们分开。

```http
Vary: Accept-Encoding
```

意思是：这个 URL 下，按 `Accept-Encoding` 的值分别存一份。漏了它，服务端给 A 返回 br 压缩的内容，缓存可能转给不支持 br 的客户端，页面直接乱码。`Vary: *` 等于谁都不能复用，字段列多了命中率会掉。

谁能存是另一组。`public` 允许 CDN 和代理存，`private` 只允许浏览器存，`s-maxage` 只对 CDN 代理生效，优先于 `max-age`，还隐含 `proxy-revalidate`。

`s-maxage` 管不到浏览器自己那份。想让两端时长不一样才需要它。经过 CDN 的响应，浏览器看到的 `max-age` 经常变短。`Age` 已经有值，保质期被扣掉了一段。

## 指令各自管哪一段

这些指令回答的是四个不同问题。

| 指令 | 回答 | 一句话 |
|---|---|---|
| `no-store` | 能不能存 | 完全不存，内存和磁盘都不留 |
| `no-cache` | 能不能存 | 可以存，每次复用前必须校验 |
| `max-age=600` | 存多久 | 600 秒内算新鲜 |
| `s-maxage=600` | 存多久（共享缓存） | 只对 CDN 代理生效，优先于 `max-age` |
| `must-revalidate` | 过期后 | 禁止用旧副本，必须校验成功 |
| `stale-while-revalidate=60` | 过期后 | 过期后 60 秒内先给旧副本，同时后台校验 |
| `immutable` | 过期前 | 保质期内刷新也不发条件请求 |
| `public` / `private` | 谁能存 | 共享缓存 / 只有浏览器 |

`no-store` 和 `no-cache` 经常被当成一回事。前者不存，后者存下来但每次用之前要问。把 `no-cache` 说成不缓存，是最常见的错。

`must-revalidate` 和 `stale-while-revalidate` 方向相反。一个禁止用旧副本，一个允许先给旧的、后台再拉新的。后者适合商品列表、文章摘要这类旧一点也能看的内容，不适合库存和余额。

`immutable` 不延长保质期。保质期内用户按刷新，普通资源会带 `If-None-Match` 问一句，回 304，内容一样，但多一次往返；`immutable` 省的就是这一次。所以它得配足够长的 `max-age`，也只对文件名带指纹的资源成立。

```http
GET /assets/app.a1b2c3.js HTTP/1.1
Host: example.com
Accept-Encoding: gzip, br

HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
ETag: "a1b2c3"
Vary: Accept-Encoding
Content-Encoding: br
Content-Length: 48213
```

一年有效期敢这么给，前提是文件名里有内容指纹。内容一变文件名就变，旧的这份永远不会被覆盖。

第二次访问同一地址，没有报文可看。请求在发出之前就被拦下了，面板显示 `200 (from disk cache)`，那个 200 是合成的。

## 三类资源

策略不是给网站定的，是给一类 URL 定的。

| 资源 | 例子 | 建议 | 理由 |
|---|---|---|---|
| HTML 入口 | `/index.html` | `no-cache` | 每次校验，否则新版本发不出去 |
| 带指纹的静态资源 | `/assets/app.a1b2c3.js` | `max-age=31536000, immutable` | 内容变则文件名变，旧文件可以一直留着 |
| 接口数据 | `/api/posts` | `no-store` 或很短的 `max-age` | 时效性强，策略要显式写 |

HTML 用 `no-cache` 而不是 `no-store`，是因为前者还能走条件请求，没变只传头部；后者每次都要重新下载。

为什么不给 HTML 也加一年？HTML 是唯一能把新版本推给用户的入口。它被长期缓存，用户会一直打开旧页面，旧页面调用的接口可能已经改过结构，表现是别人都好了，只有他报错。

接口这一类容易被漏掉。不少接口没有显式 `Cache-Control`，GET 响应又带 `Last-Modified`，浏览器可能按启发式规则存一份，数据改了、刷新没变。写 `no-store` 比事后排查快。

## 几条容易记反的

`no-cache` 允许存储，只是每次复用前要校验。真正不存的是 `no-store`。

`immutable` 不延长保质期，只省掉保质期内的条件请求。

`max-age=3600` 不等于一小时后过期。时间从 `Date` 算，经过共享缓存还要加 `Age`，到手可能只剩几分钟。

304 只说明校验器没变。弱校验（`W/"x"`）下语义等价就回 304，字节可能完全不同。
