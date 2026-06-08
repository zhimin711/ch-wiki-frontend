<template>
  <div class="chapter-page" v-if="chapter">
    <div class="chapter-header">
      <NuxtLink :to="`/books/${chapter.bookId}`" class="back-link">&larr; 返回目录</NuxtLink>
      <h1>{{ chapter.number }} {{ chapter.name }}</h1>
      <div class="chapter-nav" v-if="chapter.pre || chapter.next">
        <NuxtLink v-if="chapter.pre" :to="`/books/${chapter.bookId}/chapters/${chapter.pre}`">上一章</NuxtLink>
        <NuxtLink v-if="chapter.next" :to="`/books/${chapter.bookId}/chapters/${chapter.next}`">下一章</NuxtLink>
      </div>
    </div>

    <div class="chapter-content" v-if="chapter.content" v-html="chapter.content" />
    <el-empty v-else description="暂无内容" />

    <div class="chapter-nav-bottom" v-if="chapter.pre || chapter.next">
      <NuxtLink v-if="chapter.pre" :to="`/books/${chapter.bookId}/chapters/${chapter.pre}`">上一章</NuxtLink>
      <NuxtLink v-if="chapter.next" :to="`/books/${chapter.bookId}/chapters/${chapter.next}`">下一章</NuxtLink>
    </div>
  </div>
  <el-empty v-else description="章节不存在" />
</template>

<script setup lang="ts">
import type { PublicBookChapterDTO } from '~/services/public-api'

const route = useRoute()
const { getChapterContent } = usePublicApi()

const bookId = computed(() => Number(route.params.bookId))
const chapterId = computed(() => route.params.chapterId as string)
const { data: result } = await useAsyncData(
  `chapter-${bookId.value}-${chapterId.value}`,
  () => getChapterContent(bookId.value, chapterId.value),
)
const chapter = computed<PublicBookChapterDTO | null>(() => result.value ?? null)

useHead({ title: () => chapter.value ? `${chapter.value.name} - ch-wiki` : '章节 - ch-wiki' })
</script>

<style scoped>
.chapter-header { margin-bottom: 24px; }
.back-link { color: #409eff; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 12px; }
.back-link:hover { text-decoration: underline; }
.chapter-header h1 { font-size: 24px; font-weight: 600; }
.chapter-nav { margin-top: 12px; display: flex; gap: 16px; }
.chapter-nav a { color: #409eff; text-decoration: none; font-size: 14px; }
.chapter-content { line-height: 1.8; font-size: 16px; max-width: 800px; }
.chapter-content :deep(p) { margin-bottom: 16px; }
.chapter-nav-bottom { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e4e7ed; display: flex; justify-content: space-between; }
.chapter-nav-bottom a { color: #409eff; text-decoration: none; }
</style>
