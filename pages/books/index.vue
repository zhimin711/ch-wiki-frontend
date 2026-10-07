<template>
  <div class="book-list-page">
    <!-- 页头 -->
    <div class="page-header">
      <div class="page-header-main">
        <h1 class="page-title">藏书阁</h1>
        <p class="page-subtitle" v-if="total">共 {{ total }} 本书</p>
      </div>
      <div class="book-filters">
        <div v-if="isAuthenticated" class="type-filter scope-filter">
          <el-segmented
            v-model="libraryScope"
            :options="scopeOptions"
            @change="changeLibraryScope"
          />
        </div>
        <div class="type-filter">
          <span class="filter-label">类型</span>
          <el-segmented
            v-model="bookType"
            :options="bookTypeOptions"
            @change="changeBookType"
          />
        </div>
      </div>
    </div>

    <!-- 书籍网格（每行 3-4 本） -->
    <div class="book-grid" v-if="books.length">
      <div v-for="book in books" :key="book.id" class="book-card">
        <NuxtLink :to="`/books/${book.id}`" class="book-link">
          <div class="book-info">
            <!-- 标题 + 状态徽章 -->
            <div class="book-header">
              <h3 class="book-title">{{ book.name || book.title || '未命名书籍' }}</h3>
              <el-tag v-if="book.released === false" size="small" effect="plain" type="warning" class="status-tag">
                未发布
              </el-tag>
              <el-tag
                v-else-if="book.status"
                size="small"
                effect="plain"
                :type="statusTagType(book.status)"
                class="status-tag"
              >
                {{ statusLabel(book.status) }}
              </el-tag>
            </div>
            <!-- 副标题（仅在 name 和 title 不同时） -->
            <p
              v-if="book.name && book.title && book.title !== book.name"
              class="book-subtitle"
            >
              {{ book.title }}
            </p>
            <!-- 作者 + 更新时间 -->
            <div class="book-meta-row">
              <span v-if="book.author" class="meta-item">✍ {{ book.author }}</span>
              <span v-if="book.latestChapterAt" class="meta-item dot-sep">🕐 {{ formatDate(book.latestChapterAt) }}</span>
            </div>
            <!-- 最新章节：推到底部 -->
            <div v-if="book.latestChapter" class="book-latest">
              <span class="latest-icon">📖</span>
              <span class="latest-name" :title="book.latestChapter">{{ book.latestChapter }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <el-empty v-else-if="!loading" description="暂无书籍" />

    <div class="pagination" v-if="total > pageSize">
      <el-pagination
        v-model:current-page="pageNum"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="fetchBooks"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicBookCardDTO } from '~/services/public-api'
import type { UserBook } from '~/services/user-book-api'

const { getBooks } = usePublicApi()
const userBookApi = useUserBookApi()
const auth = useAuth()
const isAuthenticated = auth.isAuthenticated
const route = useRoute()
type LibraryBook = PublicBookCardDTO & { released?: boolean }
const books = ref<LibraryBook[]>([])
const pageNum = ref(1)
const pageSize = 12
const total = ref(0)
const loading = ref(false)
const bookType = ref('')
const libraryScope = ref<'public' | 'unpublished'>('public')
const scopeOptions = [
  { label: '公开书籍', value: 'public' },
  { label: '我的未发布', value: 'unpublished' },
]
const bookTypeOptions = [
  { label: '全部', value: '' },
  { label: '文字', value: '1' },
  { label: '图片', value: '2' },
]

async function fetchBooks() {
  loading.value = true
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize,
      type: bookType.value || undefined,
    }
    const result = libraryScope.value === 'unpublished'
      ? await userBookApi.getBooks({ ...params, released: false, sort: 'activity' })
      : await getBooks(params)
    books.value = (result.list || []).map(toLibraryBook)
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

function toLibraryBook(book: PublicBookCardDTO | UserBook): LibraryBook {
  const latestChapterAt = book.latestChapterAt
    ? new Date(book.latestChapterAt).getTime()
    : null
  return { ...book, latestChapterAt } as LibraryBook
}

