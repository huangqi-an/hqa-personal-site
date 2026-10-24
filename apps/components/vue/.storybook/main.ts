import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {}
  },
  viteFinal: async (config) => {
    // 子路径部署：产物挂在 /components/vue/ 下（同 web 包，见 docs/架构设计.md §5.2）
    config.base = '/components/vue/'
    // SB10 的 vue3-vite 不再自动挂 @vitejs/plugin-vue，需自行安装并加进插件列表，
    // 否则 .vue 文件会被当成普通脚本解析，直接 PARSE_ERROR
    const { default: vue } = await import('@vitejs/plugin-vue')
    config.plugins = [...(config.plugins ?? []), vue()]
    return config
  }
}

export default config
