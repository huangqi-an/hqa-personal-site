import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit-html'

import '../components/hqa-button'

const meta = {
  title: 'Components/Button',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' }
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    label: '主要按钮'
  },
  render: ({ label, variant, size, disabled }) =>
    html`<hqa-button variant=${variant} size=${size} ?disabled=${disabled}>${label}</hqa-button>`
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
