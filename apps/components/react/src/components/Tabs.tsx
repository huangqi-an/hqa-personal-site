import { useRef, useState, type ReactNode } from 'react'

import './components.css'

export interface TabItem {
  key: string
  label: ReactNode
  children?: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  /** 受控：当前标签 key（传入即受控模式） */
  activeKey?: string
  /** 非受控初始值 */
  defaultActiveKey?: string
  onChange?: (key: string) => void
}

export function Tabs({ items, activeKey, defaultActiveKey, onChange }: TabsProps) {
  const controlled = activeKey !== undefined
  const [inner, setInner] = useState(defaultActiveKey ?? items[0]?.key)
  const current = controlled ? activeKey : inner
  const rootRef = useRef<HTMLDivElement | null>(null)

  const select = (key: string) => {
    if (!controlled) setInner(key)
    onChange?.(key)
  }

  // 键盘漫游：方向键 / Home / End，焦点随选中项移动（roving tabindex）
  const move = (dir: 1 | -1 | 'first' | 'last') => {
    if (items.length === 0) return
    const cur = items.findIndex((t) => t.key === current)
    let next: number
    if (dir === 'first') next = 0
    else if (dir === 'last') next = items.length - 1
    else next = (cur + dir + items.length) % items.length
    select(items[next].key)
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus()
  }

  return (
    <div ref={rootRef} className="hqa-tabs">
      <div className="hqa-tabs__list" role="tablist">
        {items.map((item, i) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            className="hqa-tabs__tab"
            data-index={i}
            aria-selected={current === item.key}
            tabIndex={current === item.key ? 0 : -1}
            onClick={() => select(item.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault()
                move(-1)
              } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                move(1)
              } else if (e.key === 'Home') {
                e.preventDefault()
                move('first')
              } else if (e.key === 'End') {
                e.preventDefault()
                move('last')
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div key={item.key} role="tabpanel" className="hqa-tabs__panel" hidden={current !== item.key}>
          {item.children}
        </div>
      ))}
    </div>
  )
}
