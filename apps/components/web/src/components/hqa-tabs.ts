import { escapeHtml } from '../base'
import { TABS_STYLE } from '../styles'

/**
 * <hqa-tabs>
 *   <hqa-tab label="第一个">内容一</hqa-tab>
 *   <hqa-tab label="第二个">内容二</hqa-tab>
 * </hqa-tabs>
 *
 * tablist 由父组件根据子 <hqa-tab> 的 label 属性生成；
 * 键盘漫游（方向键 / Home / End）遵循 WAI-ARIA 的 tabs 模式。
 */
export class HqaTabs extends HTMLElement {
  private root: ShadowRoot
  private listEl!: HTMLDivElement

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open' })
    this.root.innerHTML = `
      <style>${TABS_STYLE}</style>
      <div class="hqa-tabs__list" role="tablist" part="tablist"></div>
      <div class="hqa-tabs__panel" part="panel"><slot></slot></div>`
    this.listEl = this.root.querySelector('.hqa-tabs__list')!
    this.listEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button')
      if (!btn) return
      this.select(Number(btn.dataset.index))
    })
    this.listEl.addEventListener('keydown', (e) => this.onKeydown(e))
  }

  connectedCallback(): void {
    this.renderList()
    // 子 tab 增删（同一 slot 内）会触发 slotchange，重建 tablist
    this.root.querySelector('slot')!.addEventListener('slotchange', () => this.renderList())
  }

  private tabs(): HqaTab[] {
    return [...this.querySelectorAll('hqa-tab')] as HqaTab[]
  }

  private active = 0

  private renderList(): void {
    const tabs = this.tabs()
    if (this.active >= tabs.length) this.active = 0
    this.listEl.innerHTML = tabs
      .map(
        (tab, i) => `
        <button
          type="button"
          role="tab"
          class="hqa-tabs__tab"
          data-index="${i}"
          aria-selected="${i === this.active}"
          tabindex="${i === this.active ? 0 : -1}"
        >${escapeHtml(tab.label)}</button>`
      )
      .join('')
    this.syncPanels()
  }

  private select(index: number): void {
    if (index === this.active) return
    this.active = index
    this.renderList()
    const label = this.tabs()[index]?.label ?? ''
    this.dispatchEvent(
      new CustomEvent('change', { detail: { index, label }, bubbles: true, composed: true })
    )
  }

  private onKeydown(e: KeyboardEvent): void {
    const count = this.tabs().length
    if (count === 0) return
    let next: number | null = null
    if (e.key === 'ArrowRight') next = (this.active + 1) % count
    else if (e.key === 'ArrowLeft') next = (this.active - 1 + count) % count
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = count - 1
    if (next === null) return
    e.preventDefault()
    this.select(next)
    this.listEl.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus()
  }

  private syncPanels(): void {
    this.tabs().forEach((tab, i) => {
      if (i === this.active) tab.removeAttribute('hidden')
      else tab.setAttribute('hidden', '')
    })
  }
}

/**
 * 单个标签页：只负责渲染面板内容与隐藏状态，选中逻辑全在 <hqa-tabs>。
 */
export class HqaTab extends HTMLElement {
  static observedAttributes = ['label']

  get label(): string {
    return this.getAttribute('label') ?? ''
  }

  connectedCallback(): void {
    this.role = 'tabpanel'
  }

  attributeChangedCallback(): void {
    // label 变化时让父组件重建 tablist
    this.parentElement?.dispatchEvent(new Event('hqa-tab-label-change', { bubbles: true }))
  }
}

customElements.define('hqa-tabs', HqaTabs)
customElements.define('hqa-tab', HqaTab)
