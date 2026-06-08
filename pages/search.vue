<template>
  <div class="search-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">搜索</h1>
        <p class="page-subtitle" v-if="keyword">关键词：{{ keyword }}</p>
      </div>
    </div>

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

    <div class="article-list" v-if="articles.length">
      <NuxtLink v-for="article in articles" :key="article.id" :to="`/tech/${article.id}`" class="article-card">
        <div class="article-top">
          <span class="article-category" v-if="article.categoryName">{{ article.categoryName }}</span>
          <span class="article-date" v-if="article.publishAt">{{ formatDate(article.publishAt) }}</span>
        </div>
        <h2 class="article-title">{{ article.title }}</h2>
        <p class="article-desc" v-if="article.description">{{ article.description }}</p>
        <div class="article-meta">
          <span v-if="article.author">{{ article.author }}</span>
          <span v-if="article.countView != null">{{ article.countView }} 阅读</span>
          <span v-if="article.countComment != null">{{ article.countComment }} 评论</span>
        </div>
      </NuxtLink>
    </div>

    <el-empty v-else :description="keyword ? '暂无搜索结果' : '请输入关键词'" />
    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import type { PublicArticleCardDTO } from '~/services/public-api'

const route = useRoute()
const router = useRouter()
const { searchArticles } = usePublicApi()

const pageNum = ref(Number(route.query.pageNum || 1))
const pageSize = ref(10)
const keyword = ref(String(route.query.q || ''))
const total = ref(0)
const articles = ref<PublicArticleCardDTO[]>([])

async function loadArticles() {
  const result = await searchArticles({
    q: keyword.value || undefined,
    pageNum: pageNum.value,
    pageSize: pageSize.value,
  })
  articles.value = result.list || []
  total.value = result.total || 0
}

function doSearch() {
  pageNum.value = 1
  router.replace({ path: '/search', query: keyword.value ? { q: keyword.value } : {} })
  loadArticles()
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN')
}

watch(pageNum, loadArticles)
onMounted(loadArticles)

useHead({ title: '搜索 - ch-wiki' })
</script>

<style scoped>
.search-page { max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px solid var(--color-border); }
.page-title { font-size: 26px; font-weight: 700; color: var(--color-text); }
.page-subtitle { margin-top: 6px; font-size: 13px; color: var(--color-text-secondary); }
.page-toolbar { margin-bottom: 20px; }
.search-input { width: 360px; max-width: 100%; }
.article-list { display: flex; flex-direction: column; gap: 12px; }
.article-card { display: block; text-decoration: none; color: inherit; padding: 16px 20px; border-radius: 8px; background: #fafbfc; border: 1px solid transparent; transition: all 0.2s; }
.article-card:hover { border-color: var(--color-primary); background: #fff; box-shadow: 0 6px 18px rgba(64, 158, 255, 0.12); }
.article-top { display: flex; gap: 10px; margin-bottom: 6px; align-items: center; }
.article-category { font-size: 12px; color: var(--color-primary); background: rgba(64, 158, 255, 0.1); padding: 2px 8px; border-radius: 3px; }
.article-date, .article-meta { font-size: 12px; color: var(--color-text-placeholder); }
.article-title { font-size: 17px; font-weight: 600; margin-bottom: 6px; color: var(--color-text); }
.article-desc { font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 10px; }
.article-meta { display: flex; gap: 16px; flex-wrap: wrap; }
</style>
