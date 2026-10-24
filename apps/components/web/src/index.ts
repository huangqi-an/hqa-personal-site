/**
 * 包入口：引入即注册全部组件（side-effect import）。
 */
import './components/hqa-button'
import './components/hqa-card'
import './components/hqa-switch'
import './components/hqa-dialog'
import './components/hqa-tabs'
import './components/hqa-toast'
import './components/hqa-tooltip'

export { HqaButton } from './components/hqa-button'
export { HqaCard } from './components/hqa-card'
export { HqaSwitch } from './components/hqa-switch'
export { HqaDialog } from './components/hqa-dialog'
export { HqaTabs, HqaTab } from './components/hqa-tabs'
export { HqaToastHost, toast } from './components/hqa-toast'
export type { ToastType, ToastOptions } from './components/hqa-toast'
export { HqaTooltip } from './components/hqa-tooltip'
