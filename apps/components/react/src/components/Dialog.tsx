import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import './components.css'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export type DialogCloseSource = 'esc' | 'overlay' | 'button'

export interface DialogProps {
  open: boolean
  onClose: (source: DialogCloseSource) => void
  title?: string
  closeOnEsc?: boolean
  closeOnOverlay?: boolean
  /** 底部操作区，一般放取消 / 确认按钮 */
  footer?: ReactNode
  children?: ReactNode
}

export function Dialog({
  open,
  onClose,
  title = '',
  closeOnEsc = true,
  closeOnOverlay = true,
  footer,
  children
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  // 用 ref 存最新的回调，避免闭包过期
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // 打开：锁滚动、移焦点进面板；关闭：还原（effect cleanup 天然对称）
  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement as HTMLElement | null
    document.documentElement.style.overflow = 'hidden'
    const panel = panelRef.current
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel).focus()
    }
    return () => {
      document.documentElement.style.overflow = ''
      lastFocus.current?.focus?.()
      lastFocus.current = null
    }
  }, [open])

  // Esc 关闭 + Tab 焦点圈定
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (closeOnEsc) {
          e.stopPropagation()
          onCloseRef.current('esc')
        }
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const list = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (list.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!active || !panel.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeOnEsc])

  if (!open) return null

  return createPortal(
    <div className="hqa-dialog">
      <div
        className="hqa-dialog__overlay"
        onClick={() => {
          if (closeOnOverlay) onCloseRef.current('overlay')
        }}
      />
      <div
        ref={panelRef}
        className="hqa-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="hqa-dialog__header">
          <div className="hqa-dialog__title">{title}</div>
          <button
            type="button"
            className="hqa-dialog__close"
            aria-label="关闭"
            onClick={() => onCloseRef.current('button')}
          >
            ×
          </button>
        </header>
        <div className="hqa-dialog__body">{children}</div>
        {footer != null && <div className="hqa-dialog__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
