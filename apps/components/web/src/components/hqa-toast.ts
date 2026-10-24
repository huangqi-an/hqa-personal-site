import { TOAST_STYLE } from '../styles'

export type ToastType = 'info' | 'success' | 'error'
export interface ToastOptions {
  type?: ToastType
  /** 停留毫秒数，默认 3000；传 0 表示不自动消失 */
  duration?: number
}

const MAX_STACK = 5

/**
 * 轻提示宿主：固定在视口顶部居中，堆叠展示。一条 HTML 里放一个即可
 * （重复放会各自为政）。一般不直接使用，走全局 toast() 函数。
 */
export class HqaToastHost extends HTMLElement {
  private listEl: HTMLDivElement

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <style>${TOAST_STYLE}</style>
      <div class="hqa-toast-host" part="host" role="status" aria-live="polite"></div>`
    this.listEl = root.querySelector('.hqa-toast-host')!
  }

  show(message: string, options: ToastOptions = {}): void {
    const type = options.type ?? 'info'
    const duration = options.duration ?? 3000

    const item = document.createElement('div')
    item.className = `hqa-toast hqa-toast--${type}`

    const dot = document.createElement('span')
    dot.className = 'hqa-toast__dot'
    const msg = document.createElement('span')
    msg.className = 'hqa-toast__msg'
    // 只收纯文本，不做 innerHTML，杜绝注入
    msg.textContent = message
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'hqa-toast__close'
    close.setAttribute('aria-label', '关闭提示')
    close.textContent = '×'

    item.append(dot, msg, close)
    this.listEl.append(item)
    while (this.listEl.children.length > MAX_STACK) {
      this.listEl.firstElementChild?.remove()
    }

    const dismiss = () => {
      if (!item.isConnected) return
      item.classList.add('is-leaving')
      setTimeout(() => item.remove(), 220)
    }
    close.addEventListener('click', dismiss)
    if (duration > 0) setTimeout(dismiss, duration)
  }
}

customElements.define('hqa-toast-host', HqaToastHost)

/**
 * 全局命令式 API：toast('已保存') / toast('失败', { type: 'error' })。
 * 宿主不存在时懒创建一个挂到 body 末尾。
 */
export function toast(message: string, options?: ToastOptions): void {
  let host = document.querySelector<HqaToastHost>('hqa-toast-host')
  if (!host) {
    host = document.createElement('hqa-toast-host') as HqaToastHost
    document.body.append(host)
  }
  host.show(message, options)
}
