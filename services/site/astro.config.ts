import { rehypeHeadingIds } from '@astrojs/markdown-remark'
// import vercel from '@astrojs/vercel'
import node from '@astrojs/node'
import AstroPureIntegration from 'astro-pure'
import type { AstroUserConfig } from 'astro'
import { defineConfig, fontProviders, svgoOptimizer } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

// Local integrations
import rehypeAutolinkHeadings from './src/plugins/rehype-auto-link-headings.ts'
// Shiki
import {
  addCollapse,
  addCopyButton,
  addLanguage,
  addTitle,
  updateStyle
} from './src/plugins/shiki-custom-transformers.ts'
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerRemoveNotationEscape
} from './src/plugins/shiki-official/transformers.ts'
import config from './src/site.config.ts'

// https://astro.build/config
// 标注类型的原因：local provider 的 options 不会被推断出来；
// 若不标注，defineConfig 的推断类型会引用私有的 LocalFamilyOptions，声明生成报 ts(2883)。
const astroConfig: AstroUserConfig<never, never, [ReturnType<typeof fontProviders.local>]> = {
  // [Basic]
  // site: 'https://astro-pure.js.org',
  site: 'http://192.168.198.101',
  // Deploy to a sub path
  // https://astro-pure.js.org/docs/setup/deployment#platform-with-base-path
  // base: '/astro-pure/',
  trailingSlash: 'never',
  // root: './my-project-directory',
  server: { host: true },
  // https://docs.astro.build/en/guides/prefetch/
  prefetch: {
    // prefetchAll: true,
    defaultStrategy: 'viewport'
  },

  // [Adapter]
  // https://docs.astro.build/en/guides/deploy/
  // adapter: vercel({ imageService: true }),
  // output: 'server',
  // Local (standalone)
  adapter: node({ mode: 'standalone' }),
  output: 'server',


  // [Assets]
  image: {
    responsiveStyles: true,
    service: { entrypoint: 'astro/assets/services/sharp' },
    // domains: ['ghchart.rshah.org'],
    remotePatterns: [{ protocol: 'https' }]
  },
  // Enable font preloading and optimization
  // https://docs.astro.build/en/guides/fonts/
  fonts: [
    {
      // 字体自托管：构建时不再请求 fontshare，CDN 抖动不会导致构建失败。
      provider: fontProviders.local(),
      name: 'Satoshi',
      cssVariable: '--font-satoshi',
      options: {
        variants: [
          { weight: 400, style: 'normal', src: ['./src/assets/fonts/satoshi-400.woff2'] },
          { weight: 400, style: 'italic', src: ['./src/assets/fonts/satoshi-400-italic.woff2'] },
          { weight: 500, style: 'normal', src: ['./src/assets/fonts/satoshi-500.woff2'] },
          { weight: 500, style: 'italic', src: ['./src/assets/fonts/satoshi-500-italic.woff2'] }
        ]
      }
    }
  ],

  // [Markdown]
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      [rehypeKatex, {}],
      rehypeHeadingIds,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: { className: ['anchor'] },
          content: { type: 'text', value: '#' }
        }
      ]
    ],
    // https://docs.astro.build/en/guides/syntax-highlighting/
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      transformers: [
        // Two copies of @shikijs/types (one under node_modules
        // and another nested under @astrojs/markdown-remark → shiki).
        // Official transformers
        // @ts-ignore this happens due to multiple versions of shiki types
        transformerNotationDiff(),
        // @ts-ignore this happens due to multiple versions of shiki types
        transformerNotationHighlight(),
        // @ts-ignore this happens due to multiple versions of shiki types
        transformerRemoveNotationEscape(),
        // Custom transformers
        // @ts-ignore this happens due to multiple versions of shiki types
        updateStyle(),
        // @ts-ignore this happens due to multiple versions of shiki types
        addTitle(),
        // @ts-ignore this happens due to multiple versions of shiki types
        addLanguage(),
        // @ts-ignore this happens due to multiple versions of shiki types
        addCopyButton(2000), // timeout in ms
        // @ts-ignore this happens due to multiple versions of shiki types
        addCollapse(15) // max lines that needs to collapse
      ]
    }
  },

  // [Integrations]
  integrations: [
    // astro-pure will automatically add sitemap, mdx & unocss
    // sitemap(),
    // mdx(),
    AstroPureIntegration(config)
  ],

  // [Experimental]
  experimental: {
    // Allow compatible editors to support intellisense features for content collection entries
    // https://docs.astro.build/en/reference/experimental-flags/content-intellisense/
    contentIntellisense: true,
    // Enable SVGO optimization for SVG assets
    // https://docs.astro.build/en/reference/experimental-flags/svg-optimization/
    svgOptimizer: svgoOptimizer(),
    // Enables pre-rendering your prefetched pages on the client in supported browsers.
    // https://docs.astro.build/en/reference/experimental-flags/client-prerender/
    clientPrerender: true,
    // https://docs.astro.build/en/reference/experimental-flags/queued-rendering/
    queuedRendering: {
      enabled: true
    }
  }
}

// 断言同样是为了绕开 ts(2883)
export default defineConfig(astroConfig) as AstroUserConfig
