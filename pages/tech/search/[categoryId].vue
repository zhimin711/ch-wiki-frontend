<script setup lang="ts">
const route = useRoute()
const categoryId = Array.isArray(route.params.categoryId) ? route.params.categoryId[0] : route.params.categoryId

await navigateTo({
  path: '/tech',
  query: typeof categoryId === 'string' ? { categoryId } : undefined,
}, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
