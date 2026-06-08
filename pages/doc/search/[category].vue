<script setup lang="ts">
const route = useRoute()
const categoryId = Array.isArray(route.params.category) ? route.params.category[0] : route.params.category

await navigateTo({
  path: '/doc',
  query: typeof categoryId === 'string' ? { categoryId } : undefined,
}, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
