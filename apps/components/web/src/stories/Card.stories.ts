import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit-html'

import '../components/hqa-card'

const meta = {
  title: 'Components/Card',
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    content: { control: 'text' }
  },
  args: {
    title: '卡片标题',
    content: '卡片正文。样式来自共享设计变量，与 Vue / React 版完全一致。'
  },
  render: ({ title, content }) => html`<hqa-card title=${title}>${content}</hqa-card>`
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LongTitle: Story = {
  args: {
    title: '一个特别长的卡片标题，用来测试换行表现',
    content: '标题过长时不应撑破布局。'
  }
}
