import type { Meta, StoryObj } from '@storybook/vue3-vite'

import HqaButton from '../components/Button.vue'

const meta = {
  title: 'Components/Button',
  component: HqaButton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' }
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    label: '主要按钮'
  },
  // label 不是 prop，只渲染进默认插槽
  render: ({ label, ...args }) => ({
    components: { HqaButton },
    setup: () => ({ args, label }),
    template: `<HqaButton v-bind="args">{{ label }}</HqaButton>`
  })
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Secondary: Story = {
  args: { variant: 'secondary', label: '次要按钮' }
}

export const Ghost: Story = {
  args: { variant: 'ghost', label: '幽灵按钮' }
}

export const Small: Story = {
  args: { size: 'sm', label: '小按钮' }
}

export const Large: Story = {
  args: { size: 'lg', label: '大按钮' }
}

export const Disabled: Story = {
  args: { disabled: true, label: '禁用按钮' }
}
