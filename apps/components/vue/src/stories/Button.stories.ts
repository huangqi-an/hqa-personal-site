import type { Meta, StoryObj } from '@storybook/vue3-vite'

import HqaButton from '../components/Button.vue'

const meta = {
  title: '组件/按钮',
  component: HqaButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<HqaButton>` 按钮组件。按钮文字走默认插槽；点击通过 `@click` 监听。'
      }
    }
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
      description: '外观变体：primary 主按钮 / secondary 次按钮 / ghost 幽灵按钮'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '尺寸：sm 小 / md 中（默认）/ lg 大'
    },
    disabled: { control: 'boolean', description: '是否禁用' }
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

export const Primary: Story = { name: '主要' }

export const Secondary: Story = {
  name: '次要',
  args: { variant: 'secondary', label: '次要按钮' }
}

export const Ghost: Story = {
  name: '幽灵',
  args: { variant: 'ghost', label: '幽灵按钮' }
}

export const Small: Story = {
  name: '小尺寸',
  args: { size: 'sm', label: '小按钮' }
}

export const Large: Story = {
  name: '大尺寸',
  args: { size: 'lg', label: '大按钮' }
}

export const Disabled: Story = {
  name: '禁用',
  args: { disabled: true, label: '禁用按钮' }
}
