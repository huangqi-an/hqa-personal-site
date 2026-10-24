import { TOOLTIP_STYLE } from '../styles'

type Placement = 'top' | 'bottom' | 'left' | 'right'

const OFFSET = 8
const VIEWPORT_MARGIN = 8
const SHOW_DELAY = 300

/**
 * <hqa-tooltip content="提示文字" placement="top">
 *   <button>hover 我</button>
 * </hqa-tooltip>
 *
 * 触发源是插槽里的第一个子元素（hover 与聚焦都能触发）；
 * 气泡用 fixed 定位，超出视口时自动翻到对侧并做水平收拢。
 */
export class HqaTooltip extends HTMLElement {
  static observedAttributes = ['content', 'placement']

  private root: ShadowRoot
  private tipEl!: HTMLDivElement
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open' })
    this.root.innerHTML = `
      <style>${TOOLTIP_STYLE}</style>
      <slot></slot>
      <div class="hqa-tooltip" role="tooltip"></div>`
    this.tipEl = this.root.querySelector('.hqa-tooltip')!

    this.addEventListener('mouseenter', () => this.scheduleShow())
    this.addEventListener('mouseleave', () => this.hide())
    this.addEventListener('focusin', () => this.scheduleShow())
    this.addEventListener('focusout', () => this.hide())
    // 气泡是 fixed 定位，锚点滚走它不会跟着走——直接收起最省事
    document.addEventListener('scroll', () => this.hide(), { capture: true, passive: true })
    window.addEventListener('resize', () => this.hide(), { passive: true })
  }

  get placement(): Placement {
    return (this.getAttribute('placement') as Placement) ?? 'top'
  }

  attributeChangedCallback(name: string): void {
    if (name === 'content') this.tipEl.textContent = this.getAttribute('content') ?? ''
  }

  private scheduleShow(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.show(), SHOW_DELAY)
  }

  private show(): void {
    if (!this.tipEl.textContent) return
    this.tipEl.style.visibility = 'hidden'
    this.tipEl.classList.add('is-show')

    // 先渲染再测量，拿到真实宽高后定位
    const anchor = this.getBoundingClientRect()
    const tip = this.tipEl.getBoundingClientRect()
    const { placement } = this
    let top = 0
    let left = 0

    if (placement === 'top' || placement === 'bottom') {
      left = anchor.left + anchor.width / 2 - tip.width / 2
      if (placement === 'top') top = anchor.top - tip.height - OFFSET
      else top = anchor.bottom + OFFSET
      // 上方放不下翻下方（反之亦然）
      if (placement === 'top' && top < VIEWPORT_MARGIN) top = anchor.bottom + OFFSET
      if (placement === 'bottom' && top + tip.height > innerHeight - VIEWPORT_MARGIN) {
        top = anchor.top - tip.height - OFFSET
      }
    } else {
      top = anchor.top + anchor.height / 2 - tip.height / 2
      if (placement === 'left') left = anchor.left - tip.width - OFFSET
      else left = anchor.right + OFFSET
      if (placement === 'left' && left < VIEWPORT_MARGIN) left = anchor.right + OFFSET
      if (placement === 'right' && left + tip.width > innerWidth - VIEWPORT_MARGIN) {
        left = anchor.left - tip.width - OFFSET
      }
    }
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), innerWidth - tip.width - VIEWPORT_MARGIN)
    top = Math.min(Math.max(top, VIEWPORT_MARGIN), innerHeight - tip.height - VIEWPORT_MARGIN)

    this.tipEl.style.top = `${top}px`
    this.tipEl.style.left = `${left}px`
    this.tipEl.style.visibility = ''
  }

  private hide(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.tipEl.classList.remove('is-show')
  }
}

customElements.define('hqa-tooltip', HqaTooltip)
