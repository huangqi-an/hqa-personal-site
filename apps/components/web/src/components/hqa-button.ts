import { BaseElement } from '../base'
import { BUTTON_STYLE } from '../styles'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * <hqa-button variant="primary" size="md" disabled>按钮文字</hqa-button>
 * 文字走默认插槽；点击事件由内部 <button> 透传（click 是 composed 事件）。
 */
export class HqaButton extends BaseElement {
  static observedAttributes = ['variant', 'size', 'disabled']

  get variant(): ButtonVariant {
    return (this.getAttribute('variant') as ButtonVariant) ?? 'primary'
  }

  get size(): ButtonSize {
    return (this.getAttribute('size') as ButtonSize) ?? 'md'
  }

  protected render(): string {
    const disabled = this.hasAttribute('disabled') ? ' disabled' : ''
    return `<style>${BUTTON_STYLE}</style>
      <button class="hqa-btn ${this.variant} ${this.size}"${disabled} part="button"><slot></slot></button>`
  }
}

customElements.define('hqa-button', HqaButton)
