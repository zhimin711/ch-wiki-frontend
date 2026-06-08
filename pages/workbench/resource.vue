<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <h1>资源审核</h1>
      <p>审核用户上传资源，并通过后端提供的安全入口预览或下载。</p>
    </header>
    <WorkbenchStatusFilterBar
      v-model:keyword="query.title"
      v-model:status="query.approveStatus"
      keyword-placeholder="资源标题"
      status-placeholder="审核状态"
      :status-options="approveOptions"
      :loading="loading"
      @search="reload"
      @reset="resetFilters"
    />
    <WorkbenchAdminDataTable
      :rows="records"
      :loading="loading"
      :error="error"
      :page="pageNum"
      :page-size="pageSize"
      :total="total"
      empty-text="没有符合条件的资源"
      @update:page="changePage"
      @update:page-size="changePageSize"
      @retry="fetchData"
    >
      <el-table-column prop="title" label="资源" min-width="240" show-overflow-tooltip />
      <el-table-column prop="categoryName" label="分类" width="150" show-overflow-tooltip />
      <el-table-column prop="fileType" label="格式" width="90" />
      <el-table-column label="审核" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="approveType(row.approveStatus)" size="small">{{ approveLabel(row.approveStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createBy" label="上传者" width="120" show-overflow-tooltip />
      <el-table-column label="上传时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right" align="center">
        <template #default="{ row }">
          <a v-if="row.previewUrl" :href="row.previewUrl" target="_blank" rel="noopener" class="table-link">预览</a>
          <a v-if="row.downloadUrl" :href="row.downloadUrl" class="table-link">下载</a>
          <el-button link type="primary" @click="openApprove(row as AdminResource)">审核</el-button>
        </template>
      </el-table-column>
    </WorkbenchAdminDataTable>
    <WorkbenchApproveDialog
      v-model="approveVisible"
      :title="`审核 - ${selected?.title || ''}`"
      :content="resourcePreview"
      :loading="actionLoading"
      @approve="submitApprove('1', $event)"
      @reject="submitApprove('4', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { AdminResource } from '~/services/admin-api'

definePageMeta({ layout: 'workbench', middleware: 'admin' })
const adminApi = useAdminApi()
const records = ref<AdminResource[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const approveVisible = ref(false)
const selected = ref<AdminResource | null>(null)
const query = reactive({ title: '', approveStatus: '' })
const approveOptions = [
  { label: '未审核', value: '0' },
  { label: '通过', value: '1' },
  { label: '重提', value: '2' },
  { label: '驳回', value: '4' },
]
const resourcePreview = computed(() => selected.value?.previewUrl
  ? '<p>请使用表格中的“预览”入口检查后端生成的安全预览内容。</p>'
  : '')

function approveLabel(status?: string) {
  return ({ '0': '未审核', '1': '通过', '2': '重提', '4': '驳回' } as Record<string, string>)[status || '0'] || '未审核'
}
function approveType(status?: string) {
  if (status === '1') return 'success'
  if (status === '4') return 'danger'
  return 'warning'
}
function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}
async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const page = await adminApi.listResources({ pageNum: pageNum.value, pageSize: pageSize.value, ...query })
    records.value = page.list
    total.value = page.total
  } catch (cause) {
    records.value = []
    total.value = 0
    error.value = getAdminErrorMessage(cause, '资源审核 API 尚不可用')
  } finally {
    loading.value = false
  }
}
function reload() {
  pageNum.value = 1
  fetchData()
}
function resetFilters() {
  Object.assign(query, { title: '', approveStatus: '' })
  reload()
}
function changePage(value: number) {
  pageNum.value = value
  fetchData()
}
function changePageSize(value: number) {
  pageSize.value = value
  pageNum.value = 1
  fetchData()
}
function openApprove(row: AdminResource) {
  selected.value = row
  approveVisible.value = true
}
async function submitApprove(status: '1' | '4', opinion: string) {
  if (!selected.value) return
  actionLoading.value = true
  try {
    await adminApi.approveResource({ srcUid: String(selected.value.id), status, opinion })
    ElMessage.success(status === '1' ? '资源审核通过' : '资源已驳回')
    approveVisible.value = false
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '资源审核失败'))
  } finally {
    actionLoading.value = false
  }
}
onMounted(fetchData)
useHead({ title: '资源审核 - 工作台' })
</script>

<style scoped>
.admin-page { background: #fff; padding: 20px; }
.admin-page__header { margin-bottom: 18px; }
.admin-page__header h1 { margin: 0 0 5px; font-size: 22px; }
.admin-page__header p { margin: 0; color: #606266; font-size: 13px; }
.table-link { margin-right: 10px; color: #409eff; text-decoration: none; }
</style>
