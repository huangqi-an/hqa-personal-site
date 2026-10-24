import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { dismiss, getSnapshot, subscribe } from './store'

/** 应用里挂一次即可：全局唯一堆叠位，传送到 body */
export function ToastHost() {
  const items = useSyncExternalStore(subscribe, getSnapshot)

  return createPortal(
    <div className="hqa-toast-host" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`hqa-toast hqa-toast--${item.type}`}>
          <span className="hqa-toast__dot" />
          <span className="hqa-toast__msg">{item.message}</span>
          <button
            type="button"
            className="hqa-toast__close"
            aria-label="关闭提示"
            onClick={() => dismiss(item.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
