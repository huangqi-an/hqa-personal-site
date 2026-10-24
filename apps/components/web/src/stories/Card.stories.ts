import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit-html'

import '../components/hqa-card'

const meta = {
  title: '组件/卡片',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<hqa-card>` 卡片组件。标题走 `title` 属性（渲染前转义），正文走默认插槽。'
      }
    }
  },
  argTypes: {
    title: { control: 'text', description: '卡片标题（title 属性）' },
    content: { control: 'text', description: '卡片正文（默认插槽内容）' }
  },
  args: {
    title: '卡片标题',
    content: '卡片正文。样式来自共享设计变量，与 Vue / React 版完全一致。'
  },
  render: ({ title, content }) => html`<hqa-card title=${title}>${content}</hqa-card>`
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const LongTitle: Story = {
  name: '长标题',
  args: {
    title: '一个特别长的卡片标题，用来测试换行表现',
    content: '标题过长时不应撑破布局。'
  }
}
