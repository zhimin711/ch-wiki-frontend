<template>
  <div class="workbench-page">
    <header class="workbench-header">
      <div>
        <h1>工作台</h1>
        <p>查看待处理内容并进入对应管理模块。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" circle title="刷新统计" @click="fetchSummary" />
    </header>
    <el-alert v-if="error" type="error" :closable="false" :description="error" class="workbench-alert" />

    <div class="workbench-cards">
      <NuxtLink to="/workbench/article" class="wb-card">
        <el-icon :size="32"><Document /></el-icon>
        <h3>文章审核</h3>
        <strong>{{ stat(summary.pendingArticles) }}</strong>
        <p>待审核文章</p>
      </NuxtLink>
      <NuxtLink to="/workbench/resource" class="wb-card">
        <el-icon :size="32"><Folder /></el-icon>
        <h3>资源审核</h3>
        <strong>{{ stat(summary.pendingResources) }}</strong>
        <p>待审核资源</p>
      </NuxtLink>
      <NuxtLink to="/workbench/image" class="wb-card">
        <el-icon :size="32"><Picture /></el-icon>
        <h3>图片审核</h3>
        <strong>{{ stat(summary.pendingImages) }}</strong>
        <p>待处理图片</p>
      </NuxtLink>
      <NuxtLink to="/workbench/classify" class="wb-card">
        <el-icon :size="32"><Grid /></el-icon>
        <h3>分类管理</h3>
        <strong>{{ stat(summary.totalClassifies) }}</strong>
        <p>公共分类</p>
      </NuxtLink>
      <NuxtLink to="/workbench/apikey-config" class="wb-card">
        <el-icon :size="32"><Key /></el-icon>
        <h3>API Key 配置</h3>
        <p>管理应用认证配置</p>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'
import type { AdminSummary } from '~/services/admin-api'

definePageMeta({
  layout: 'workbench',
  middleware: 'admin',
})

const adminApi = useAdminApi()
const summary = reactive<AdminSummary>({})
const loading = ref(false)
const error = ref('')

function stat(value?: number) {
  return loading.value && value === undefined ? '...' : String(value ?? 0)
}

async function fetchSummary() {
  loading.value = true
  error.value = ''
  try {
    Object.assign(summary, await adminApi.getSummary())
  } catch (cause) {
    error.value = getAdminErrorMessage(cause, '工作台统计加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchSummary)
useHead({ title: '工作台 - ch-wiki' })
</script>

<style scoped>
.workbench-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.workbench-header h1 { margin: 0 0 5px; font-size: 22px; }
.workbench-header p { margin: 0; color: #606266; font-size: 13px; }
.workbench-alert { margin-bottom: 20px; }
.workbench-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}
.wb-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s, transform 0.2s;
}
.wb-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.wb-card h3 { font-size: 16px; font-weight: 500; }
.wb-card strong { min-height: 34px; color: #303133; font-size: 28px; font-weight: 600; }
.wb-card p { font-size: 13px; color: #909399; }
</style>
