// 三套框架共用一份设计变量（见 web 包 preview 的说明）
import '../../shared/tokens.css'

/** @type { import('@storybook/vue3-vite').Preview } */
export default {
  parameters: {
    layout: 'centered'
  }
}
