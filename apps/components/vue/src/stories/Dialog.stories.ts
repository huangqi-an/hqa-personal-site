import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import HqaButton from '../components/Button.vue'
import HqaDialog from '../components/Dialog.vue'

const meta = {
  title: '组件/弹窗',
  component: HqaDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<HqaDialog>` 弹窗，`v-model:open` 控制开关。面板经 `<Teleport>` 挂到 body；' +
          '打开时锁定页面滚动、圈定焦点（Tab 循环、关闭后还焦点），关闭来源随 `close` 事件带出。'
      }
    }
  },
  argTypes: {
    title: { control: 'text', description: '弹窗标题' },
    closeOnEsc: { control: 'boolean', description: '是否允许 Esc 关闭（默认开）' },
    closeOnOverlay: { control: 'boolean', description: '是否允许点遮罩关闭（默认开）' }
  },
  args: {
    title: '确认删除',
    closeOnEsc: true,
    closeOnOverlay: true
  },
  render: (args) => ({
    components: { HqaDialog, HqaButton },
    setup: () => {
      const open = ref(false)
      return { open, args }
    },
    template: `
      <HqaButton @click="open = true">打开弹窗</HqaButton>
      <HqaDialog v-model:open="open" v-bind="args" @close="s => console.log('close:', s)">
        <p>删除后不可恢复。弹窗开着时试试 Tab——焦点会被圈在弹窗里。</p>
        <template #footer>
          <HqaButton variant="ghost" @click="open = false">取消</HqaButton>
          <HqaButton @click="open = false">确认</HqaButton>
        </template>
      </HqaDialog>
    `
  })
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const NoOverlayClose: Story = {
  name: '禁止点遮罩关闭',
  args: { closeOnOverlay: false }
}
