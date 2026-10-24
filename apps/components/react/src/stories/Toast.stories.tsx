import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '../components/Button'
import { toast, ToastHost } from '../toast'

const meta = {
  title: '组件/轻提示',
  component: ToastHost,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '命令式 API：`toast(\'已保存\')`。状态放在模块级外部 store，' +
          '`<ToastHost />` 经 `useSyncExternalStore` 订阅（应用里挂一次即可）；' +
          '最多堆叠 5 条，默认 3 秒消失。'
      }
    }
  },
  render: () => (
    <>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button onClick={() => toast('这是一条普通提示')}>普通</Button>
        <Button variant="secondary" onClick={() => toast('已保存', { type: 'success' })}>
          成功
        </Button>
        <Button variant="ghost" onClick={() => toast('保存失败，请重试', { type: 'error' })}>
          失败
        </Button>
        <Button variant="secondary" onClick={() => toast('这条不会自动消失', { duration: 0 })}>
          常驻
        </Button>
      </div>
      <ToastHost />
    </>
  )
} satisfies Meta<typeof ToastHost>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }
