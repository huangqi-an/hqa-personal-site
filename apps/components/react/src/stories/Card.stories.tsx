import type { Meta, StoryObj } from '@storybook/react-vite'

import { Card } from '../components/Card'

const meta = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    children: { control: 'text' }
  },
  args: {
    title: '卡片标题',
    children: '卡片正文。样式来自共享设计变量，与 Web Components / Vue 版完全一致。'
  }
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LongTitle: Story = {
  args: {
    title: '一个特别长的卡片标题，用来测试换行表现',
    children: '标题过长时不应撑破布局。'
  }
}
