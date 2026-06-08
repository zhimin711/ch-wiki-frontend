<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <p>&copy; {{ year }} {{ siteName }}</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const siteName = computed(() => config.public.siteName || 'ch-wiki')
const year = new Date().getFullYear()
</script>

<style scoped>
.app-footer {
  background: #f5f7fa;
  border-top: 1px solid #e4e7ed;
  padding: 20px 0;
  text-align: center;
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}
.app-footer p {
  color: #909399;
  font-size: 13px;
  margin: 0;
}
</style>
