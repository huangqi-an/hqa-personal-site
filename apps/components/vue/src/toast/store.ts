import { reactive } from 'vue'

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

/**
 * 模块级响应式单例：toast() 推入状态，<ToastHost /> 渲染。
 * 同一个 bundle 里多个组件共享同一份状态，无需 provide/inject。
 */
const state = reactive<{ items: ToastItem[] }>({ items: [] })
let seq = 0
const MAX_STACK = 5

export function toast(message: string, options: ToastOptions = {}): void {
  const item: ToastItem = { id: ++seq, message, type: options.type ?? 'info' }
  state.items.push(item)
  while (state.items.length > MAX_STACK) state.items.shift()
  const duration = options.duration ?? 3000
  if (duration > 0) setTimeout(() => dismiss(item.id), duration)
}

export function dismiss(id: number): void {
  const i = state.items.findIndex((t) => t.id === id)
  if (i >= 0) state.items.splice(i, 1)
}

export function useToastState() {
  return state
}
