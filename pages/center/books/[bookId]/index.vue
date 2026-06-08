<template>
  <div class="book-detail">
    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else-if="book">
      <div class="page-header">
        <div>
          <NuxtLink to="/center/books" class="back-link">返回书籍列表</NuxtLink>
          <h1>{{ book.name }}</h1>
          <p>{{ book.summary || '暂无摘要' }}</p>
        </div>
        <div class="actions">
          <NuxtLink :to="`/center/books/${book.id}/edit`" class="primary-link">编辑书籍</NuxtLink>
        </div>
      </div>

      <div class="meta-strip">
        <span>{{ bookTypeLabel(book.type) }}</span>
        <span>{{ bookStatusLabel(book.status) }}</span>
        <span>{{ book.classify || '未分类' }}</span>
        <span>{{ chapterCount }} 个目录节点</span>
      </div>

      <section class="chapter-section">
        <h2>章节目录</h2>
        <BooksBookChapterTree
          v-if="book.chapterList?.length"
          :chapters="book.chapterList"
          :book-id="book.id"
        />
        <el-empty v-else description="暂无章节" />
      </section>
    </template>
    <el-empty v-else description="书籍不存在或无权访问" />
  </div>
</template>

<script setup lang="ts">
import type { UserBook } from '~/services/user-book-api'

definePageMeta({ layout: 'center', middleware: 'auth' })

const route = useRoute()
const api = useUserBookApi()
const loading = ref(true)
const book = ref<UserBook | null>(null)
const bookId = computed(() => Number(route.params.bookId))
const chapterCount = computed(() => flattenBookChapters(book.value?.chapterList || []).filter(item => item.id !== '-').length)

async function loadBook() {
  loading.value = true
  try {
    book.value = await api.getBook(bookId.value)
  } catch {
    ElMessage?.error?.('书籍加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadBook)
useHead({ title: () => book.value ? `${book.value.name} - 我的书籍` : '书籍详情 - ch-wiki' })
</script>

<style scoped>
.book-detail {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}
.page-header h1 {
  margin: 8px 0;
  font-size: 24px;
}
.page-header p {
  margin: 0;
  color: #606266;
}
.back-link,
.primary-link {
  color: #1677b8;
  text-decoration: none;
}
.meta-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 22px 0;
  padding: 12px 0;
  border-block: 1px solid #ebeef5;
  color: #606266;
  font-size: 13px;
}
.chapter-section h2 {
  margin: 0 0 14px;
  font-size: 18px;
}
</style>
