<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <h1>图片审核</h1>
      <p>检查图片内容、分类和状态，完成审核后进入公开图片库。</p>
    </header>
    <WorkbenchStatusFilterBar
      v-model:keyword="query.name"
      v-model:status="query.approveStatus"
      keyword-placeholder="图片名称"
      status-placeholder="审核状态"
      :status-options="approveOptions"
      :loading="loading"
      @search="reload"
      @reset="resetFilters"
    >
      <el-input v-model="query.categoryName" placeholder="分类" clearable @keyup.enter="reload" />
    </WorkbenchStatusFilterBar>
    <WorkbenchAdminDataTable
      :rows="records"
      :loading="loading"
      :error="error"
      :page="pageNum"
      :page-size="pageSize"
      :total="total"
      empty-text="没有符合条件的图片"
      @update:page="changePage"
      @update:page-size="changePageSize"
      @retry="fetchData"
    >
      <el-table-column label="预览" width="110" align="center">
        <template #default="{ row }">
          <el-image
            v-if="imageUrl(row as AdminImage)"
            class="image-thumb"
            :src="imageUrl(row as AdminImage)"
            :preview-src-list="[imageUrl(row as AdminImage)]"
            preview-teleported
            fit="cover"
          />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
      <el-table-column prop="categoryName" label="分类" width="150" show-overflow-tooltip />
      <el-table-column prop="tag" label="标签" width="150" show-overflow-tooltip />
      <el-table-column label="审核" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="approveType(row.approveStatus)" size="small">{{ approveLabel(row.approveStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createBy" label="上传者" width="120" show-overflow-tooltip />
      <el-table-column label="上传时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openApprove(row as AdminImage)">审核</el-button>
        </template>
      </el-table-column>
    </WorkbenchAdminDataTable>
    <WorkbenchApproveDialog
      v-model="approveVisible"
      :title="`审核 - ${selected?.name || ''}`"
      :content="imagePreview"
      :loading="actionLoading"
      @approve="submitApprove('1', $event)"
      @reject="submitApprove('4', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { AdminImage } from '~/services/admin-api'

definePageMeta({ layout: 'workbench', middleware: 'admin' })
const adminApi = useAdminApi()
const records = ref<AdminImage[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const approveVisible = ref(false)
const selected = ref<AdminImage | null>(null)
const query = reactive({ name: '', approveStatus: '', categoryName: '' })
const approveOptions = [
  { label: '未审核', value: '0' },
  { label: '通过', value: '1' },
  { label: '驳回', value: '4' },
]
const imagePreview = computed(() => {
  const src = selected.value ? imageUrl(selected.value) : ''
  return src ? `<img src="${escapeAttribute(src)}" alt="" style="display:block;max-width:100%;margin:auto">` : ''
})

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
function imageUrl(row: AdminImage) {
  return row.image || row.url || ''
}
function approveLabel(status?: string) {
  return ({ '0': '未审核', '1': '通过', '4': '驳回' } as Record<string, string>)[status || '0'] || '未审核'
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
    const page = await adminApi.listImages({ pageNum: pageNum.value, pageSize: pageSize.value, ...query })
    records.value = page.list
    total.value = page.total
  } catch (cause) {
    records.value = []
    total.value = 0
    error.value = getAdminErrorMessage(cause, '图片审核 API 尚不可用')
  } finally {
    loading.value = false
  }
}
function reload() {
  pageNum.value = 1
  fetchData()
}
function resetFilters() {
  Object.assign(query, { name: '', approveStatus: '', categoryName: '' })
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
function openApprove(row: AdminImage) {
  selected.value = row
  approveVisible.value = true
}
async function submitApprove(status: '1' | '4', opinion: string) {
  if (!selected.value) return
  actionLoading.value = true
  try {
    await adminApi.approveImage({ srcUid: String(selected.value.id), status, opinion })
    ElMessage.success(status === '1' ? '图片审核通过' : '图片已驳回')
    approveVisible.value = false
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '图片审核失败'))
  } finally {
    actionLoading.value = false
  }
}
onMounted(fetchData)
useHead({ title: '图片审核 - 工作台' })
</script>

<style scoped>
.admin-page { background: #fff; padding: 20px; }
.admin-page__header { margin-bottom: 18px; }
.admin-page__header h1 { margin: 0 0 5px; font-size: 22px; }
.admin-page__header p { margin: 0; color: #606266; font-size: 13px; }
.image-thumb { width: 72px; height: 48px; }
</style>
