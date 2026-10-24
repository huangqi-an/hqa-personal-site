import type { Meta, StoryObj } from '@storybook/react-vite'

import { Switch } from '../components/Switch'

const meta = {
  title: 'Components/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' }
  },
  args: {
    checked: false,
    disabled: false,
    label: '开启通知'
  }
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = {
  args: { checked: true }
}

export const Disabled: Story = {
  args: { disabled: true, label: '不可操作' }
}
