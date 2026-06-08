<template>
  <div class="tech-list-page">
    <!-- 页头 -->
    <div class="page-header">
      <div class="page-header-main">
        <h1 class="page-title">技术栈</h1>
        <p class="page-subtitle" v-if="total">共 {{ total }} 篇文章</p>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="page-toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索文章标题、描述..."
        clearable
        class="search-input"
        @keyup.enter="doSearch"
        @clear="doSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 文章列表 -->
    <div class="article-list" v-if="articles.length">
      <div v-for="article in articles" :key="article.id" class="article-card">
        <NuxtLink :to="`/tech/${article.id}`" class="article-link">
          <div class="article-info">
            <div class="article-top">
              <span class="article-category" v-if="article.categoryName">{{ article.categoryName }}</span>
              <span class="article-date" v-if="article.publishAt">{{ formatDate(article.publishAt) }}</span>
            </div>
            <h3 class="article-title">{{ article.title }}</h3>
            <p class="article-desc" v-if="article.description">{{ article.description }}</p>
            <div class="article-meta">
              <span v-if="article.author" class="meta-item">✍ {{ article.author }}</span>
              <span v-if="article.countView != null" class="meta-item">👁 {{ article.countView }} 阅读</span>
              <span v-if="article.countComment != null" class="meta-item">💬 {{ article.countComment }} 评论</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <el-empty v-else description="暂无文章" />

    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import type { PublicArticleCardDTO } from '~/services/public-api'

const { getArticles } = usePublicApi()
const route = useRoute()

const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const keyword = ref('')
const articles = ref<PublicArticleCardDTO[]>([])
const categoryId = computed(() => {
  const value = Array.isArray(route.query.categoryId) ? route.query.categoryId[0] : route.query.categoryId
  return typeof value === 'string' && value ? value : undefined
})

async function loadArticles() {
  const result = await getArticles({
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    categoryId: categoryId.value,
    q: keyword.value || undefined,
  })
  articles.value = result.list || []
  total.value = result.total || 0
}

function doSearch() {
  pageNum.value = 1
  loadArticles()
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN')
}

watch([pageNum, categoryId], loadArticles)
onMounted(loadArticles)

useHead({ title: '技术栈 - ch-wiki' })
</script>

<style scoped>
.tech-list-page {
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
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-light));
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

/* 工具栏 */
.page-toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
}
.search-input {
  width: 320px;
  max-width: 100%;
}
.search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
  transition: box-shadow 0.2s, background 0.2s;
  background: var(--color-bg-white);
}
.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--color-primary-light) inset;
}
.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--color-primary) inset, 0 0 0 3px rgba(64, 158, 255, 0.12);
}

/* 文章列表 */
.article-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.article-card {
  position: relative;
  background: #fafbfc;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.25s ease;
  overflow: hidden;
}
.article-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-primary);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 0.25s ease;
}
.article-card:hover {
  background: #fff;
  border-color: var(--color-primary);
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.12);
  transform: translateX(2px);
}
.article-card:hover::before {
  transform: scaleY(1);
}
.article-link {
  text-decoration: none;
  color: inherit;
  display: block;
  padding: 16px 22px;
}
.article-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.article-category {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary);
  background: rgba(64, 158, 255, 0.1);
  padding: 2px 8px;
  border-radius: 3px;
}
.article-date {
  font-size: 12px;
  color: var(--color-text-placeholder);
}
.article-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s;
}
.article-card:hover .article-title {
  color: var(--color-primary);
}
.article-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-placeholder);
  flex-wrap: wrap;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
</style>
