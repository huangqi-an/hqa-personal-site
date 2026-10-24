import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Button } from '../components/Button'
import { Dialog, type DialogCloseSource } from '../components/Dialog'

const meta = {
  title: '组件/弹窗',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<Dialog open onClose>` 受控弹窗，面板经 `createPortal` 挂到 body；' +
          '打开时锁定页面滚动、圈定焦点（Tab 循环、关闭后还焦点），关闭来源随 `onClose` 回调带出。'
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
  render: (args) => {
    const Demo = () => {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Button onClick={() => setOpen(true)}>打开弹窗</Button>
          <Dialog
            {...args}
            open={open}
            onClose={(source: DialogCloseSource) => {
              console.log('close:', source)
              setOpen(false)
            }}
            footer={
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  取消
                </Button>
                <Button onClick={() => setOpen(false)}>
                  确认
                </Button>
              </>
            }
          >
            <p>删除后不可恢复。弹窗开着时试试 Tab——焦点会被圈在弹窗里。</p>
          </Dialog>
        </>
      )
    }
    return <Demo />
  }
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '默认' }

export const NoOverlayClose: Story = {
  name: '禁止点遮罩关闭',
  args: { closeOnOverlay: false }
}
