// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@element-plus/nuxt',
  ],

  // 自动导入 services 目录下的函数
  imports: {
    dirs: ['composables', 'services'],
  },

  app: {
    head: {
      title: '朝华极客',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'ch-wiki 知识库' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  css: [
    '~/assets/styles/main.css',
  ],

  runtimeConfig: {
    // 服务端私有（不暴露到前端）
    // Public 暴露到前端
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:7003',
      uploadBaseUrl: process.env.NUXT_PUBLIC_UPLOAD_BASE_URL || 'http://127.0.0.1:7003',
      oauth2LoginUrls: process.env.NUXT_PUBLIC_OAUTH2_LOGIN_URLS || '{"gitee":"/oauth2/authorization/gitee","github":"/oauth2/authorization/github"}',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || '朝华',
    },
  },

  // 本地开发代理：API、上传、OAuth2 请求转发到后端
  routeRules: {
    '/api/**': { proxy: { to: 'http://127.0.0.1:7003/api/**' } },
    '/upload/**': { proxy: { to: 'http://127.0.0.1:7003/upload/**' } },
    '/resource/**': { proxy: { to: 'http://127.0.0.1:7003/resource/**' } },
    '/oauth2/**': { proxy: { to: 'http://127.0.0.1:7003/oauth2/**' } },
    '/login/oauth2/**': { proxy: { to: 'http://127.0.0.1:7003/login/oauth2/**' } },
    // 登录态只存于浏览器 localStorage，私有页面使用 CSR 避免服务端
    // 先渲染受保护内容、客户端再跳登录所产生的 hydration mismatch。
    '/center/**': { ssr: false },
    '/article/add': { ssr: false },
    '/article/edit/**': { ssr: false },
    '/res/add': { ssr: false },
    '/res/edit/**': { ssr: false },
    '/workbench/**': { ssr: false },
  },

  nitro: {
    esbuild: {
      options: {
        target: 'es2020',
      },
    },
  },

  // 修复 Nuxt 3.21.x 在不开 experimental.viteEnvironmentApi 时
  // #app-manifest 虚拟模块未注册到 vite 解析器的问题。
  // 与 @nuxt/vite-builder 内部保持一致：mocked-exports/empty。
  vite: {
    resolve: {
      alias: {
        '#app-manifest': 'mocked-exports/empty',
      },
    },
  },

  compatibilityDate: '2026-06-04',
})
