import type { Meta, StoryObj } from '@storybook/react-vite'

import { Tabs, type TabItem } from '../components/Tabs'

const items: TabItem[] = [
  {
    key: 'overview',
    label: '概览',
    children: '这里是概览内容。试试用 Tab 聚焦到标签后按左右方向键。'
  },
  { key: 'settings', label: '设置', children: '这里是设置内容。' },
  { key: 'logs', label: '日志', children: '这里是日志内容。' }
]

const meta = {
  title: '组件/标签页',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<Tabs items>` 数据驱动：`items` 里每项有 `key / label / children`。' +
          '`activeKey` + `onChange` 受控，或只传 `defaultActiveKey` 非受控；键盘漫游遵循 WAI-ARIA tabs 模式。'
      }
    }
  },
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <Tabs items={items} />
    </div>
  )
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: '默认',
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <Tabs items={items} />
    </div>
  )
}

export const TwoTabs: Story = {
  name: '两个标签',
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <Tabs
        items={[
          { key: 'todo', label: '进行中', children: '进行中的任务。' },
          { key: 'done', label: '已完成', children: '已完成的任务。' }
        ]}
      />
    </div>
  )
}
