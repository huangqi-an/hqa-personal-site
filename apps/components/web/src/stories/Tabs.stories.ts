import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit-html'

import '../components/hqa-tabs'

const meta = {
  title: '组件/标签页',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<hqa-tabs>` 标签页。每个面板是一个 `<hqa-tab label="…">`；键盘漫游遵循 WAI-ARIA ' +
          'tabs 模式：方向键 / Home / End 切换，焦点随选中项移动（roving tabindex）。'
      }
    }
  },
  render: () => html`
    <hqa-tabs style="max-width: 420px;">
      <hqa-tab label="概览">这里是概览内容。试试用 Tab 聚焦到标签后按左右方向键。</hqa-tab>
      <hqa-tab label="设置">这里是设置内容。</hqa-tab>
      <hqa-tab label="日志">这里是日志内容。</hqa-tab>
    </hqa-tabs>
  `
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const TwoTabs: Story = {
  name: '两个标签',
  render: () => html`
    <hqa-tabs style="max-width: 420px;">
      <hqa-tab label="进行中">进行中的任务。</hqa-tab>
      <hqa-tab label="已完成">已完成的任务。</hqa-tab>
    </hqa-tabs>
  `
}
