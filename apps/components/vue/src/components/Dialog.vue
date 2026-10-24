<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

withDefaults(
  defineProps<{
    title?: string
    closeOnEsc?: boolean
    closeOnOverlay?: boolean
  }>(),
  { title: '', closeOnEsc: true, closeOnOverlay: true }
)

const emit = defineEmits<{ close: [source: 'esc' | 'overlay' | 'button'] }>()

const open = defineModel<boolean>('open', { default: false })
const panelRef = ref<HTMLElement | null>(null)
let lastFocus: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function close(source: 'esc' | 'overlay' | 'button') {
  open.value = false
  emit('close', source)
}

watch(open, async (value) => {
  if (value) {
    lastFocus = document.activeElement as HTMLElement | null
    document.documentElement.style.overflow = 'hidden'
    await nextTick()
    const panel = panelRef.value
    if (!panel) return
    const first = panel.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel).focus()
  } else {
    document.documentElement.style.overflow = ''
    lastFocus?.focus?.()
    lastFocus = null
  }
})

onBeforeUnmount(() => {
  if (open.value) document.documentElement.style.overflow = ''
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (closeOnEsc) {
      e.stopPropagation()
      close('esc')
    }
    return
  }
  if (e.key !== 'Tab') return
  const panel = panelRef.value
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
</script>

<template>
  <!-- 传送到 body，避免被父级的 overflow / z-index 裁剪 -->
  <Teleport to="body">
    <div v-if="open" class="hqa-dialog">
      <div class="hqa-dialog__overlay" @click="closeOnOverlay && close('overlay')" />
      <div
        ref="panelRef"
        class="hqa-dialog__panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <header class="hqa-dialog__header">
          <div class="hqa-dialog__title">{{ title }}</div>
          <button
            type="button"
            class="hqa-dialog__close"
            aria-label="关闭"
            @click="close('button')"
          >
            ×
          </button>
        </header>
        <div class="hqa-dialog__body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="hqa-dialog__footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.hqa-dialog__overlay {
  position: fixed;
  inset: 0;
  background: hsl(var(--hqa-overlay) / 0.45);
  z-index: var(--hqa-z-modal);
  animation: hqa-fade-in 160ms ease;
}
.hqa-dialog__panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100vw - 32px);
  max-width: 480px;
  max-height: calc(100vh - 64px);
  overflow: auto;
  background: hsl(var(--hqa-surface));
  border: 1px solid hsl(var(--hqa-border));
  border-radius: var(--hqa-radius-lg);
  box-shadow: var(--hqa-shadow-popup);
  z-index: var(--hqa-z-modal);
  padding: 20px 24px;
  animation: hqa-pop-in 200ms ease;
}
.hqa-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
.hqa-dialog__title {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--hqa-text));
}
.hqa-dialog__close {
  flex: none;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--hqa-radius-sm);
  background: none;
  font-size: 18px;
  line-height: 1;
  color: hsl(var(--hqa-text-muted));
  cursor: pointer;
}
.hqa-dialog__close:hover {
  background: hsl(var(--hqa-border) / 0.6);
  color: hsl(var(--hqa-text));
}
.hqa-dialog__body {
  font-size: 14px;
  line-height: 1.7;
  color: hsl(var(--hqa-text-muted));
}
.hqa-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid hsl(var(--hqa-border));
}
@keyframes hqa-fade-in {
  from {
    opacity: 0;
  }
}
@keyframes hqa-pop-in {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
}
</style>
