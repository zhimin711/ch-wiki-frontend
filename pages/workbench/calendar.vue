<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>日历管理</h1>
        <p>维护节假日和调休规则，并生成指定年份的日历数据。</p>
      </div>
      <div class="header-actions">
        <el-input-number
          v-model="selectedYear"
          :min="1900"
          :max="2999"
          controls-position="right"
          @change="reload"
        />
        <el-button :icon="Refresh" :loading="loading" circle title="刷新" @click="fetchData" />
        <el-button type="primary" :icon="Plus" @click="openCreate">新增规则</el-button>
        <el-button type="success" :icon="Calendar" :loading="generating" @click="generateCalendar">
          生成日历
        </el-button>
      </div>
    </header>

    <el-alert
      v-if="needsGenerate"
      class="calendar-note"
      type="warning"
      :closable="false"
      show-icon
      title="规则已保存，重新生成该年日历后才会应用到日历日数据。"
    />

    <WorkbenchAdminDataTable
      :rows="records"
      :loading="loading"
      :error="error"
      :page="1"
      :page-size="records.length || 10"
      :total="0"
      empty-text="暂无假日规则"
      @retry="fetchData"
    >
      <el-table-column prop="name" label="节日名称" min-width="160" show-overflow-tooltip />
      <el-table-column label="放假日期" min-width="260">
        <template #default="{ row }">
          <div class="date-tags">
            <el-tag
              v-for="date in sortDates(row.holidayDates)"
              :key="date"
              class="date-tag"
              type="success"
              size="small"
            >
              {{ date }}
            </el-tag>
            <span v-if="!row.holidayDates?.length" class="muted">-</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="补班日期" min-width="220">
        <template #default="{ row }">
          <div class="date-tags">
            <el-tag
              v-for="date in sortDates(row.workdayDates)"
              :key="date"
              class="date-tag"
              type="warning"
              size="small"
            >
              {{ date }}
            </el-tag>
            <span v-if="!row.workdayDates?.length" class="muted">-</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="来源" width="104" align="center">
        <template #default="{ row }">
          <el-tag :type="sourceType(row.source)" size="small">{{ sourceLabel(row.source) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="76" align="center" />
      <el-table-column label="操作" width="90" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="openEdit(row as AdminHolidayRule)">编辑</el-button>
        </template>
      </el-table-column>
    </WorkbenchAdminDataTable>

    <el-dialog v-model="editorVisible" :title="editing.id ? '编辑假日规则' : '新增假日规则'" width="min(620px, 94vw)">
      <el-form label-position="top">
        <div class="editor-grid">
          <el-form-item label="年份">
            <el-input :model-value="String(selectedYear)" disabled />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="editing.sort" :min="0" :max="9999" controls-position="right" />
          </el-form-item>
        </div>
        <el-form-item label="名称" required>
          <el-input v-model="editing.name" maxlength="80" placeholder="例如：春节" />
        </el-form-item>
        <el-form-item label="放假日期" required>
          <el-date-picker
            v-model="editing.holidayDates"
            type="dates"
            value-format="YYYY-MM-DD"
            placeholder="选择一个或多个日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="补班日期">
          <el-date-picker
            v-model="editing.workdayDates"
            type="dates"
            value-format="YYYY-MM-DD"
            placeholder="选择一个或多个日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="!canSave" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Calendar, Edit, Plus, Refresh } from '@element-plus/icons-vue'
import type { AdminHolidayRule } from '~/services/admin-api'

definePageMeta({
  layout: 'workbench',
  middleware: 'admin',
})

const adminApi = useAdminApi()
const selectedYear = ref(new Date().getFullYear())
const records = ref<AdminHolidayRule[]>([])
const loading = ref(false)
const generating = ref(false)
const saving = ref(false)
const error = ref('')
const needsGenerate = ref(false)
const editorVisible = ref(false)

const editing = reactive({
  id: '' as string | number,
  name: '',
  sort: 0,
  holidayDates: [] as string[],
  workdayDates: [] as string[],
})

const canSave = computed(() => editing.name.trim().length > 0 && editing.holidayDates.length > 0)

function sortDates(dates?: string[]) {
  return [...(dates || [])].sort((left, right) => left.localeCompare(right))
}

function sourceLabel(source?: string) {
  return source === 'MANUAL' ? '手工' : (source || '系统')
}

function sourceType(source?: string) {
  return source === 'MANUAL' ? 'warning' : 'info'
}

function sortRules(rules: AdminHolidayRule[]) {
  return [...rules].sort((left, right) => {
    const sortDiff = (left.sort ?? 0) - (right.sort ?? 0)
    if (sortDiff !== 0) return sortDiff
    return left.name.localeCompare(right.name, 'zh-CN')
  })
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    records.value = sortRules(await adminApi.listCalendarHolidays(selectedYear.value))
  } catch (cause) {
    records.value = []
    error.value = getAdminErrorMessage(cause, '日历管理 API 加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  needsGenerate.value = false
  fetchData()
}

function resetEditor() {
  Object.assign(editing, {
    id: '',
    name: '',
    sort: records.value.length + 1,
    holidayDates: [],
    workdayDates: [],
  })
}

function openCreate() {
  resetEditor()
  editorVisible.value = true
}

function openEdit(row: AdminHolidayRule) {
  Object.assign(editing, {
    id: row.id || '',
    name: row.name || '',
    sort: row.sort ?? 0,
    holidayDates: sortDates(row.holidayDates),
    workdayDates: sortDates(row.workdayDates),
  })
  editorVisible.value = true
}

async function saveRule() {
  if (!canSave.value) return
  saving.value = true
  try {
    await adminApi.upsertCalendarHoliday({
      id: editing.id || undefined,
      year: selectedYear.value,
      name: editing.name.trim(),
      sort: editing.sort,
      holidayDates: sortDates(editing.holidayDates),
      workdayDates: sortDates(editing.workdayDates),
      source: 'MANUAL',
    })
    ElMessage.success('假日规则已保存')
    needsGenerate.value = true
    editorVisible.value = false
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '假日规则保存失败'))
  } finally {
    saving.value = false
  }
}

async function generateCalendar() {
  try {
    await ElMessageBox.confirm(
      `将按当前规则生成 ${selectedYear.value} 年日历数据，是否继续？`,
      '生成日历',
      { type: 'warning', confirmButtonText: '生成' },
    )
  } catch {
    return
  }
  generating.value = true
  try {
    const days = await adminApi.generateCalendarYear(selectedYear.value)
    ElMessage.success(`已生成 ${days} 天日历数据`)
    needsGenerate.value = false
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '日历生成失败'))
  } finally {
    generating.value = false
  }
}

onMounted(fetchData)
useHead({ title: '日历管理 - 工作台' })
</script>

<style scoped>
.admin-page { background: #fff; padding: 20px; }
.admin-page__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}
.admin-page__header h1 { margin: 0 0 5px; font-size: 22px; }
.admin-page__header p { margin: 0; color: #606266; font-size: 13px; }
.header-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.calendar-note { margin-bottom: 16px; }
.date-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
  align-items: center;
}
.date-tag { margin: 0; }
.muted { color: #909399; }
.editor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 14px;
}
@media (max-width: 720px) {
  .admin-page__header { align-items: stretch; flex-direction: column; }
  .header-actions { justify-content: flex-start; }
  .editor-grid { grid-template-columns: 1fr; }
}
</style>
