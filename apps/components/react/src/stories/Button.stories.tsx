import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '../components/Button'

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    children: { control: 'text' }
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    children: '主要按钮'
  }
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Secondary: Story = {
  args: { variant: 'secondary', children: '次要按钮' }
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: '幽灵按钮' }
}

export const Small: Story = {
  args: { size: 'sm', children: '小按钮' }
}

export const Large: Story = {
  args: { size: 'lg', children: '大按钮' }
}

export const Disabled: Story = {
  args: { disabled: true, children: '禁用按钮' }
}
