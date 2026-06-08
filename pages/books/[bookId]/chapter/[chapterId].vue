<script setup lang="ts">
const route = useRoute()
const bookId = Array.isArray(route.params.bookId) ? route.params.bookId[0] : route.params.bookId
const chapterId = Array.isArray(route.params.chapterId) ? route.params.chapterId[0] : route.params.chapterId

await navigateTo(`/books/${bookId}/chapters/${chapterId}`, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
