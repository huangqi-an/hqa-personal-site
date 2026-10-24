import { BaseElement, escapeHtml } from '../base'
import { SWITCH_STYLE } from '../styles'

/**
 * <hqa-switch checked disabled label="开启通知"></hqa-switch>
 * checked 是 presence 属性；切换时派发 change 事件（bubbles + composed，
 * detail.checked 是新值），宿主页面可监听。
 */
export class HqaSwitch extends BaseElement {
  static observedAttributes = ['checked', 'disabled', 'label']

  constructor() {
    super()
    // click 在 shadow 内产生但会冒泡到宿主，监听一次即可，重渲染不影响
    this.addEventListener('click', () => this.toggle())
  }

  get checked(): boolean {
    return this.hasAttribute('checked')
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  get label(): string {
    return this.getAttribute('label') ?? ''
  }

  toggle(): void {
    if (this.disabled) return
    if (this.checked) this.removeAttribute('checked')
    else this.setAttribute('checked', '')
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true
      })
    )
  }

  protected render(): string {
    const label = this.label ? `<span class="hqa-switch__label">${escapeHtml(this.label)}</span>` : ''
    return `<style>${SWITCH_STYLE}</style>
      <button
        type="button"
        class="hqa-switch${this.checked ? ' is-checked' : ''}"
        role="switch"
        aria-checked="${this.checked}"
        aria-label="${escapeHtml(this.label || 'switch')}"
        ${this.disabled ? 'disabled' : ''}
        part="switch"
      >
        <span class="hqa-switch__track"><span class="hqa-switch__thumb"></span></span>
        ${label}
      </button>`
  }
}

customElements.define('hqa-switch', HqaSwitch)
