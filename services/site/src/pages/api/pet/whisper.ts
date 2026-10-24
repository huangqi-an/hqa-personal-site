import type { APIRoute } from 'astro'
import { clientIp, deepseek, hasKey, localLine, rateAllow, systemPrompt } from './_lib'

// 碎碎念：GET → { line, source }。任何失败/超限都降级本地台词，宠物体验不断流。
export const prerender = false

const json = (obj: unknown) =>
  new Response(JSON.stringify(obj), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })

export const GET: APIRoute = async ({ request }) => {
  const ip = clientIp(request)
  // 超限也回 200 + 本地台词：不再打 DeepSeek，但宠物照常说得上话
  if (!rateAllow(ip, 'whisper', 6, 10 * 60_000)) {
    return json({ line: localLine(), source: 'local' })
  }
  if (!hasKey()) {
    return json({ line: localLine(), source: 'local' })
  }
  try {
    const res = await deepseek(
      {
        messages: [
          { role: 'system', content: systemPrompt('whisper') },
          { role: 'user', content: '碎碎念一句' }
        ],
        max_tokens: 60,
        temperature: 1.3
      },
      10_000
    )
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const data = await res.json()
    let line = String(data?.choices?.[0]?.message?.content ?? '')
      .trim()
      // 模型爱加引号/书名号装饰，剥掉
      .replace(/^["「『“]+|["」』”]+$/g, '')
      .replace(/\s+/g, ' ')
    if (line) return json({ line: line.slice(0, 120), source: 'deepseek' })
    throw new Error('empty content')
  } catch {
    return json({ line: localLine(), source: 'local' })
  }
}
