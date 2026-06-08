<template>
  <header class="app-header">
    <div class="header-inner">
      <NuxtLink to="/" class="logo">
        <span class="logo-text">{{ siteName }}</span>
      </NuxtLink>
      <nav class="nav-links">
        <NuxtLink to="/">首页</NuxtLink>
        <NuxtLink to="/tech">技术栈</NuxtLink>
        <NuxtLink to="/doc">文档库</NuxtLink>
        <NuxtLink to="/img">印象城</NuxtLink>
        <NuxtLink to="/books">藏书阁</NuxtLink>
      </nav>
      <div class="header-actions">
        <ClientOnly>
          <template v-if="isAuthenticated">
            <NuxtLink to="/center">{{ nickname || username }}</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/login">登录</NuxtLink>
          </template>
          <template #fallback>
            <NuxtLink to="/login">登录</NuxtLink>
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const siteName = computed(() => config.public.siteName || 'ch-wiki')
const { isAuthenticated, username, nickname } = useAuth()
</script>

<style scoped>
.app-header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.logo {
  text-decoration: none;
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
}
.nav-links {
  display: flex;
  gap: 16px;
  flex: 1;
}
.nav-links a {
  text-decoration: none;
  color: #606266;
  font-size: 14px;
  transition: color 0.2s;
}
.nav-links a:hover,
.nav-links a.router-link-active {
  color: #409eff;
}
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.header-actions a {
  text-decoration: none;
  color: #606266;
  font-size: 14px;
}
</style>
