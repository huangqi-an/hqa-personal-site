import { BaseElement, escapeHtml } from '../base'
import { CARD_STYLE } from '../styles'

/**
 * <hqa-card title="卡片标题">正文内容（插槽）</hqa-card>
 * title 属性会拼进模板，转义后再渲染。
 */
export class HqaCard extends BaseElement {
  static observedAttributes = ['title']

  get title(): string {
    return this.getAttribute('title') ?? ''
  }

  protected render(): string {
    return `<style>${CARD_STYLE}</style>
      <div class="hqa-card" part="card">
        <div class="hqa-card__title">${escapeHtml(this.title)}</div>
        <div class="hqa-card__body"><slot></slot></div>
      </div>`
  }
}

customElements.define('hqa-card', HqaCard)
