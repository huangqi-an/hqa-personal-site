export type ToastType = 'info' | 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

export interface ToastOptions {
  type?: ToastType
  /** 停留毫秒数，默认 3000；传 0 表示不自动消失 */
  duration?: number
}

const MAX_STACK = 5

/**
 * 模块级外部 store：toast() 修改数据并通知，<ToastHost /> 用
 * useSyncExternalStore 订阅渲染。items 每次整体替换（新数组），
 * 保证 getSnapshot 引用稳定性的约定成立。
 */
let items: ToastItem[] = []
let seq = 0
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getSnapshot(): ToastItem[] {
  return items
}

export function toast(message: string, options: ToastOptions = {}): void {
  const item: ToastItem = { id: ++seq, message, type: options.type ?? 'info' }
  items = [...items, item]
  if (items.length > MAX_STACK) items = items.slice(-MAX_STACK)
  emit()
  const duration = options.duration ?? 3000
  if (duration > 0) setTimeout(() => dismiss(item.id), duration)
}

export function dismiss(id: number): void {
  if (items.some((t) => t.id === id)) {
    items = items.filter((t) => t.id !== id)
    emit()
  }
}
