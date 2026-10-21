import type { APIRoute } from 'astro'

// 健康检查端点：compose 的 healthcheck 打这个地址，nginx 那边也有一份自己的。
//
// 显式 prerender = false —— 让它每次请求都真的走一遍 SSR 管线。
// 如果探的是构建期生成的静态文件，渲染层坏了、数据库连不上，探针照样是 200，
// 那种健康检查只能证明"容器还在"，证明不了"服务能用"。
export const prerender = false

export const GET: APIRoute = () =>
  new Response('ok\n', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // 健康检查不要缓存，否则反代或浏览器可能复用旧结果
      'cache-control': 'no-store'
    }
  })
