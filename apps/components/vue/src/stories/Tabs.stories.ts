import type { Meta, StoryObj } from '@storybook/vue3-vite'

import HqaTab from '../components/Tab.vue'
import HqaTabs from '../components/Tabs.vue'

const meta = {
  title: '组件/标签页',
  component: HqaTabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<HqaTabs>` + `<HqaTab name label>`。子组件经 provide/inject 自注册，' +
          '`v-model` 绑定当前标签的 name（不传默认第一个）；键盘漫游遵循 WAI-ARIA tabs 模式。'
      }
    }
  },
  render: () => ({
    components: { HqaTabs, HqaTab },
    template: `
      <HqaTabs style="max-width: 420px;">
        <HqaTab name="overview" label="概览">这里是概览内容。试试用 Tab 聚焦到标签后按左右方向键。</HqaTab>
        <HqaTab name="settings" label="设置">这里是设置内容。</HqaTab>
        <HqaTab name="logs" label="日志">这里是日志内容。</HqaTab>
      </HqaTabs>
    `
  })
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const TwoTabs: Story = {
  name: '两个标签',
  render: () => ({
    components: { HqaTabs, HqaTab },
    template: `
      <HqaTabs style="max-width: 420px;">
        <HqaTab name="todo" label="进行中">进行中的任务。</HqaTab>
        <HqaTab name="done" label="已完成">已完成的任务。</HqaTab>
      </HqaTabs>
    `
  })
}
