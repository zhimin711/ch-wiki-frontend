<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>API Key 配置</h1>
        <p>管理登录加密使用的应用 Key、公钥、有效期和启用状态。</p>
      </div>
      <el-button type="primary" :icon="Key" :loading="generating" @click="generateConfig">
        生成配置
      </el-button>
    </header>

    <el-alert
      class="security-note"
      type="info"
      :closable="false"
      show-icon
      title="私钥只保存在服务端，列表和编辑接口不会返回或接受私钥。"
    />

    <WorkbenchStatusFilterBar
      v-model:keyword="query.apiKey"
      v-model:status="query.status"
      keyword-placeholder="API Key"
      status-placeholder="状态"
      :status-options="statusOptions"
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
      empty-text="暂无 API Key 配置"
      @update:page="changePage"
      @update:page-size="changePageSize"
      @retry="fetchData"
    >
      <el-table-column prop="apiKey" label="API Key" min-width="260" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="key-cell">
            <code>{{ row.apiKey }}</code>
            <el-button link :icon="CopyDocument" title="复制 API Key" @click="copyText(row.apiKey, 'API Key')" />
          </div>
        </template>
      </el-table-column>
      <el-table-column label="公钥" min-width="210">
        <template #default="{ row }">
          <div class="key-cell">
            <code>{{ compactKey(row.publicKey) }}</code>
            <el-button link :icon="CopyDocument" title="复制公钥" @click="copyText(row.publicKey, '公钥')" />
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="过期时间" width="175">
        <template #default="{ row }">
          <span :class="{ expired: isExpired(row.expiredAt) }">{{ formatDate(row.expiredAt, '长期有效') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="175">
        <template #default="{ row }">{{ formatDate(row.updateAt || row.createAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="openEdit(row as AdminApiKeyConfig)">编辑</el-button>
          <el-button
            link
            :type="row.status === '1' ? 'danger' : 'success'"
            :icon="row.status === '1' ? VideoPause : VideoPlay"
            @click="toggleStatus(row as AdminApiKeyConfig)"
          >
            {{ row.status === '1' ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </WorkbenchAdminDataTable>

    <el-dialog v-model="editorVisible" title="编辑 API Key 配置" width="min(560px, 94vw)">
      <el-form label-position="top">
        <el-form-item label="API Key">
          <el-input :model-value="editing.apiKey" disabled />
        </el-form-item>
        <el-form-item label="公钥">
          <el-input :model-value="editing.publicKey" type="textarea" :rows="4" disabled />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="editing.expiredAt"
            type="datetime"
            placeholder="不选择则长期有效"
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-segmented v-model="editing.status" :options="statusOptions" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  CopyDocument,
  Edit,
  Key,
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'
import type { AdminApiKeyConfig } from '~/services/admin-api'

definePageMeta({
  layout: 'workbench',
  middleware: 'admin',
})

const adminApi = useAdminApi()
const records = ref<AdminApiKeyConfig[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const generating = ref(false)
const saving = ref(false)
const error = ref('')
const editorVisible = ref(false)

const query = reactive({
  apiKey: '',
  status: '',
})

const editing = reactive({
  id: '' as string | number,
  apiKey: '',
  publicKey: '',
  expiredAt: null as Date | null,
  status: '1',
})

const statusOptions = [
  { label: '启用', value: '1' },
  { label: '停用', value: '0' },
  { label: '废弃', value: '2' },
]

function statusLabel(status: string) {
  return ({ '0': '停用', '1': '启用', '2': '废弃' } as Record<string, string>)[status] || '未知'
}

function statusType(status: string) {
  if (status === '1') return 'success'
  if (status === '2') return 'warning'
  return 'info'
}

function compactKey(value?: string) {
  if (!value) return '-'
  if (value.length <= 26) return value
  return `${value.slice(0, 12)}...${value.slice(-10)}`
}

function formatDate(value?: string | null, emptyText = '-') {
  return value ? new Date(value).toLocaleString() : emptyText
}

function isExpired(value?: string | null) {
  return Boolean(value && new Date(value).getTime() <= Date.now())
}

async function copyText(value: string, label: string) {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success(`${label}已复制`)
  } catch {
    ElMessage.error(`${label}复制失败`)
  }
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const page = await adminApi.listApiKeyConfigs({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      ...query,
    })
    records.value = page.list
    total.value = page.total
  } catch (cause) {
    records.value = []
    total.value = 0
    error.value = getAdminErrorMessage(cause, 'API Key 配置加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  pageNum.value = 1
  fetchData()
}

function resetFilters() {
  Object.assign(query, { apiKey: '', status: '' })
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

async function generateConfig() {
  try {
    await ElMessageBox.confirm(
      '系统将生成新的应用 Key 和 SM2 密钥对。私钥生成后仅保存在服务端，是否继续？',
      '生成 API Key 配置',
      { type: 'warning', confirmButtonText: '生成' },
    )
  } catch {
    return
  }
  generating.value = true
  try {
    await adminApi.generateApiKeyConfig()
    ElMessage.success('API Key 配置已生成')
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '生成失败'))
  } finally {
    generating.value = false
  }
}

function openEdit(row: AdminApiKeyConfig) {
  Object.assign(editing, {
    id: row.id,
    apiKey: row.apiKey,
    publicKey: row.publicKey,
    expiredAt: row.expiredAt ? new Date(row.expiredAt) : null,
    status: row.status,
  })
  editorVisible.value = true
}

async function saveConfig() {
  saving.value = true
  try {
    await adminApi.updateApiKeyConfig(editing.id, {
      expiredAt: editing.expiredAt,
      status: editing.status,
    })
    ElMessage.success('配置已保存')
    editorVisible.value = false
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '保存失败'))
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row: AdminApiKeyConfig) {
  const nextStatus = row.status === '1' ? '0' : '1'
  const action = nextStatus === '1' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确认${action}该 API Key 配置？`, `${action}配置`, {
      type: 'warning',
      confirmButtonText: action,
    })
  } catch {
    return
  }
  try {
    await adminApi.updateApiKeyConfigStatus(row.id, nextStatus)
    ElMessage.success(`配置已${action}`)
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, `${action}失败`))
  }
}

onMounted(fetchData)
useHead({ title: 'API Key 配置 - 工作台' })
</script>

<style scoped>
.admin-page {
  background: #fff;
  padding: 20px;
}
.admin-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.admin-page__header h1 {
  margin: 0 0 5px;
  font-size: 22px;
}
.admin-page__header p {
  margin: 0;
  color: #606266;
  font-size: 13px;
}
.security-note {
  margin-bottom: 16px;
}
.key-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.key-cell code {
  overflow: hidden;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.expired {
  color: #f56c6c;
}
@media (max-width: 640px) {
  .admin-page__header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
