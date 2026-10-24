import type { APIRoute } from 'astro'
import { clientIp, deepseek, hasKey, isMemeKey, rateAllow, systemPrompt } from './_lib'

// 聊天：POST { messages:[{role,content}...] } → SSE 流式回复。
// 协议与 dafeiyu 包约定一致：data:{"d":增量} | {"e":错误} | [DONE]
export const prerender = false

const MAX_MESSAGES = 10 // 5 轮问答
const MAX_CHARS = 500

const errJson = (status: number, message: string) =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })

interface Incoming {
  messages?: Array<{ role?: unknown; content?: unknown }>
}

export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request)

  let body: Incoming
  try {
    body = (await request.json()) as Incoming
  } catch {
    return errJson(400, '请求体不是合法 JSON')
  }

  const raw = body?.messages
  if (!Array.isArray(raw) || raw.length === 0) return errJson(400, 'messages 不能为空')
  if (raw.length > MAX_MESSAGES) return errJson(400, `对话历史最多 ${MAX_MESSAGES} 条`)

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const m of raw) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) {
      return errJson(400, 'role 只能是 user 或 assistant')
    }
    if (typeof m.content !== 'string' || !m.content.trim()) {
      return errJson(400, 'content 必须是非空字符串')
    }
    if (m.content.length > MAX_CHARS) {
      return errJson(400, `单条消息超过 ${MAX_CHARS} 字`)
    }
    messages.push({ role: m.role, content: m.content })
  }

  if (!rateAllow(ip, 'chat', 20, 10 * 60_000)) {
    return errJson(429, '聊得太快啦，歇一会儿再试')
  }
  if (!hasKey()) {
    return errJson(503, '站长还没给我接上大脑（未配置 DEEPSEEK_API_KEY），先陪我双击玩玩')
  }

  let upstream: Response
  try {
    upstream = await deepseek(
      {
        messages: [{ role: 'system', content: systemPrompt('chat') }, ...messages],
        max_tokens: 800,
        temperature: 0.8,
        stream: true
      },
      60_000
    )
  } catch {
    return errJson(504, '上游超时了，稍后再试')
  }
  if (!upstream.ok || !upstream.body) {
    return errJson(502, '上游模型没响应，稍后再试')
  }

  // 把上游 OpenAI 风格 SSE 改写成 {d}/{i}/{e} 协议下发
  const upstreamBody = upstream.body
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      // 开头标记 [img:键名]：模型选表情包的方式。缓冲回复开头直到能判定——
      // 不是 [ 开头 → 无标记直接透传；凑齐 ] → 提取键名发 {"i":…}（无效则按正文吐回）；超长 → 证伪
      let head = ''
      let markerDone = false
      const feed = (chunk: string): void => {
        if (!chunk) return
        if (markerDone) {
          send({ d: chunk })
          return
        }
        head += chunk
        if (!head.startsWith('[')) {
          markerDone = true
          send({ d: head })
          return
        }
        const close = head.indexOf(']')
        if (close > 0) {
          markerDone = true
          const m = /^\[img:([a-z0-9-]{1,40})\]/.exec(head)
          if (m && isMemeKey(m[1])) send({ i: m[1] })
          else send({ d: head })
          return
        }
        if (head.length > 48) {
          markerDone = true
          send({ d: head })
        }
        // 其余情况继续缓冲，不透传
      }
      const reader = upstreamBody.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let doneSent = false
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          let idx: number
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, idx)
            buf = buf.slice(idx + 2)
            for (const line of block.split('\n')) {
              if (!line.startsWith('data:')) continue
              const payload = line.slice(5).trim()
              if (payload === '[DONE]') continue // 统一在流结束时补发
              try {
                const evt = JSON.parse(payload)
                const delta = evt?.choices?.[0]?.delta?.content
                if (typeof delta === 'string' && delta) feed(delta)
              } catch {
                /* 忽略解析不了的行（如 keep-alive 注释） */
              }
            }
          }
        }
        if (!doneSent) {
          doneSent = true
          // 流结束还在缓冲开头（没凑齐标记）→ 按正文吐回
          if (!markerDone && head) send({ d: head })
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        }
        controller.close()
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ e: '连接中断了' })}\n\n`))
        controller.close()
      }
    },
    cancel() {
      upstreamBody.cancel().catch(() => {})
    }
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      // 关键：让 nginx 别缓冲这个响应，SSE 才能逐块下发（改 nginx 配置的替代方案）
      'X-Accel-Buffering': 'no'
    }
  })
}
