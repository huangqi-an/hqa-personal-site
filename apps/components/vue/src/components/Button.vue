<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', disabled: false }
)

defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    class="hqa-btn"
    :class="[variant, size]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<!-- 类名与结构同 Web Components / React 版，视觉走 var(--hqa-*) -->
<style scoped>
.hqa-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--hqa-radius-sm);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color var(--hqa-transition),
    border-color var(--hqa-transition),
    color var(--hqa-transition),
    opacity var(--hqa-transition);
}
.hqa-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sm {
  padding: 4px 12px;
  font-size: 13px;
}
.md {
  padding: 7px 18px;
  font-size: 14px;
}
.lg {
  padding: 10px 24px;
  font-size: 16px;
}
.primary {
  background: hsl(var(--hqa-primary));
  color: hsl(var(--hqa-on-primary));
}
.primary:hover:not(:disabled) {
  background: hsl(var(--hqa-primary-hover));
}
.secondary {
  background: hsl(var(--hqa-surface));
  color: hsl(var(--hqa-text));
  border-color: hsl(var(--hqa-border-strong));
}
.secondary:hover:not(:disabled) {
  border-color: hsl(var(--hqa-primary));
  color: hsl(var(--hqa-primary));
}
.ghost {
  background: transparent;
  color: hsl(var(--hqa-primary));
}
.ghost:hover:not(:disabled) {
  background: hsl(var(--hqa-primary) / 0.1);
}
</style>
