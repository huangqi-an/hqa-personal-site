/**
 * 大肥鱼后端共用：人设拼装、DeepSeek 调用、限流。
 * 文件名下划线开头——Astro 的 pages 路由忽略 `_` 前缀文件，不会被暴露成端点。
 */

/** 人设正文（名字与时间背景在 systemPrompt 里自动追加，别写在这里） */
const PERSONA = `你是个人网站「黄其安的个人站」的吉祥物"大肥鱼"——一条 Q 版蓝发小女仆，长着鲸鱼尾巴，住在网站右下角陪访客看博客。说话自然口语、简短可爱、带点俏皮，说人话不啰嗦，不解释自己是 AI，不提模型和程序。`

/** 聊天可用的站点知识 */
const SITE_FACTS = `站长黄其安是前端开发者。站内：博客在 /blog（写过 ES6、数组方法、浏览器缓存、事件循环等），文档在 /docs（Docker、Nginx 系列），项目在 /projects，关于页在 /about。站点跑在一台 2 核 2G 的小服务器上。`

/** 时间背景：日期/星期/时段/工作日——每次现算，让台词能贴合「周五下午」这种语境 */
export function timeContext(now = new Date()): string {
  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
  const h = now.getHours()
  const period = h < 5 ? '深夜' : h < 9 ? '清晨' : h < 12 ? '上午' : h < 14 ? '中午' : h < 18 ? '下午' : h < 23 ? '晚上' : '深夜'
  const weekend = now.getDay() === 0 || now.getDay() === 6
  return `现在是${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${week} ${period}（${weekend ? '周末' : '工作日'}）。`
}

/**
 * 表情包清单：键名 = /pet/assets/memes/<键名>.png（素材随 dafeiyu 产物同步）。
 * whisper 随机抽一张让台词配图；chat 从前 CHAT_MEME_CAP 张按语境选。
 */
const MEMES: Record<string, string> = {
  'cute': '标准正面卖萌立绘',
  'awesome-whale': '竖大拇指眨眼点赞',
  'oh-whale': '死鱼眼敷衍地说"哦"',
  'stress': '冒汗摊手喊压力好大',
  'dead': '翻肚皮躺平灵魂出窍',
  'deep-sleep': '趴着呼呼大睡冒Zzz',
  'slow-burn': '死鱼眼吐槽想得慢、烧token',
  'full-belly': '侧躺拍肚子说吃饱了',
  'rice-fish': '躺平扒白饭摆烂',
  'scold-him': '气愤指着前方要替你骂人',
  'one-bowl': '抱着超大碗来讨饭',
  'big-coming': '举喇叭大喊有大事要来'
}
const CHAT_MEME_CAP = 12

export function randomMemeKey(): string {
  const keys = Object.keys(MEMES)
  return keys[Math.floor(Math.random() * keys.length)]
}

export function memeDesc(key: string): string {
  return MEMES[key] ?? ''
}

export function memeListForChat(): string {
  return Object.entries(MEMES)
    .slice(0, CHAT_MEME_CAP)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

export function isMemeKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(MEMES, key)
}

/** system 提示词唯一拼装点：人设 + 名字 + 时间背景（+ 页面上下文 + 表情包 + 场景指令） */
export function systemPrompt(
  kind: 'whisper' | 'chat',
  page?: { title?: string; path?: string },
  memeDescription?: string
): string {
  const base = `${PERSONA}\n你的名字是"大肥鱼"。\n${timeContext()}\n${SITE_FACTS}`
  if (kind === 'whisper') {
    // 页面感知：客户端带 title/path 时注入，碎碎念能就着访客正在看的内容说
    let pageLine = ''
    if (page && (page.title || page.path)) {
      const t = page.title ? `《${page.title}》` : ''
      const p = page.path ? `（路径 ${page.path}）` : ''
      pageLine = `\n访客当前所在页面：${t}${p}。碎碎念可以自然地带一句相关内容，不相关就别硬凑。`
    }
    const memeLine = memeDescription
      ? `\n这次碎碎念会配一张表情包：${memeDescription}。台词要配合这张图。`
      : ''
    return `${base}${pageLine}${memeLine}\n现在随口碎碎念一句话：20 字以内，贴合时间背景，不要堆问候语。只输出这句话本身。`
  }
  return `${base}\n正在和网站访客聊天，回复保持简短（一般两三句以内），可以聊技术、站内内容、摸鱼日常。\n可用表情包（键名: 内容）：\n${memeListForChat()}\n如果想配一张表情包，把 [img:键名] 放在回复的最开头，只能从上面选；不合适就不配。`
}

// ── DeepSeek（OpenAI 兼容接口）────────────────────────────────

const DS_URL = 'https://api.deepseek.com/chat/completions'
// 2026-10 官方 API 只剩 deepseek-flash / deepseek-v4-pro 两个模型名（deepseek-chat 已废弃）。
// flash 是官方推荐默认，输出 $0.6~1.2/百万 token，比 pro 便宜 3 倍，宠物场景够用
const DS_MODEL = 'deepseek-flash'

/**
 * 密钥只在服务端读取（请求时现取，不进构建产物）。
 * 绝不能用 import.meta.env——那是构建期静态替换，会把 key 烧进公开可下载的 dist。
 */
export function hasKey(): boolean {
  const k = process.env.DEEPSEEK_API_KEY
  return !!k && k !== '' && k !== 'change-me'
}

export interface DsMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function deepseek(
  body: { messages: DsMessage[]; max_tokens: number; temperature: number; stream?: boolean },
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(DS_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DS_MODEL,
        // flash 默认开启思考模式（thinking.type 默认 enabled）：碎碎念和闲聊都不需要，
        // 先思考再回答会拖慢首响应、思考 token 还按输出计费，显式关掉
        thinking: { type: 'disabled' },
        ...body
      }),
      signal: ctrl.signal
    })
  } finally {
    clearTimeout(timer)
  }
}

// ── 限流（单实例内存态；容器重启清零，个人站可接受）──────────

const buckets = new Map<string, { n: number; reset: number }>()
let daily = { date: '', n: 0 }
const DAILY_CAP = 1000

/**
 * 固定窗口计数。`key` 区分端点（whisper/chat），返回 false 表示超限。
 * 另有全局日上限兜底费用：所有端点合计 DAILY_CAP 次/天。
 */
export function rateAllow(ip: string, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)
  if (daily.date !== today) {
    daily = { date: today, n: 0 }
    if (buckets.size > 5000) buckets.clear() // 顺手防泄漏
  }
  if (daily.n >= DAILY_CAP) return false

  const k = `${key}:${ip}`
  const b = buckets.get(k)
  if (!b || now > b.reset) {
    buckets.set(k, { n: 1, reset: now + windowMs })
    daily.n++
    return true
  }
  if (b.n >= limit) return false
  b.n++
  daily.n++
  return true
}

/** nginx 反代场景下取真实 IP（本站入口层必带这两个头之一） */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// ── 无 key / 失败时的本地台词兜底（体验不断流）───────────────

const FALLBACK_LINES = [
  '（大肥鱼暂时没接上大脑，先本地陪聊）',
  '今天也在右下角值班。',
  '咕噜咕噜～',
  '要不要去看看最新的博客？',
  '摸鱼要适度哦。',
  '慢慢来，比较快。',
  '深海信号一般，凑合听。',
  '页面加载得还顺滑吗？'
]

export function localLine(): string {
  return FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)]
}
