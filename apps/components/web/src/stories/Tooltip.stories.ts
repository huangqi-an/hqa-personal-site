import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit-html'

import '../components/hqa-tooltip'
import '../components/hqa-button'

const meta = {
  title: '组件/文字提示',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<hqa-tooltip content="…" placement="top">` 文字提示。hover 或键盘聚焦插槽内容触发，' +
          '300ms 防抖；气泡 fixed 定位，贴近视口边缘时自动翻到对侧。'
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
  render: ({ content, placement }) => html`
    <hqa-tooltip content=${content} placement=${placement}>
      <hqa-button variant="secondary">悬停看我</hqa-button>
    </hqa-tooltip>
  `
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const LongText: Story = {
  name: '长文本',
  args: {
    content: '这是一段比较长的提示文字，气泡有最大宽度限制，超出会自动换行，不会撑出视口。'
  }
}
