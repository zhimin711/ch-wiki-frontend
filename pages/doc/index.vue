<template>
  <div class="doc-list-page">
    <h1 class="page-title">文档库</h1>

    <div class="page-toolbar">
      <el-input v-model="keyword" placeholder="搜索文档" clearable style="width: 240px" @keyup.enter="doSearch" @clear="doSearch" />
    </div>

    <div class="resource-grid" v-if="resources.length">
      <div v-for="res in resources" :key="res.id" class="resource-card">
        <NuxtLink :to="`/doc/${res.id}`" class="resource-link">
          <div class="resource-cover" v-if="res.image">
            <img :src="res.image" :alt="res.title" loading="lazy" />
          </div>
          <div class="resource-info">
            <h3 class="resource-title">{{ res.title }}</h3>
            <p class="resource-desc" v-if="res.description">{{ res.description }}</p>
            <div class="resource-meta">
              <span v-if="res.author">{{ res.author }}</span>
              <span v-if="res.countDownload != null">{{ res.countDownload }} 下载</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <el-empty v-else description="暂无文档" />
    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />
  </div>
</template>

<script setup lang="ts">
import type { PublicResourceCardDTO } from '~/services/public-api'

const { getResources } = usePublicApi()
const route = useRoute()
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const keyword = ref('')
const resources = ref<PublicResourceCardDTO[]>([])
const categoryId = computed(() => {
  const value = Array.isArray(route.query.categoryId) ? route.query.categoryId[0] : route.query.categoryId
  return typeof value === 'string' && value ? value : undefined
})

async function loadResources() {
  const result = await getResources({
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    categoryId: categoryId.value,
    q: keyword.value || undefined,
  })
  resources.value = result.list || []
  total.value = result.total || 0
}

function doSearch() { pageNum.value = 1; loadResources() }
watch([pageNum, categoryId], loadResources)
onMounted(loadResources)

useHead({ title: '文档库 - ch-wiki' })
</script>

<style scoped>
.page-title { font-size: 24px; font-weight: 600; margin-bottom: 20px; }
.page-toolbar { margin-bottom: 20px; }
.resource-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.resource-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.06); transition: box-shadow 0.2s; }
.resource-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.resource-link { text-decoration: none; color: inherit; display: block; }
.resource-cover { height: 160px; overflow: hidden; }
.resource-cover img { width: 100%; height: 160px; object-fit: cover; }
.resource-info { padding: 12px 16px; }
.resource-title { font-size: 16px; font-weight: 500; margin-bottom: 8px; }
.resource-desc { font-size: 13px; color: #606266; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.resource-meta { font-size: 12px; color: #909399; display: flex; gap: 12px; }
</style>