async function changeLibraryScope(value: string | number | boolean) {
  if (value === 'unpublished' && !isAuthenticated.value) {
    libraryScope.value = 'public'
    return
  }
  pageNum.value = 1
  fetchBooks()
}

function changeBookType() {
  pageNum.value = 1
  fetchBooks()
}

function formatDate(ts: number | string | null | undefined) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN')
}

function statusLabel(status: string): string {
  if (status === '1') return '连载中'
  if (status === '2') return '已完结'
  if (status === '0') return '新书'
  return status
}

function statusTagType(status: string): 'success' | 'primary' | 'warning' | 'info' {
  if (status === '1') return 'success'   // 连载中
  if (status === '2') return 'primary'   // 已完结
  if (status === '0') return 'warning'   // 新书
  return 'info'
}

onMounted(() => {
  if (isAuthenticated.value && route.query.scope === 'unpublished') {
    libraryScope.value = 'unpublished'
    changeLibraryScope('unpublished')
    return
  }
  fetchBooks()
})

watch(isAuthenticated, (authenticated) => {
  if (authenticated || libraryScope.value !== 'unpublished') return
  libraryScope.value = 'public'
  pageNum.value = 1
  fetchBooks()
})

useHead({ title: '藏书阁 - ch-wiki' })
</script>

<style scoped>
.book-list-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* 页头 */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--color-border);
}
.page-header-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 16px;
  position: relative;
}
.page-header-main::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 6px;
  width: 5px;
  border-radius: 3px;
  background: linear-gradient(180deg, #ff9a44, #ff6a6a);
}
.type-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}
.book-filters {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.filter-label {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.type-filter :deep(.el-segmented__item) {
  min-width: 64px;
}
.scope-filter :deep(.el-segmented) {
  width: 228px;
}
.scope-filter :deep(.el-segmented__item) {
  min-width: 112px;
}
.scope-filter :deep(.el-segmented__item-label) {
  overflow: visible;
  text-overflow: clip;
}
.page-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.5px;
}
.page-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 书籍网格：每行 3-4 本（视窗宽度自适应） */
.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.book-card {
  position: relative;
  background: #fafbfc;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.25s ease;
  overflow: hidden;
  display: flex;
}
.book-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, #ff9a44, #ff6a6a);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 0.25s ease;
  z-index: 1;
}
.book-card:hover {
  background: #fff;
  border-color: #ff9a44;
  box-shadow: 0 8px 24px rgba(255, 154, 68, 0.15);
  transform: translateY(-3px);
}
.book-card:hover::before {
  transform: scaleY(1);
}
.book-link {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex: 1;
  padding: 14px 18px;
}
.book-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* 标题行 */
.book-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.book-title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s;
}
.book-card:hover .book-title {
  color: #ff6a6a;
}
.status-tag {
  flex-shrink: 0;
  font-size: 11px;
  margin-top: 1px;
}

/* 副标题 */
.book-subtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 作者 + 时间 */
.book-meta-row {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--color-text-placeholder);
  line-height: 1.4;
  flex-wrap: wrap;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}
.dot-sep {
  position: relative;
  padding-left: 10px;
}
.dot-sep::before {
  content: '·';
  position: absolute;
  left: 0;
  color: var(--color-border);
  font-size: 14px;
  line-height: 1;
}

/* 最新章节：推到底部 */
.book-latest {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.latest-icon {
  flex-shrink: 0;
}
.latest-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}
.book-card:hover .latest-name {
  color: #ff6a6a;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

@media (max-width: 640px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
  }
  .type-filter {
    justify-content: space-between;
  }
  .book-filters {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }
  .type-filter :deep(.el-segmented) {
    flex: 1;
  }
  .type-filter :deep(.el-segmented__item) {
    min-width: 0;
  }
  .scope-filter :deep(.el-segmented) {
    width: 100%;
  }
}
</style>
