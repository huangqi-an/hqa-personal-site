import { escapeHtml } from '../base'
import { DIALOG_STYLE } from '../styles'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * <hqa-dialog open title="标题" close-on-esc close-on-overlay>
 *   正文（默认插槽）<button slot="footer">操作</button>
 * </hqa-dialog>
 *
 * open 为 presence 属性；关闭来源（esc / overlay / button）随 close 事件带出。
 * 弹层不搬运 DOM（fixed 定位从任意位置都能盖满视口），代价是若祖先
 * 建立了 transform 类的 containing block 会被锚住——那是极少数布局场景。
 */
export class HqaDialog extends HTMLElement {
  static observedAttributes = ['open', 'title', 'close-on-esc', 'close-on-overlay']

  private root: ShadowRoot
  private wrapper!: HTMLDivElement
  private titleEl!: HTMLDivElement
  private lastFocus: HTMLElement | null = null

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open' })
    this.root.innerHTML = `
      <style>${DIALOG_STYLE}</style>
      <div class="hqa-dialog" part="wrapper">
        <div class="hqa-dialog__overlay" part="overlay"></div>
        <div class="hqa-dialog__panel" role="dialog" aria-modal="true" tabindex="-1">
          <header class="hqa-dialog__header">
            <div class="hqa-dialog__title"></div>
            <button type="button" class="hqa-dialog__close" aria-label="关闭">×</button>
          </header>
          <div class="hqa-dialog__body"><slot></slot></div>
          <div class="hqa-dialog__footer"><slot name="footer"></slot></div>
        </div>
      </div>`
    this.wrapper = this.root.querySelector('.hqa-dialog')!
    this.titleEl = this.root.querySelector('.hqa-dialog__title')!

    this.root.querySelector('.hqa-dialog__close')!.addEventListener('click', () =>
      this.requestClose('button')
    )
    this.root.querySelector('.hqa-dialog__overlay')!.addEventListener('click', () => {
      if (this.closeOnOverlay) this.requestClose('overlay')
    })
    document.addEventListener('keydown', this.onKeydown)
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this.onKeydown)
    if (this.lastFocus) this.unlock()
  }

  get open(): boolean {
    return this.hasAttribute('open')
  }

  get title(): string {
    return this.getAttribute('title') ?? ''
  }

  private get closeOnEsc(): boolean {
    return !this.hasAttribute('close-on-esc') || this.getAttribute('close-on-esc') !== 'false'
  }

  private get closeOnOverlay(): boolean {
    return (
      !this.hasAttribute('close-on-overlay') ||
      this.getAttribute('close-on-overlay') !== 'false'
    )
  }

  private focusables(): HTMLElement[] {
    const inner = [...this.root.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const slotted = [...this.querySelectorAll<HTMLElement>(FOCUSABLE)]
    return [...inner, ...slotted]
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (!this.open) return
    if (e.key === 'Escape' && this.closeOnEsc) {
      e.stopPropagation()
      this.requestClose('esc')
      return
    }
    if (e.key === 'Tab') {
      const list = this.focusables()
      if (list.length === 0) {
        e.preventDefault()
        this.root.querySelector<HTMLElement>('.hqa-dialog__panel')!.focus()
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!active || !this.contains(active)) {
        // 焦点不在弹窗内（含 shadow 层级）时拉回
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && (active === first || active === this)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  requestClose(source: 'esc' | 'overlay' | 'button'): void {
    this.removeAttribute('open')
    this.dispatchEvent(
      new CustomEvent('close', { detail: { source }, bubbles: true, composed: true })
    )
  }

  attributeChangedCallback(name: string): void {
    if (name === 'title') {
      this.titleEl.textContent = this.title || ' '
      this.root
        .querySelector('.hqa-dialog__panel')!
        .setAttribute('aria-label', escapeHtml(this.title))
      return
    }
    if (name !== 'open') return
    const panel = this.root.querySelector<HTMLElement>('.hqa-dialog__panel')!
    if (this.open) {
      this.lastFocus = document.activeElement as HTMLElement | null
      this.wrapper.classList.add('is-open')
      document.documentElement.style.overflow = 'hidden'
      const first = this.focusables()[0]
      ;(first ?? panel).focus()
    } else {
      this.wrapper.classList.remove('is-open')
      this.unlock()
    }
  }

  private unlock(): void {
    document.documentElement.style.overflow = ''
    this.lastFocus?.focus?.()
    this.lastFocus = null
  }
}

customElements.define('hqa-dialog', HqaDialog)
