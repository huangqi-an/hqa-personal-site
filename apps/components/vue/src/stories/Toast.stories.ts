import type { Meta, StoryObj } from '@storybook/vue3-vite'

import HqaButton from '../components/Button.vue'
import { toast, ToastHost } from '../toast'

const meta = {
  title: '组件/轻提示',
  component: ToastHost,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '命令式 API：`toast(\'已保存\')`，状态放在模块级响应式单例里；' +
          '`<ToastHost />` 应用里挂一次即可，最多堆叠 5 条，默认 3 秒消失。'
      }
    }
  },
  render: () => ({
    components: { ToastHost, HqaButton },
    setup: () => ({
      info: () => toast('这是一条普通提示'),
      success: () => toast('已保存', { type: 'success' }),
      error: () => toast('保存失败，请重试', { type: 'error' }),
      stay: () => toast('这条不会自动消失', { duration: 0 })
    }),
    template: `
      <div style="display: flex; gap: 12px;">
        <HqaButton @click="info">普通</HqaButton>
        <HqaButton variant="secondary" @click="success">成功</HqaButton>
        <HqaButton variant="ghost" @click="error">失败</HqaButton>
        <HqaButton variant="secondary" @click="stay">常驻</HqaButton>
        <ToastHost />
      </div>
    `
  })
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }
