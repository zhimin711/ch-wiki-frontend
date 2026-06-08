<template>
  <div class="list-page">
    <div class="page-header">
      <div>
        <h1>我的资源</h1>
        <p>查看自己上传的文档、工具和资料。</p>
      </div>
      <NuxtLink to="/res/add" class="primary-link">上传资源</NuxtLink>
    </div>

    <div class="filter-bar">
      <el-input v-model="query.title" placeholder="资源名称" clearable @keyup.enter="reload" />
      <el-select v-model="query.approveStatus" clearable placeholder="审核状态">
        <el-option label="待审核" value="0" />
        <el-option label="通过" value="1" />
        <el-option label="驳回" value="2" />
        <el-option label="重新审核" value="3" />
      </el-select>
      <el-select v-model="query.status" clearable placeholder="发布状态">
        <el-option label="草稿" value="0" />
        <el-option label="已发布" value="1" />
      </el-select>
      <el-button type="primary" @click="reload">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="records" row-key="id">
      <el-table-column prop="title" label="资源" min-width="260">
        <template #default="{ row }">
          <div class="title-cell">
            <span>{{ row.title || '-' }}</span>
            <small>{{ row.description || row.keywords || '暂无描述' }}</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="categoryName" label="分类" width="140" />
      <el-table-column label="大小" width="100">
        <template #default="{ row }">{{ row.fileSize || '-' }}</template>
      </el-table-column>
      <el-table-column label="展示" width="90">
        <template #default="{ row }">{{ resourceShowModeLabel(row.showMode) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === '1' ? 'success' : 'info'">{{ resourceStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审核" width="110">
        <template #default="{ row }">
          <el-tag :type="resourceApproveType(row.approveStatus)">
            {{ resourceApproveLabel(row.approveStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新" width="170">
        <template #default="{ row }">{{ formatDate(row.updateAt || row.createAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <NuxtLink :to="`/res/edit/${row.id}`" class="table-link">编辑</NuxtLink>
          <a v-if="row.previewUrl" :href="row.previewUrl" class="table-link" target="_blank" rel="noopener noreferrer">预览</a>
          <a v-if="row.downloadUrl" :href="row.downloadUrl" class="table-link" target="_blank" rel="noopener noreferrer">下载</a>
          <el-button link type="danger" @click="deleteResource(row as UserResourceItem)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />
  </div>
</template>

<script setup lang="ts">
import type { UserResourceItem } from '~/services/resource-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const resourceApi = useResourceApi()
const loading = ref(false)
const records = ref<UserResourceItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = 10

const query = reactive({
  title: '',
  approveStatus: '',
  status: '',
})

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

async function fetchData() {
  loading.value = true
  try {
    const page = await resourceApi.getMyResources({
      pageNum: pageNum.value,
      pageSize,
      title: query.title,
      approveStatus: query.approveStatus,
      status: query.status,
    })
    records.value = page.list
    total.value = page.total
  } catch {
    ElMessage?.error?.('资源加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  pageNum.value = 1
  fetchData()
}

async function deleteResource(row: UserResourceItem) {
  try {
    await ElMessageBox?.confirm?.('删除后不可恢复，是否继续？', '删除资源', { type: 'warning' })
    const ok = await resourceApi.deleteMyResource(row.id)
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

useHead({ title: '我的资源 - ch-wiki' })
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
.filter-bar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 150px 130px 88px;
  gap: 12px;
  margin-bottom: 16px;
}
.title-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title-cell small {
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.primary-link,
.table-link {
  color: #409eff;
  text-decoration: none;
  margin-right: 10px;
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
