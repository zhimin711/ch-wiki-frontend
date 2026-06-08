<template>
  <div class="preview-page">
    <div class="page-header">
      <h1 class="page-title">文档预览</h1>
      <NuxtLink to="/doc" class="back-link">返回文档库</NuxtLink>
    </div>

    <div v-if="previewUrl" class="preview-frame-wrap">
      <iframe class="preview-frame" :src="previewUrl" title="文档预览" />
    </div>

    <el-empty v-else description="缺少可预览文件">
      <NuxtLink to="/doc" class="empty-link">浏览文档库</NuxtLink>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()

const file = computed(() => {
  const value = Array.isArray(route.query.file) ? route.query.file[0] : route.query.file
  return typeof value === 'string' ? value : ''
})
const previewUrl = computed(() => {
  if (!file.value) return ''
  const base = String(config.public.apiBaseUrl || '').replace(/\/$/, '')
  return `${base}/doc/preview?file=${encodeURIComponent(file.value)}`
})

useHead({ title: '文档预览 - ch-wiki' })
</script>

<style scoped>
.preview-page { max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid var(--color-border); }
.page-title { font-size: 24px; font-weight: 700; color: var(--color-text); }
.back-link, .empty-link { color: var(--color-primary); text-decoration: none; }
.preview-frame-wrap { height: calc(100vh - 180px); min-height: 520px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; background: #fff; }
.preview-frame { width: 100%; height: 100%; border: 0; }
</style>
