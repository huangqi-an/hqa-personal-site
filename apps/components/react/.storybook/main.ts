import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  viteFinal: (config) => {
    // 子路径部署：产物挂在 /components/react/ 下（同 web 包，见 docs/架构设计.md §5.2）
    config.base = '/components/react/'
    return config
  }
}

export default config
