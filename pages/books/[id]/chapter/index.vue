<script setup lang="ts">
const route = useRoute()
const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id

await navigateTo(`/books/${id}`, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
