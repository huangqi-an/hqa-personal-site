<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="hqa-card">
    <div class="hqa-card__title">{{ title }}</div>
    <div class="hqa-card__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.hqa-card {
  background: hsl(var(--hqa-bg));
  border: 1px solid hsl(var(--hqa-border));
  border-radius: var(--hqa-radius-md);
  padding: 20px;
  max-width: 360px;
}
.hqa-card__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  color: hsl(var(--hqa-text));
}
.hqa-card__body {
  font-size: 14px;
  line-height: 1.7;
  color: hsl(var(--hqa-text-muted));
}
</style>
