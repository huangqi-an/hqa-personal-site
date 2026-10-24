<script setup lang="ts">
import { computed, provide, ref } from 'vue'

export interface TabEntry {
  name: string | number
  label: string
}

// 子 <HqaTab> 通过 provide/inject 自注册，渲染顺序即 DOM 顺序
provide('hqa-tabs', {
  register(entry: TabEntry) {
    tabs.value.push(entry)
  },
  unregister(name: string | number) {
    const i = tabs.value.findIndex((t) => t.name === name)
    if (i >= 0) tabs.value.splice(i, 1)
  },
  isActive: (name: string | number) => effective.value === name
})

const tabs = ref<TabEntry[]>([])
const active = defineModel<string | number | undefined>()

// 未传 v-model 时落到第一个注册的标签
const effective = computed<string | number | undefined>({
  get: () => active.value ?? tabs.value[0]?.name,
  set: (value) => {
    if (value !== undefined) active.value = value
  }
})

const rootRef = ref<HTMLElement | null>(null)

// 键盘漫游：方向键 / Home / End，焦点随选中项移动（roving tabindex）
function move(dir: 1 | -1 | 'first' | 'last') {
  const list = tabs.value
  if (list.length === 0) return
  const cur = list.findIndex((t) => t.name === effective.value)
  let next: number
  if (dir === 'first') next = 0
  else if (dir === 'last') next = list.length - 1
  else next = (cur + dir + list.length) % list.length
  effective.value = list[next].name
  rootRef.value?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus()
}
</script>

<template>
  <div ref="rootRef" class="hqa-tabs">
    <div class="hqa-tabs__list" role="tablist">
      <button
        v-for="(tab, i) in tabs"
        :key="tab.name"
        type="button"
        role="tab"
        class="hqa-tabs__tab"
        :data-index="i"
        :aria-selected="effective === tab.name"
        :tabindex="effective === tab.name ? 0 : -1"
        @click="effective = tab.name"
        @keydown.left.prevent="move(-1)"
        @keydown.right.prevent="move(1)"
        @keydown.home.prevent="move('first')"
        @keydown.end.prevent="move('last')"
      >
        {{ tab.label }}
      </button>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.hqa-tabs {
  display: block;
}
.hqa-tabs__list {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid hsl(var(--hqa-border));
}
.hqa-tabs__tab {
  padding: 8px 14px;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  font: inherit;
  font-size: 14px;
  color: hsl(var(--hqa-text-muted));
  cursor: pointer;
  transition:
    color var(--hqa-transition),
    border-color var(--hqa-transition);
}
.hqa-tabs__tab:hover {
  color: hsl(var(--hqa-text));
}
.hqa-tabs__tab[aria-selected='true'] {
  color: hsl(var(--hqa-primary));
  border-bottom-color: hsl(var(--hqa-primary));
}
.hqa-tabs__tab:focus-visible {
  outline: 2px solid hsl(var(--hqa-primary));
  outline-offset: -2px;
  border-radius: var(--hqa-radius-sm) var(--hqa-radius-sm) 0 0;
}
</style>
