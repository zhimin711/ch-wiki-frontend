<template>
  <div class="text-viewer">
    <el-skeleton v-if="loading" :rows="10" animated />
    <template v-else-if="chapter">
      <div class="page-header">
        <div>
          <NuxtLink :to="editorPath" class="back-link">返回章节编辑</NuxtLink>
          <h1>{{ [chapter.number, chapter.name].filter(Boolean).join(' ') }}</h1>
        </div>
      </div>
      <pre>{{ plainText }}</pre>
    </template>
    <el-empty v-else description="章节不存在或无权访问" />
  </div>
</template>

<script setup lang="ts">
import type { UserBookChapter } from '~/services/user-book-api'

definePageMeta({ layout: 'center', middleware: 'auth' })

const route = useRoute()
const api = useUserBookApi()
const loading = ref(true)
const chapter = ref<UserBookChapter | null>(null)
const bookId = computed(() => Number(route.params.bookId))
const chapterId = computed(() => `${route.params.chapterId}`)
const editorPath = computed(() => `/center/books/${bookId.value}/chapter/${chapterId.value}`)
const plainText = computed(() => toPlainText(chapter.value?.content || ''))

function toPlainText(content: string) {
  return content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

async function loadChapter() {
  loading.value = true
  try {
    chapter.value = await api.getChapter(bookId.value, chapterId.value)
  } catch {
    ElMessage?.error?.('章节加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadChapter)
useHead({ title: () => chapter.value ? `${chapter.value.name || '章节'} - 纯文本` : '章节纯文本 - ch-wiki' })
</script>

<style scoped>
.text-viewer {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.page-header {
  margin-bottom: 22px;
}
.page-header h1 {
  margin: 8px 0 0;
  font-size: 22px;
}
.back-link {
  color: #1677b8;
  text-decoration: none;
}
pre {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: 16px/1.9 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: #303133;
}
</style>
