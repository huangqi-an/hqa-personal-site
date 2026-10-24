import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit-html'

import '../components/hqa-dialog'
import '../components/hqa-button'

const meta = {
  title: '组件/弹窗',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<hqa-dialog>` 弹窗。`open` 为 presence 属性；Esc / 点遮罩 / 点关闭按钮都会关窗，' +
          '来源随 `close` 事件的 `detail.source` 带出。打开时锁定页面滚动、圈定焦点（Tab 循环、关闭后还焦点）。'
      }
    }
  },
  argTypes: {
    title: { control: 'text', description: '弹窗标题（title 属性）' },
    closeOnEsc: { control: 'boolean', description: '是否允许 Esc 关闭（默认开）' },
    closeOnOverlay: { control: 'boolean', description: '是否允许点遮罩关闭（默认开）' }
  },
  args: {
    title: '确认删除',
    closeOnEsc: true,
    closeOnOverlay: true
  },
  render: ({ title, closeOnEsc, closeOnOverlay }) => {
    const open = (e: Event) => {
      const box = (e.target as HTMLElement).closest('div')
      box?.querySelector('hqa-dialog')?.setAttribute('open', '')
    }
    return html`
      <div>
        <hqa-button @click=${open}>打开弹窗</hqa-button>
        <hqa-dialog
          title=${title}
          close-on-esc=${closeOnEsc ? 'true' : 'false'}
          close-on-overlay=${closeOnOverlay ? 'true' : 'false'}
        >
          <p>删除后不可恢复。弹窗开着时试试 Tab——焦点会被圈在弹窗里。</p>
          <hqa-button slot="footer" variant="ghost" @click=${(e: Event) =>
            (e.target as HTMLElement).closest('hqa-dialog')?.removeAttribute('open')}>
            取消
          </hqa-button>
          <hqa-button
            slot="footer"
            @click=${(e: Event) =>
              (e.target as HTMLElement).closest('hqa-dialog')?.removeAttribute('open')}
          >
            确认
          </hqa-button>
        </hqa-dialog>
      </div>
    `
  }
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const NoOverlayClose: Story = {
  name: '禁止点遮罩关闭',
  args: { closeOnOverlay: false }
}
