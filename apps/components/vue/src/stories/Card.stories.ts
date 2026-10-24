import type { Meta, StoryObj } from '@storybook/vue3-vite'

import HqaCard from '../components/Card.vue'

const meta = {
  title: '组件/卡片',
  component: HqaCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '`<HqaCard>` 卡片组件。标题走 `title` 属性，正文走默认插槽。'
      }
    }
  },
  argTypes: {
    title: { control: 'text', description: '卡片标题（title 属性）' },
    content: { control: 'text', description: '卡片正文（默认插槽内容）' }
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

export const Default: Story = { name: '默认' }

export const LongTitle: Story = {
  name: '长标题',
  args: {
    title: '一个特别长的卡片标题，用来测试换行表现',
    content: '标题过长时不应撑破布局。'
  }
}
