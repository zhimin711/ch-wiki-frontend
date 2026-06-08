<template>
  <div class="book-detail-page" v-if="book">
    <h1 class="page-title">{{ book.title || book.name }}</h1>
    <p class="book-author" v-if="book.author">作者: {{ book.author }}</p>
    <p class="book-summary" v-if="book.summary">{{ book.summary }}</p>

    <!-- 书籍章节目录 -->
    <div class="chapter-list" v-if="book.chapters?.length">
      <h2>章节目录</h2>
      <ul>
        <li v-for="ch in book.chapters" :key="ch.id">
          <NuxtLink :to="`/books/${book.id}/chapters/${ch.id}`">{{ ch.number }} {{ ch.name }}</NuxtLink>
          <ul v-if="ch.children?.length">
            <li v-for="sub in ch.children" :key="sub.id">
              <NuxtLink :to="`/books/${book.id}/chapters/${sub.id}`">{{ sub.number }} {{ sub.name }}</NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
  <el-empty v-else description="书籍不存在" />
</template>

<script setup lang="ts">
import type { PublicBookDetailDTO } from '~/services/public-api'

const route = useRoute()
const { getBookChapters } = usePublicApi()

const id = computed(() => Number(route.params.id))
const { data: result } = await useAsyncData(`book-${id.value}`, () => getBookChapters(id.value))
const book = computed<PublicBookDetailDTO | null>(() => result.value ?? null)

useHead({ title: () => book.value ? `${book.value.title || book.value.name} - ch-wiki` : '书籍 - ch-wiki' })
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 600; margin-bottom: 12px; }
.book-author { font-size: 14px; color: #606266; margin-bottom: 8px; }
.book-summary { font-size: 16px; line-height: 1.8; margin-bottom: 24px; }
.chapter-list { background: #fff; border-radius: 8px; padding: 20px; }
.chapter-list h2 { font-size: 20px; margin-bottom: 16px; }
.chapter-list ul { list-style: none; padding: 0; }
.chapter-list li { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.chapter-list li:last-child { border-bottom: none; }
.chapter-list a { color: #409eff; text-decoration: none; }
.chapter-list a:hover { text-decoration: underline; }
.chapter-list ul ul { padding-left: 20px; }
</style>
