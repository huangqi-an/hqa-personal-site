import type { StorybookConfig } from '@storybook/web-components-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/web-components-vite',
    options: {}
  },
  viteFinal: (config) => {
    // 子路径部署：Storybook 构建产物要挂在 /components/web/ 下，
    // 不设 base 的话资源会引用根路径，整站 404（见 docs/架构设计.md §5.2 的坑 2）
    config.base = '/components/web/'
    return config
  }
}

export default config
