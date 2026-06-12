<template>
  <div class="list-page">
    <div class="page-header">
      <div>
        <h1>我的文章</h1>
        <p>查看和维护自己发布或保存的文章。</p>
      </div>
      <NuxtLink to="/article/add" class="primary-link">写文章</NuxtLink>
    </div>

    <div class="filter-bar">
      <el-input v-model="query.title" placeholder="标题" clearable @keyup.enter="reload" />
      <el-select v-model="query.status" clearable placeholder="状态">
        <el-option label="草稿" :value="0" />
        <el-option label="已发布" :value="1" />
      </el-select>
      <el-select v-model="query.approveStatus" clearable placeholder="审核">
        <el-option label="待审核" value="WAIT" />
        <el-option label="通过" value="PASS" />
        <el-option label="拒绝" value="REJECT" />
      </el-select>
      <el-button type="primary" @click="reload">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="records" row-key="id">
      <el-table-column prop="title" label="标题" min-width="240">
        <template #default="{ row }">
          <div class="title-cell">
            <NuxtLink :to="`/tech/${row.id}`">{{ row.title || '-' }}</NuxtLink>
            <span v-if="row.description">{{ row.description }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="categoryName" label="分类" width="140" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审核" width="110">
        <template #default="{ row }">
          <el-tag :type="approveType(row.approveStatus)">
            {{ approveLabel(row.approveStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新" width="170">
        <template #default="{ row }">{{ formatDate(row.updateAt || row.createAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <NuxtLink :to="`/article/edit/${row.id}`" class="table-link">编辑</NuxtLink>
            <el-button link type="danger" @click="deleteArticle(row as UserArticleItem)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />
  </div>
</template>

<script setup lang="ts">
import type { UserArticleItem } from '~/services/article-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const articleApi = useArticleApi()
const loading = ref(false)
const records = ref<UserArticleItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = 10

const query = reactive({
  title: '',
  status: null as number | null,
  approveStatus: '',
})

function approveLabel(status?: string) {
  if (status === 'PASS') return '通过'
  if (status === 'REJECT') return '拒绝'
  if (status === 'WAIT') return '待审核'
  return '未提交'
}

function approveType(status?: string) {
  if (status === 'PASS') return 'success'
  if (status === 'REJECT') return 'danger'
  if (status === 'WAIT') return 'warning'
  return 'info'
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

async function fetchData() {
  loading.value = true
  try {
    const page = await articleApi.getMyArticles({
      pageNum: pageNum.value,
      pageSize,
      title: query.title,
      status: query.status,
      approveStatus: query.approveStatus,
    })
    records.value = page.list
    total.value = page.total
  } catch {
    ElMessage?.error?.('文章加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  pageNum.value = 1
  fetchData()
}

async function deleteArticle(row: UserArticleItem) {
  try {
    await ElMessageBox?.confirm?.('删除后不可恢复，是否继续？', '删除文章', { type: 'warning' })
    const ok = await articleApi.deleteMyArticle(row.id)
    if (ok) {
      ElMessage?.success?.('已删除')
      fetchData()
    }
  } catch {
    // cancel
  }
}

watch(pageNum, fetchData)
onMounted(fetchData)

useHead({ title: '我的文章 - ch-wiki' })
</script>

<style scoped>
.list-page {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.page-header h1 {
  margin: 0 0 6px;
  font-size: 22px;
  color: #303133;
}
.page-header p {
  margin: 0;
  color: #909399;
  font-size: 13px;
}
.primary-link,
.table-link {
  color: #409eff;
  text-decoration: none;
}
/* 操作列：用 inline-flex 统一基线和间距，
 避免 <a>(inline) 和 <button>(inline-block) 混排时基线/间距不齐 */
.table-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.table-actions .table-link {
  margin: 0;
}
.filter-bar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 140px 140px 88px;
  gap: 12px;
  margin-bottom: 16px;
}
.title-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title-cell span {
  color: #909399;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 768px) {
  .page-header,
  .filter-bar {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
  .page-header {
    flex-direction: column;
  }
}
</style>
