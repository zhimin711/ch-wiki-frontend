<template>
  <div class="book-detail">
    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else-if="book">
      <header class="page-header">
        <div class="page-header__main">
          <NuxtLink to="/center/books" class="back-link">
            <el-icon><ArrowLeft /></el-icon>
            <span>返回书籍列表</span>
          </NuxtLink>
          <h1 class="page-header__title">{{ book.name }}</h1>
          <p class="page-header__summary">{{ book.summary || '暂无摘要' }}</p>
        </div>
        <div class="page-header__actions">
          <el-button type="primary" :icon="Edit" @click="goEdit">编辑书籍</el-button>
        </div>
      </header>

      <div class="meta-strip">
        <span class="meta-strip__item">
          <el-icon><Notebook /></el-icon>
          {{ bookTypeLabel(book.type) }}
        </span>
        <span class="meta-strip__item">
          <el-icon><CircleCheck v-if="book.status === '2'" /><Loading v-else /></el-icon>
          {{ bookStatusLabel(book.status) }}
        </span>
        <span class="meta-strip__item">
          <el-icon><Folder /></el-icon>
          {{ book.classifyName || book.classify || '未分类' }}
        </span>
        <span class="meta-strip__item meta-strip__item--strong">
          <el-icon><Tickets /></el-icon>
          {{ chapterCount }} 个目录节点
        </span>
      </div>

      <section class="chapter-section">
        <header class="chapter-section__head">
          <h2>章节目录</h2>
          <span class="chapter-section__sub">点击章节查看详情，可继续进入编辑</span>
        </header>
        <div class="chapter-section__body">
          <BooksBookChapterTree
            v-if="book.chapterList?.length"
            :chapters="book.chapterList"
            :book-id="book.id"
          />
          <el-empty v-else description="暂无章节" />
        </div>
      </section>
    </template>
    <el-empty v-else description="书籍不存在或无权访问" />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  CircleCheck,
  Edit,
  Folder,
  Loading,
  Notebook,
  Tickets,
} from '@element-plus/icons-vue'
import type { UserBook } from '~/services/user-book-api'

definePageMeta({ layout: 'center', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
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

function goEdit() {
  if (!book.value) return
  router.push(`/center/books/${book.value.id}/edit`)
}

onMounted(loadBook)
useHead({ title: () => book.value ? `${book.value.name} - 我的书籍` : '书籍详情 - ch-wiki' })
</script>

<style scoped>
.book-detail {
  background: #fff;
  border-radius: 8px;
  padding: 24px 28px;
}

/* 页头：左侧主信息 + 右侧操作 */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid #ebeef5;
}
.page-header__main {
  flex: 1 1 auto;
  min-width: 0;
}
.page-header__actions {
  flex: 0 0 auto;
  white-space: nowrap;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 13px;
  text-decoration: none;
  transition: color 0.15s ease;
}
.back-link:hover {
  color: #1677b8;
}
.page-header__title {
  margin: 8px 0 6px;
  font-size: 24px;
  font-weight: 600;
  color: #1f2329;
  line-height: 1.4;
  word-break: break-word;
}
.page-header__summary {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 元信息条 */
.meta-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 22px;
}
.meta-strip__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 999px;
  color: #606266;
  font-size: 13px;
  line-height: 1.2;
  white-space: nowrap;
}
.meta-strip__item .el-icon {
  font-size: 14px;
  color: #909399;
}
.meta-strip__item--strong {
  color: #1677b8;
  background: #ecf5ff;
  border-color: #d9ecff;
}
.meta-strip__item--strong .el-icon {
  color: #1677b8;
}

/* 章节目录区 */
.chapter-section {
  margin-top: 8px;
}
.chapter-section__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}
.chapter-section__head h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1f2329;
}
.chapter-section__sub {
  font-size: 12px;
  color: #909399;
}
.chapter-section__body {
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px 0;
}

@media (max-width: 720px) {
  .book-detail {
    padding: 18px 16px;
  }
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }
  .page-header__actions {
    align-self: flex-end;
  }
  .page-header__title {
    font-size: 20px;
  }
  .meta-strip__item {
    font-size: 12px;
    padding: 5px 10px;
  }
}
</style>
