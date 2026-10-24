<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted } from 'vue'

const props = defineProps<{
  /** 标签的唯一标识，配合 v-model 使用 */
  name: string | number
  /** 标签上显示的文字 */
  label: string
}>()

interface TabsContext {
  register: (entry: { name: string | number; label: string }) => void
  unregister: (name: string | number) => void
  isActive: (name: string | number) => boolean
}

const ctx = inject<TabsContext | null>('hqa-tabs', null)

onMounted(() => ctx?.register({ name: props.name, label: props.label }))
onBeforeUnmount(() => ctx?.unregister(props.name))

const show = computed(() => ctx?.isActive(props.name) ?? false)
</script>

<template>
  <div v-show="show" class="hqa-tab" role="tabpanel">
    <slot />
  </div>
</template>

<style scoped>
.hqa-tab {
  padding: 16px 2px;
  font-size: 14px;
  line-height: 1.7;
  color: hsl(var(--hqa-text));
}
</style>
