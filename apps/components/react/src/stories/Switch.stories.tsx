import type { Meta, StoryObj } from '@storybook/react-vite'

import { Switch } from '../components/Switch'

const meta = {
  title: '组件/开关',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<Switch>` 开关组件。受控用法：传 `checked` + `onChange`；非受控用法：只传 `defaultChecked`。'
      }
    }
  },
  argTypes: {
    checked: { control: 'boolean', description: '是否开启（受控值，传入即受控模式）' },
    disabled: { control: 'boolean', description: '是否禁用' },
    label: { control: 'text', description: '开关旁的文字说明' }
  },
  args: {
    checked: false,
    disabled: false,
    label: '开启通知'
  }
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const Checked: Story = { name: '已开启', args: { checked: true } }

export const Disabled: Story = {
  name: '禁用',
  args: { disabled: true, label: '不可操作' }
}
