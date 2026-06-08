<template>
  <div class="toolbox-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">工具箱</h1>
        <p class="page-subtitle" v-if="total">共 {{ total }} 个资源</p>
      </div>
    </div>

    <div class="page-toolbar">
      <el-input v-model="keyword" placeholder="搜索资源" clearable class="search-input" @keyup.enter="doSearch" @clear="doSearch" />
    </div>

    <div class="resource-grid" v-if="resources.length">
      <NuxtLink v-for="res in resources" :key="res.id" :to="`/doc/${res.id}`" class="resource-card">
        <div class="resource-cover" v-if="res.image">
          <img :src="normalizeUrl(res.image)" :alt="res.title" loading="lazy" />
        </div>
        <div class="resource-info">
          <div class="resource-top">
            <span v-if="res.categoryName" class="resource-category">{{ res.categoryName }}</span>
            <span v-if="res.type" class="resource-type">{{ res.type }}</span>
          </div>
          <h2 class="resource-title">{{ res.title }}</h2>
          <p class="resource-desc" v-if="res.description">{{ res.description }}</p>
          <div class="resource-meta">
            <span v-if="res.author">{{ res.author }}</span>
            <span v-if="res.countDownload != null">{{ res.countDownload }} 下载</span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <el-empty v-else description="暂无资源" />
    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />
  </div>
</template>

<script setup lang="ts">
import type { PublicResourceCardDTO } from '~/services/public-api'

const { getToolboxResources } = usePublicApi()

const pageNum = ref(1)
const pageSize = ref(12)
const total = ref(0)
const keyword = ref('')
const resources = ref<PublicResourceCardDTO[]>([])
const normalizeUrl = normalizeBackendUrl

async function loadResources() {
  const result = await getToolboxResources({
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    q: keyword.value || undefined,
  })
  resources.value = result.list || []
  total.value = result.total || 0
}

function doSearch() {
  pageNum.value = 1
  loadResources()
}

watch(pageNum, loadResources)
onMounted(loadResources)

useHead({ title: '工具箱 - ch-wiki' })
</script>

<style scoped>
.toolbox-page { max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px solid var(--color-border); }
.page-title { font-size: 26px; font-weight: 700; color: var(--color-text); }
.page-subtitle { margin-top: 6px; font-size: 13px; color: var(--color-text-secondary); }
.page-toolbar { margin-bottom: 20px; }
.search-input { width: 320px; max-width: 100%; }
.resource-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
.resource-card { display: block; text-decoration: none; color: inherit; background: #fff; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s; }
.resource-card:hover { border-color: var(--color-primary); box-shadow: 0 8px 22px rgba(64, 158, 255, 0.12); }
.resource-cover { height: 150px; overflow: hidden; background: #f5f7fa; }
.resource-cover img { width: 100%; height: 100%; object-fit: cover; }
.resource-info { padding: 14px 16px; }
.resource-top { display: flex; gap: 8px; margin-bottom: 8px; }
.resource-category, .resource-type { font-size: 12px; padding: 2px 8px; border-radius: 3px; background: rgba(64, 158, 255, 0.1); color: var(--color-primary); }
.resource-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--color-text); }
.resource-desc { font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.resource-meta { display: flex; gap: 14px; font-size: 12px; color: var(--color-text-placeholder); }
</style>
