import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit-html'

import { toast } from '../components/hqa-toast'
import '../components/hqa-toast'
import '../components/hqa-button'

const meta = {
  title: '组件/轻提示',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '命令式 API：`toast(\'已保存\')`。宿主 `<hqa-toast-host>` 由全局函数懒创建并挂到 body，' +
          '最多堆叠 5 条，3 秒自动消失（`duration: 0` 可常驻）。只收纯文本，不渲染 HTML。'
      }
    }
  },
  render: () => html`
    <div style="display: flex; gap: 12px;">
      <hqa-button @click=${() => toast('这是一条普通提示')}>普通</hqa-button>
      <hqa-button variant="secondary" @click=${() => toast('已保存', { type: 'success' })}>
        成功
      </hqa-button>
      <hqa-button variant="ghost" @click=${() => toast('保存失败，请重试', { type: 'error' })}>
        失败
      </hqa-button>
      <hqa-button variant="secondary" @click=${() => toast('这条不会自动消失', { duration: 0 })}>
        常驻
      </hqa-button>
    </div>
  `
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }
