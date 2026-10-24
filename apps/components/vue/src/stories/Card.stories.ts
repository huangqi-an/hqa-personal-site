import type { Meta, StoryObj } from '@storybook/vue3-vite'

import HqaCard from '../components/Card.vue'

const meta = {
  title: 'Components/Card',
  component: HqaCard,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    content: { control: 'text' }
  },
  args: {
    title: '卡片标题',
    content: '卡片正文。样式来自共享设计变量，与 Web Components / React 版完全一致。'
  },
  render: ({ content, ...args }) => ({
    components: { HqaCard },
    setup: () => ({ args, content }),
    template: `<HqaCard v-bind="args">{{ content }}</HqaCard>`
  })
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
