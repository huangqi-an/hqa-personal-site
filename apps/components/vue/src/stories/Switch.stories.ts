import type { Meta, StoryObj } from '@storybook/vue3-vite'

import HqaSwitch from '../components/Switch.vue'

const meta = {
  title: '组件/开关',
  component: HqaSwitch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<HqaSwitch>` 开关组件。用 `v-model` 双向绑定开关状态（`modelValue`）。'
      }
    }
  },
  argTypes: {
    modelValue: { control: 'boolean', description: '是否开启（v-model 绑定值）' },
    disabled: { control: 'boolean', description: '是否禁用' },
    label: { control: 'text', description: '开关旁的文字说明' }
  },
  args: {
    modelValue: false,
    disabled: false,
    label: '开启通知'
  }
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const Checked: Story = { name: '已开启', args: { modelValue: true } }

export const Disabled: Story = {
  name: '禁用',
  args: { disabled: true, label: '不可操作' }
}
