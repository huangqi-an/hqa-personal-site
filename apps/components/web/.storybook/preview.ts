// 三套框架共用一份设计变量；自定义属性能穿透 Shadow DOM，
// 所以这里在预览文档的 :root 上挂 tokens，shadow root 里的 var(--hqa-*) 直接生效
import '../../shared/tokens.css'

/** @type { import('@storybook/web-components-vite').Preview } */
export default {
  parameters: {
    layout: 'centered'
  }
}
