<script setup lang="ts">
import { dismiss, useToastState } from './store'

const state = useToastState()
</script>

<template>
  <!-- 应用里挂一次即可：全局唯一堆叠位，传送到 body -->
  <Teleport to="body">
    <div class="hqa-toast-host" role="status" aria-live="polite">
      <TransitionGroup name="hqa-toast">
        <div
          v-for="item in state.items"
          :key="item.id"
          class="hqa-toast"
          :class="`hqa-toast--${item.type}`"
        >
          <span class="hqa-toast__dot" />
          <span class="hqa-toast__msg">{{ item.message }}</span>
          <button
            type="button"
            class="hqa-toast__close"
            aria-label="关闭提示"
            @click="dismiss(item.id)"
          >
            ×
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<!-- 传送目标是 body，scoped 属性仍会带上，这里正常 scoped 即可 -->
<style scoped>
.hqa-toast-host {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: var(--hqa-z-toast);
  pointer-events: none;
}
.hqa-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: hsl(var(--hqa-surface));
  border: 1px solid hsl(var(--hqa-border));
  border-radius: var(--hqa-radius-md);
  box-shadow: var(--hqa-shadow-popup);
  font-size: 14px;
  color: hsl(var(--hqa-text));
  pointer-events: auto;
}
.hqa-toast__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(var(--hqa-primary));
}
.hqa-toast--success .hqa-toast__dot {
  background: hsl(var(--hqa-success));
}
.hqa-toast--error .hqa-toast__dot {
  background: hsl(var(--hqa-danger));
}
.hqa-toast__close {
  flex: none;
  border: none;
  background: none;
  padding: 0 2px;
  font-size: 15px;
  line-height: 1;
  color: hsl(var(--hqa-text-muted));
  cursor: pointer;
}
.hqa-toast__close:hover {
  color: hsl(var(--hqa-text));
}

.hqa-toast-enter-active,
.hqa-toast-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}
.hqa-toast-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.hqa-toast-leave-to {
  opacity: 0;
}
</style>
