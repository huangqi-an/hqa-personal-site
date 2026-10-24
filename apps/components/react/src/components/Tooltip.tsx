import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'

import './components.css'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: string
  placement?: TooltipPlacement
  /** 触发到显示的延迟（防抖） */
  delay?: number
  children?: ReactNode
}

const OFFSET = 8
const MARGIN = 8

export function Tooltip({ content, placement = 'top', delay = 300, children }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const schedule = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(true), delay)
  }
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    setVisible(false)
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  // 气泡是 fixed 定位，锚点滚走它不会跟着走——直接收起最省事
  useEffect(() => {
    const onHide = () => setVisible(false)
    document.addEventListener('scroll', onHide, { capture: true, passive: true })
    window.addEventListener('resize', onHide, { passive: true })
    return () => {
      document.removeEventListener('scroll', onHide, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', onHide)
    }
  }, [])

  // 渲染后再测量定位：先以隐藏态挂载，量出宽高后翻到最终位置
  useLayoutEffect(() => {
    if (!visible) {
      setPos(null)
      return
    }
    const trigger = triggerRef.current
    const tip = tipRef.current
    if (!trigger || !tip) return
    const a = trigger.getBoundingClientRect()
    const r = tip.getBoundingClientRect()
    let top = 0
    let left = 0

    if (placement === 'top' || placement === 'bottom') {
      left = a.left + a.width / 2 - r.width / 2
      top = placement === 'top' ? a.top - r.height - OFFSET : a.bottom + OFFSET
      if (placement === 'top' && top < MARGIN) top = a.bottom + OFFSET
      if (placement === 'bottom' && top + r.height > innerHeight - MARGIN) {
        top = a.top - r.height - OFFSET
      }
    } else {
      top = a.top + a.height / 2 - r.height / 2
      left = placement === 'left' ? a.left - r.width - OFFSET : a.right + OFFSET
      if (placement === 'left' && left < MARGIN) left = a.right + OFFSET
      if (placement === 'right' && left + r.width > innerWidth - MARGIN) {
        left = a.left - r.width - OFFSET
      }
    }
    left = Math.min(Math.max(left, MARGIN), innerWidth - r.width - MARGIN)
    top = Math.min(Math.max(top, MARGIN), innerHeight - r.height - MARGIN)

    setPos({ top, left })
  }, [visible, placement, content])

  return (
    <span
      ref={triggerRef}
      className="hqa-tooltip-trigger"
      onMouseEnter={schedule}
      onMouseLeave={hide}
      onFocus={schedule}
      onBlur={hide}
    >
      {children}
      {visible &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="hqa-tooltip"
            style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
          >
            {content}
          </div>,
          document.body
        )}
    </span>
  )
}
