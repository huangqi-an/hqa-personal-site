import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '../components/Button'
import { Tooltip } from '../components/Tooltip'

const meta = {
  title: '组件/文字提示',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<Tooltip content>` 文字提示。hover 或键盘聚焦触发，300ms 防抖；' +
          '气泡经 `createPortal` 挂到 body 并用 fixed 定位，贴近视口边缘时自动翻到对侧。'
      }
    }
  },
  argTypes: {
    content: { control: 'text', description: '提示文字' },
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      description: '期望的弹出方位（放不下时自动翻转）'
    }
  },
  args: {
    content: '鼠标悬停或用 Tab 聚焦都能看到提示',
    placement: 'top'
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="secondary">悬停看我</Button>
    </Tooltip>
  )
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const LongText: Story = {
  name: '长文本',
  args: {
    content: '这是一段比较长的提示文字，气泡有最大宽度限制，超出会自动换行，不会撑出视口。'
  }
}
