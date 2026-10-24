<script setup lang="ts">
defineProps<{
  disabled?: boolean
  label?: string
}>()

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <button
    type="button"
    class="hqa-switch"
    :class="{ 'is-checked': model }"
    role="switch"
    :aria-checked="model"
    :disabled="disabled"
    @click="model = !model"
  >
    <span class="hqa-switch__track"><span class="hqa-switch__thumb"></span></span>
    <span v-if="label" class="hqa-switch__label">{{ label }}</span>
  </button>
</template>

<style scoped>
.hqa-switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 14px;
  color: hsl(var(--hqa-text));
  cursor: pointer;
}
.hqa-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.hqa-switch__track {
  position: relative;
  flex: none;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: hsl(var(--hqa-border-strong));
  transition: background-color var(--hqa-transition);
}
.hqa-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: hsl(var(--hqa-bg));
  box-shadow: 0 1px 2px hsl(220 16% 14% / 0.3);
  transition: transform var(--hqa-transition);
}
.is-checked .hqa-switch__track {
  background: hsl(var(--hqa-primary));
}
.is-checked .hqa-switch__thumb {
  transform: translateX(18px);
}
</style>
