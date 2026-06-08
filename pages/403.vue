<template>
  <div class="error-page">
    <p class="error-code">403</p>
    <h1 class="error-title">无权限访问</h1>
    <p class="error-desc">当前账号没有访问该页面的权限。</p>
    <NuxtLink class="error-action" to="/">返回首页</NuxtLink>
  </div>
</template>

<script setup lang="ts">
useHead({ title: '无权限访问 - ch-wiki' })
</script>

<style scoped>
.error-page { min-height: 58vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 12px; }
.error-code { font-size: 72px; font-weight: 800; color: var(--color-primary); line-height: 1; }
.error-title { font-size: 24px; font-weight: 700; color: var(--color-text); }
.error-desc { color: var(--color-text-secondary); }
.error-action { margin-top: 8px; color: #fff; background: var(--color-primary); padding: 9px 18px; border-radius: 6px; text-decoration: none; }
</style>
