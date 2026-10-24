import type { Meta, StoryObj } from '@storybook/react-vite'

import { Card } from '../components/Card'

const meta = {
  title: '组件/卡片',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '`<Card>` 卡片组件。标题走 `title` 属性，正文走 children。'
      }
    }
  },
  argTypes: {
    title: { control: 'text', description: '卡片标题（title 属性）' },
    children: { control: 'text', description: '卡片正文（子内容）' }
  },
  args: {
    title: '卡片标题',
    children: '卡片正文。样式来自共享设计变量，与 Web Components / Vue 版完全一致。'
  }
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const LongTitle: Story = {
  name: '长标题',
  args: {
    title: '一个特别长的卡片标题，用来测试换行表现',
    children: '标题过长时不应撑破布局。'
  }
}
