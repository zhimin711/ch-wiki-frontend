<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>分类管理</h1>
        <p>维护文章、资源和图片使用的公共分类树。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增分类</el-button>
    </header>
    <WorkbenchStatusFilterBar
      v-model:keyword="query.name"
      v-model:status="query.status"
      keyword-placeholder="分类名称或编码"
      status-placeholder="状态"
      :status-options="statusOptions"
      :loading="loading"
      @search="reload"
      @reset="resetFilters"
    >
      <el-input v-model="query.bizType" placeholder="业务类型" clearable @keyup.enter="reload" />
    </WorkbenchStatusFilterBar>
    <WorkbenchAdminDataTable
      :rows="records"
      :loading="loading"
      :error="error"
      :page="pageNum"
      :page-size="pageSize"
      :total="total"
      empty-text="没有符合条件的分类"
      @update:page="changePage"
      @update:page-size="changePageSize"
      @retry="fetchData"
    >
      <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
      <el-table-column prop="code" label="编码" min-width="190" show-overflow-tooltip />
      <el-table-column label="父级分类" min-width="190" show-overflow-tooltip>
        <template #default="{ row }">
          {{ parentPathLabel((row as AdminClassify).pid) }}
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="76" align="center" />
      <el-table-column label="状态" width="86" align="center">
        <template #default="{ row }">
          <el-tag :type="String(row.status) === '1' ? 'success' : 'info'" size="small">
            {{ String(row.status) === '1' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row as AdminClassify)">编辑</el-button>
        </template>
      </el-table-column>
    </WorkbenchAdminDataTable>

    <el-dialog v-model="editorVisible" :title="editing.id ? '编辑分类' : '新增分类'" width="min(560px, 94vw)">
      <el-form label-position="top">
        <el-form-item label="名称" required>
          <el-input v-model="editing.name" maxlength="80" />
        </el-form-item>
        <el-form-item label="编码" :required="!isTopLevelEdit">
          <el-input
            v-model="editing.code"
            maxlength="80"
            :disabled="isTopLevelEdit"
            :placeholder="isTopLevelEdit ? '顶级分类编码不可修改' : ''"
          />
        </el-form-item>
        <div class="editor-grid">
          <el-form-item label="父级分类">
            <el-select
              v-model="editing.pid"
              :loading="parentLoading"
              placeholder="选择父级分类"
              class="parent-select"
            >
              <el-option label="顶级分类" value="0" />
              <el-option
                v-for="item in editableParentOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
                :disabled="item.disabled"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="editing.sort" :min="0" :max="9999" controls-position="right" />
          </el-form-item>
          <el-form-item label="状态">
            <el-switch v-model="editing.enabled" inline-prompt active-text="启" inactive-text="停" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="!editing.name || !editing.code" @click="saveClassify">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import type { AdminClassify } from '~/services/admin-api'

definePageMeta({ layout: 'workbench', middleware: 'admin' })
const adminApi = useAdminApi()
const records = ref<AdminClassify[]>([])
const parentRecords = ref<AdminClassify[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const parentLoading = ref(false)
const saving = ref(false)
const error = ref('')
const editorVisible = ref(false)
const query = reactive({ name: '', status: '', bizType: '' })
const editing = reactive({
  id: '' as string | number,
  name: '',
  code: '',
  pid: '0',
  sort: 0,
  enabled: true,
})
const statusOptions = [
  { label: '启用', value: '1' },
  { label: '停用', value: '0' },
]

interface ParentOption {
  label: string
  value: string
  ids: string[]
  disabled?: boolean
}

const parentOptions = computed<ParentOption[]>(() => flattenParentOptions(parentRecords.value))
const editableParentOptions = computed(() => {
  const currentId = editing.id ? String(editing.id) : ''
  if (!currentId) return parentOptions.value
  return parentOptions.value.map(option => ({
    ...option,
    disabled: option.ids.includes(currentId),
  }))
})

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const page = await adminApi.listClassifies({ pageNum: pageNum.value, pageSize: pageSize.value, ...query })
    records.value = page.list
    total.value = page.total
  } catch (cause) {
    records.value = []
    total.value = 0
    error.value = getAdminErrorMessage(cause, '分类管理 API 尚不可用')
  } finally {
    loading.value = false
  }
}
async function fetchParentOptions() {
  parentLoading.value = true
  try {
    const page = await adminApi.listClassifies({ pageNum: 1, pageSize: 1000, bizType: query.bizType || '' })
    parentRecords.value = page.list
  } catch {
    parentRecords.value = []
  } finally {
    parentLoading.value = false
  }
}
function reload() {
  pageNum.value = 1
  fetchData()
  fetchParentOptions()
}
function resetFilters() {
  Object.assign(query, { name: '', status: '', bizType: '' })
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
  Object.assign(editing, { id: '', name: '', code: '', pid: '0', sort: 0, enabled: true })
}
/** 编辑模式下，pid 为空或 '0'（顶级分类）时编码不可修改 */
const isTopLevelEdit = computed(
  () => !!editing.id && (!editing.pid || editing.pid === '0'),
)
async function openCreate() {
  if (!parentRecords.value.length) await fetchParentOptions()
  resetEditor()
  editorVisible.value = true
}
async function openEdit(row: AdminClassify) {
  if (!parentRecords.value.length) await fetchParentOptions()
  Object.assign(editing, {
    id: row.id,
    name: row.name || '',
    code: row.code || '',
    pid: row.pid || '0',
    sort: row.sort || 0,
    enabled: String(row.status) === '1',
  })
  editorVisible.value = true
}
async function saveClassify() {
  saving.value = true
  const payload = {
    name: editing.name,
    code: editing.code,
    pid: editing.pid || '0',
    sort: editing.sort,
    status: editing.enabled ? '1' : '0',
  }
  try {
    if (editing.id) await adminApi.updateClassify(editing.id, payload)
    else await adminApi.createClassify(payload)
    ElMessage.success(editing.id ? '分类已更新' : '分类已创建')
    editorVisible.value = false
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '分类保存失败'))
  } finally {
    saving.value = false
  }
}
function normalizePid(pid?: string): string {
  if (!pid || pid === '0') return '0'
  const ids = splitPid(pid)
  return ids.length ? ids.join('/') : '0'
}
function splitPid(pid?: string): string[] {
  if (!pid || pid === '0') return []
  return String(pid).split(/[\/,]/).filter(id => id && id !== '0')
}
function buildNodePid(node: AdminClassify, parents: string[]): string {
  return [...parents, String(node.id)].join('/')
}
function flattenParentOptions(
  nodes: AdminClassify[],
  parentIds: string[] = [],
  parentNames: string[] = [],
): ParentOption[] {
  return nodes.flatMap((node) => {
    const name = node.name || node.code || String(node.id)
    const ids = [...parentIds, String(node.id)]
    const names = [...parentNames, name]
    const option: ParentOption = {
      label: names.join(' / '),
      value: buildNodePid(node, parentIds),
      ids,
    }
    return [option, ...flattenParentOptions(node.children || [], ids, names)]
  })
}
function parentPathLabel(pid?: string): string {
  const normalized = normalizePid(pid)
  if (normalized === '0') return '顶级分类'
  return parentOptions.value.find(option => option.value === normalized)?.label || normalized
}
onMounted(() => {
  fetchData()
  fetchParentOptions()
})
useHead({ title: '分类管理 - 工作台' })
</script>

<style scoped>
.admin-page { background: #fff; padding: 20px; }
.admin-page__header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
.admin-page__header h1 { margin: 0 0 5px; font-size: 22px; }
.admin-page__header p { margin: 0; color: #606266; font-size: 13px; }
.editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
.parent-select { width: 100%; }
@media (max-width: 640px) {
  .admin-page__header { align-items: stretch; flex-direction: column; }
  .editor-grid { grid-template-columns: 1fr; }
}
</style>
