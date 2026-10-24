/**
 * 零依赖 Custom Element 基类：开 Shadow DOM，属性变化时整棵重渲染。
 * 刻意保持最小——组件简单到不值得引入 Lit 这类运行时。
 */

/** 属性值会拼进 innerHTML，转义防注入 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export abstract class BaseElement extends HTMLElement {
  static readonly observedAttributes: string[] = []

  protected readonly root: ShadowRoot

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open' })
    this.root.innerHTML = this.render()
  }

  /**
   * 属性增删改后整棵重渲染。光 DOM（slot 内容）属于宿主元素，
   * 重建 shadow 树不会动它；升级时对初始属性会多渲染一次，无害。
   */
  attributeChangedCallback(): void {
    this.root.innerHTML = this.render()
  }

  protected abstract render(): string
}
