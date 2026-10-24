import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit-html'

import '../components/hqa-switch'

const meta = {
  title: 'Components/Switch',
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
  },
  render: ({ checked, disabled, label }) =>
    html`<hqa-switch ?checked=${checked} ?disabled=${disabled} label=${label}></hqa-switch>`
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = {
  args: { checked: true }
}

export const Disabled: Story = {
  args: { disabled: true, label: '不可操作' }
}
