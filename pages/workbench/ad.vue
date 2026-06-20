<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>广告管理</h1>
        <p>维护首页广告位、跳转链接、展示时间和启用状态。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增广告</el-button>
    </header>

    <WorkbenchStatusFilterBar
      v-model:keyword="query.title"
      v-model:status="query.status"
      keyword-placeholder="广告标题"
      status-placeholder="状态"
      :status-options="statusOptions"
      :loading="loading"
      @search="reload"
      @reset="resetFilters"
    >
      <el-select v-model="query.type" placeholder="广告位置" clearable @change="reload">
        <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="query.srcType" placeholder="来源类型" clearable @change="reload">
        <el-option v-for="item in srcTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </WorkbenchStatusFilterBar>

    <WorkbenchAdminDataTable
      :rows="records"
      :loading="loading"
      :error="error"
      :page="pageNum"
      :page-size="pageSize"
      :total="total"
      empty-text="暂无广告"
      @update:page="changePage"
      @update:page-size="changePageSize"
      @retry="fetchData"
    >
      <el-table-column label="广告" min-width="280">
        <template #default="{ row }">
          <div class="ad-cell">
            <div class="ad-cell__image">
              <img v-if="row.image" :src="previewUrl(row.image)" :alt="row.title || '广告图'" />
              <span v-else>无图</span>
            </div>
            <div class="ad-cell__body">
              <strong>{{ row.title || '-' }}</strong>
              <a v-if="row.url" :href="row.url" target="_blank" rel="noreferrer" class="table-link">
                {{ row.url }}
              </a>
              <span v-else class="muted">未设置链接</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="位置" width="110" align="center">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="来源" width="100" align="center">
        <template #default="{ row }">{{ srcTypeLabel(row.srcType) }}</template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="76" align="center" />
      <el-table-column label="状态" width="86" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '1' ? 'success' : 'info'" size="small">
            {{ row.status === '1' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="展示时间" min-width="230">
        <template #default="{ row }">
          <div class="date-range">
            <span>{{ formatDate(row.validAt, '立即') }}</span>
            <span>{{ formatDate(row.invalidAt, '长期') }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="openEdit(row as AdminAd)">编辑</el-button>
          <el-button
            link
            :type="row.status === '1' ? 'danger' : 'success'"
            :icon="row.status === '1' ? VideoPause : VideoPlay"
            @click="toggleStatus(row as AdminAd)"
          >
            {{ row.status === '1' ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </WorkbenchAdminDataTable>

    <el-dialog v-model="editorVisible" :title="editing.id ? '编辑广告' : '新增广告'" width="min(720px, 94vw)">
      <el-form label-position="top">
        <div class="editor-grid">
          <el-form-item label="广告标题" required>
            <el-input v-model="editing.title" maxlength="120" />
          </el-form-item>
          <el-form-item label="跳转链接" required>
            <el-input v-model="editing.url" maxlength="255" placeholder="https://..." />
          </el-form-item>
        </div>
        <el-form-item label="广告图片">
          <CommonImageUploader
            v-model="editing.image"
            purpose="AD_COVER"
            alt="广告图预览"
            :width="320"
            :height="160"
            hint="支持 jpg / png / webp,建议横向 2:1,大小不超过 5MB"
          />
        </el-form-item>
        <div class="editor-grid editor-grid--thirds">
          <el-form-item label="广告位置">
            <el-select v-model="editing.type">
              <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="来源类型">
            <el-segmented v-model="editing.srcType" :options="srcTypeOptions" />
          </el-form-item>
          <el-form-item label="状态">
            <el-switch v-model="editing.enabled" inline-prompt active-text="启" inactive-text="停" />
          </el-form-item>
        </div>
        <div class="editor-grid">
          <el-form-item label="排序">
            <el-input-number v-model="editing.sort" :min="0" :max="9999" controls-position="right" />
          </el-form-item>
          <el-form-item label="展示时间">
            <el-date-picker
              v-model="editing.activeRange"
              type="datetimerange"
              start-placeholder="生效时间"
              end-placeholder="失效时间"
              clearable
              style="width: 100%"
            />
          </el-form-item>
        </div>
        <el-form-item label="关键字">
          <el-input v-model="editing.keywords" maxlength="255" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editing.description" type="textarea" :rows="3" maxlength="255" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="!canSave" @click="saveAd">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  Edit,
  Plus,
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'
import type { AdminAd } from '~/services/admin-api'
import { normalizeBackendUrl } from '~/composables/useAvatar'

definePageMeta({ layout: 'workbench', middleware: 'admin' })

const adminApi = useAdminApi()
const records = ref<AdminAd[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const editorVisible = ref(false)

const query = reactive({
  title: '',
  status: '',
  type: '',
  srcType: '',
})

const editing = reactive({
  id: '' as string | number,
  type: '1',
  title: '',
  image: '',
  url: '',
  keywords: '',
  sort: 0,
  description: '',
  srcType: '1',
  enabled: true,
  activeRange: [] as Date[] | null,
})

const statusOptions = [
  { label: '启用', value: '1' },
  { label: '停用', value: '0' },
]
const typeOptions = [
  { label: '首页 Top', value: '1' },
  { label: '其他位置', value: '2' },
]
const srcTypeOptions = [
  { label: '文章', value: '0' },
  { label: '广告', value: '1' },
]

const canSave = computed(() => Boolean(editing.title && editing.url))

function previewUrl(value?: string) {
  return normalizeBackendUrl(value || '') || value || ''
}

function typeLabel(value?: string) {
  return typeOptions.find((item) => item.value === value)?.label || value || '-'
}

function srcTypeLabel(value?: string) {
  return srcTypeOptions.find((item) => item.value === value)?.label || value || '-'
}

function formatDate(value?: string | null, emptyText = '-') {
  return value ? new Date(value).toLocaleString() : emptyText
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const page = await adminApi.listAds({ pageNum: pageNum.value, pageSize: pageSize.value, ...query })
    records.value = page.list
    total.value = page.total
  } catch (cause) {
    records.value = []
    total.value = 0
    error.value = getAdminErrorMessage(cause, '广告管理 API 尚不可用')
  } finally {
    loading.value = false
  }
}

function reload() {
  pageNum.value = 1
  fetchData()
}

function resetFilters() {
  Object.assign(query, { title: '', status: '', type: '', srcType: '' })
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

function resetEditor() {
  Object.assign(editing, {
    id: '',
    type: '1',
    title: '',
    image: '',
    url: '',
    keywords: '',
    sort: 0,
    description: '',
    srcType: '1',
    enabled: true,
    activeRange: [],
  })
}

function openCreate() {
  resetEditor()
  editorVisible.value = true
}

function openEdit(row: AdminAd) {
  Object.assign(editing, {
    id: row.id,
    type: row.type || '1',
    title: row.title || '',
    image: row.image || '',
    url: row.url || '',
    keywords: row.keywords || '',
    sort: row.sort || 0,
    description: row.description || '',
    srcType: row.srcType || '1',
    enabled: row.status !== '0',
    activeRange: row.validAt || row.invalidAt
      ? [
          row.validAt ? new Date(row.validAt) : new Date(0),
          row.invalidAt ? new Date(row.invalidAt) : new Date('9999-12-31T23:59:59'),
        ]
      : [],
  })
  editorVisible.value = true
}

function buildPayload() {
  const [validAt, invalidAt] = editing.activeRange || []
  return {
    type: editing.type,
    title: editing.title,
    image: editing.image,
    url: editing.url,
    keywords: editing.keywords,
    sort: editing.sort,
    description: editing.description,
    srcType: editing.srcType,
    status: editing.enabled ? '1' : '0',
    validAt: validAt ? validAt.toISOString() : null,
    invalidAt: invalidAt ? invalidAt.toISOString() : null,
  }
}

async function saveAd() {
  saving.value = true
  try {
    if (editing.id) await adminApi.updateAd(editing.id, buildPayload())
    else await adminApi.createAd(buildPayload())
    ElMessage.success(editing.id ? '广告已更新' : '广告已创建')
    editorVisible.value = false
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '广告保存失败'))
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row: AdminAd) {
  const nextStatus = row.status === '1' ? '0' : '1'
  const action = nextStatus === '1' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确认${action}广告“${row.title || row.id}”？`, `${action}广告`, {
      type: 'warning',
      confirmButtonText: action,
    })
  } catch {
    return
  }
  try {
    await adminApi.updateAdStatus(row.id, nextStatus)
    ElMessage.success(`广告已${action}`)
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, `${action}失败`))
  }
}

onMounted(fetchData)
useHead({ title: '广告管理 - 工作台' })
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
  margin-bottom: 18px;
}
.admin-page__header h1 {
  margin: 0 0 5px;
  font-size: 22px;
}
.admin-page__header p,
.muted {
  margin: 0;
  color: #606266;
  font-size: 13px;
}
.ad-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.ad-cell__image {
  display: flex;
  width: 76px;
  height: 48px;
  flex: 0 0 76px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #f5f7fa;
  color: #909399;
  font-size: 12px;
}
.ad-cell__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ad-cell__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}
.ad-cell__body strong,
.table-link {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.table-link {
  color: #409eff;
  text-decoration: none;
}
.date-range {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
}
.editor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 14px;
}
.editor-grid--thirds {
  grid-template-columns: 1fr 1fr 120px;
}
@media (max-width: 720px) {
  .admin-page__header {
    align-items: stretch;
    flex-direction: column;
  }
  .editor-grid,
  .editor-grid--thirds {
    grid-template-columns: 1fr;
  }
}
</style>
