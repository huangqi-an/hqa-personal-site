import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit-html'

import '../components/hqa-switch'

const meta = {
  title: '组件/开关',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<hqa-switch>` 开关组件。`checked` 是 presence 属性；切换时派发 `change` 事件（`detail.checked` 为新值）。'
      }
    }
  },
  argTypes: {
    checked: { control: 'boolean', description: '是否开启（presence 属性）' },
    disabled: { control: 'boolean', description: '是否禁用' },
    label: { control: 'text', description: '开关旁的文字说明' }
  },
  args: {
    checked: false,
    disabled: false,
    label: '开启通知'
  },
  render: ({ checked, disabled, label }) =>
    html`<hqa-switch ?checked=${checked} ?disabled=${disabled} label=${label}></hqa-switch>`
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const Checked: Story = { name: '已开启', args: { checked: true } }

export const Disabled: Story = {
  name: '禁用',
  args: { disabled: true, label: '不可操作' }
}
