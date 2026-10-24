import type { Meta, StoryObj } from '@storybook/vue3-vite'

import HqaSwitch from '../components/Switch.vue'

const meta = {
  title: 'Components/Switch',
  component: HqaSwitch,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' }
  },
  args: {
    modelValue: false,
    disabled: false,
    label: '开启通知'
  }
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = {
  args: { modelValue: true }
}

export const Disabled: Story = {
  args: { disabled: true, label: '不可操作' }
}
