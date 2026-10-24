<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    content: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
    /** 触发到显示的延迟（防抖） */
    delay?: number
  }>(),
  { placement: 'top', delay: 300 }
)

const trigger = ref<HTMLElement | null>(null)
const tip = ref<HTMLElement | null>(null)
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

const OFFSET = 8
const MARGIN = 8

function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(show, props.delay)
}

async function show() {
  if (!props.content) return
  visible.value = true
  await nextTick()
  const triggerEl = trigger.value
  const tipEl = tip.value
  if (!triggerEl || !tipEl) return
  // 先渲染再测量，拿到真实宽高后定位
  tipEl.style.visibility = 'hidden'
  const a = triggerEl.getBoundingClientRect()
  const r = tipEl.getBoundingClientRect()
  let top = 0
  let left = 0

  if (props.placement === 'top' || props.placement === 'bottom') {
    left = a.left + a.width / 2 - r.width / 2
    top = props.placement === 'top' ? a.top - r.height - OFFSET : a.bottom + OFFSET
    if (props.placement === 'top' && top < MARGIN) top = a.bottom + OFFSET
    if (props.placement === 'bottom' && top + r.height > innerHeight - MARGIN) {
      top = a.top - r.height - OFFSET
    }
  } else {
    top = a.top + a.height / 2 - r.height / 2
    left = props.placement === 'left' ? a.left - r.width - OFFSET : a.right + OFFSET
    if (props.placement === 'left' && left < MARGIN) left = a.right + OFFSET
    if (props.placement === 'right' && left + r.width > innerWidth - MARGIN) {
      left = a.left - r.width - OFFSET
    }
  }
  left = Math.min(Math.max(left, MARGIN), innerWidth - r.width - MARGIN)
  top = Math.min(Math.max(top, MARGIN), innerHeight - r.height - MARGIN)

  tipEl.style.top = `${top}px`
  tipEl.style.left = `${left}px`
  tipEl.style.visibility = ''
}

function hide() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  visible.value = false
}

// 气泡是 fixed 定位，锚点滚走它不会跟着走——直接收起最省事
const onScrollOrResize = () => hide()
onMounted(() => {
  document.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true })
  window.addEventListener('resize', onScrollOrResize, { passive: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('scroll', onScrollOrResize, { capture: true } as EventListenerOptions)
  window.removeEventListener('resize', onScrollOrResize)
})
</script>

<template>
  <span
    ref="trigger"
    class="hqa-tooltip-trigger"
    @mouseenter="schedule"
    @mouseleave="hide"
    @focusin="schedule"
    @focusout="hide"
  >
    <slot />
    <Teleport to="body">
      <div v-if="visible" ref="tip" class="hqa-tooltip" role="tooltip">{{ content }}</div>
    </Teleport>
  </span>
</template>

<style scoped>
.hqa-tooltip-trigger {
  display: inline-flex;
}
</style>

<!-- 气泡传送到 body 且不受 scoped 约束保护，样式放全局（组件库样式表内） -->
<style>
.hqa-tooltip {
  position: fixed;
  max-width: 240px;
  padding: 4px 10px;
  background: hsl(var(--hqa-text) / 0.92);
  color: hsl(var(--hqa-bg));
  font-size: 12px;
  line-height: 1.6;
  border-radius: var(--hqa-radius-sm);
  z-index: var(--hqa-z-tooltip);
  pointer-events: none;
  animation: hqa-tooltip-in 120ms ease;
}
@keyframes hqa-tooltip-in {
  from {
    opacity: 0;
  }
}
</style>
