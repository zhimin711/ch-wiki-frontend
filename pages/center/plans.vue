<template>
  <div class="plans-page">
    <div class="page-header">
      <div>
        <h1>周期计划</h1>
        <p>设置重复执行的个人计划。</p>
      </div>
      <el-button type="primary" @click="openCreate">新增计划</el-button>
    </div>

    <div class="filter-bar">
      <el-input v-model="query.title" placeholder="计划主题" clearable @keyup.enter="reload" />
      <el-select v-model="query.type" clearable placeholder="周期类型">
        <el-option v-for="option in typeOptions" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
      <el-button type="primary" @click="reload">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="records" row-key="id">
      <el-table-column label="周期" width="90">
        <template #default="{ row }">
          <el-tag>{{ planTypeLabel((row as PlanItem).type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="计划" min-width="220">
        <template #default="{ row }">
          <div class="title-cell">
            <strong>{{ row.title }}</strong>
            <small>{{ row.detail || '暂无内容' }}</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="执行日期" min-width="150">
        <template #default="{ row }">
          {{ scheduleLabel(row as PlanItem) }}
        </template>
      </el-table-column>
      <el-table-column label="执行时段" min-width="150">
        <template #default="{ row }">
          {{ timeRangeLabel(row as PlanItem) }}
        </template>
      </el-table-column>
      <el-table-column label="有效期" min-width="220">
        <template #default="{ row }">
          {{ activeRangeLabel(row as PlanItem) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row as PlanItem)">编辑</el-button>
          <el-button link type="danger" @click="deletePlan(row as PlanItem)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑周期计划' : '新增周期计划'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="周期类型" prop="type">
          <el-segmented v-model="form.type" :options="typeOptions" @change="resetSchedule" />
        </el-form-item>

        <el-form-item label="计划有效期" prop="activeRange">
          <el-date-picker
            v-model="form.activeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item v-if="form.type === 'WEEK'" label="每周执行日" prop="workdays">
          <el-checkbox-group v-model="form.workdays">
            <el-checkbox-button v-for="day in weekdayOptions" :key="day.value" :value="day.value">
              {{ day.label }}
            </el-checkbox-button>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item v-if="form.type === 'MONTH'" label="每月执行日" prop="planDate">
          <el-date-picker v-model="form.planDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期，以日期中的日为准" />
        </el-form-item>

        <el-form-item v-if="form.type === 'YEAR'" label="每年执行日" prop="planDate">
          <div class="year-date-row">
            <el-date-picker v-model="form.planDate" type="date" value-format="YYYY-MM-DD" placeholder="选择月和日" />
            <el-checkbox v-model="form.lunarCalendar">使用农历</el-checkbox>
          </div>
        </el-form-item>

        <el-form-item label="每日执行时段" prop="startTime">
          <div class="time-range">
            <el-time-select
              v-model="form.startTime"
              start="05:00"
              step="00:15"
              end="23:45"
              placeholder="开始时间"
            />
            <span>至</span>
            <el-time-select
              v-model="form.endTime"
              start="05:00"
              step="00:15"
              end="23:45"
              :min-time="form.startTime"
              placeholder="结束时间"
            />
          </div>
        </el-form-item>

        <el-form-item label="计划主题" prop="title">
          <el-input v-model="form.title" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="计划内容" prop="detail">
          <el-input v-model="form.detail" type="textarea" :rows="4" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="savePlan">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormRules } from 'element-plus'
import type { PlanItem, PlanSaveRequest, PlanType } from '~/services/plan-api'
import { planTypeLabel } from '~/services/plan-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const planApi = usePlanApi()
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const formRef = ref()
const records = ref<PlanItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = 10
const editingId = ref<number | null>(null)

const typeOptions: Array<{ label: string; value: PlanType }> = [
  { label: '每天', value: 'DAY' },
  { label: '每周', value: 'WEEK' },
  { label: '每月', value: 'MONTH' },
  { label: '每年', value: 'YEAR' },
]

const weekdayOptions = [
  { label: '周日', value: '1' },
  { label: '周一', value: '2' },
  { label: '周二', value: '3' },
  { label: '周三', value: '4' },
  { label: '周四', value: '5' },
  { label: '周五', value: '6' },
  { label: '周六', value: '7' },
]

const query = reactive({
  title: '',
  type: '' as PlanType | '',
})

const form = reactive({
  type: 'DAY' as PlanType,
  title: '',
  detail: '',
  activeRange: [] as string[],
  planDate: '',
  workdays: [] as string[],
  lunarCalendar: false,
  startTime: '',
  endTime: '',
})

const rules: FormRules = {
  type: [{ required: true, message: '请选择周期类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入计划主题', trigger: 'blur' }],
  activeRange: [{ required: true, message: '请选择计划有效期', trigger: 'change' }],
  startTime: [{
    validator: (_rule, _value, callback) => {
      if (!form.startTime || !form.endTime) callback(new Error('请选择每日执行时段'))
      else if (form.endTime <= form.startTime) callback(new Error('结束时间必须晚于开始时间'))
      else callback()
    },
    trigger: 'change',
  }],
  planDate: [{
    validator: (_rule, _value, callback) => {
      if ((form.type === 'MONTH' || form.type === 'YEAR') && !form.planDate) {
        callback(new Error('请选择执行日期'))
      } else {
        callback()
      }
    },
    trigger: 'change',
  }],
  workdays: [{
    validator: (_rule, _value, callback) => {
      if (form.type === 'WEEK' && form.workdays.length === 0) callback(new Error('请选择每周执行日'))
      else callback()
    },
    trigger: 'change',
  }],
}

function datePart(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function timePart(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toIso(date: string, time = '00:00') {
  return new Date(`${date}T${time}:00`).toISOString()
}

function activeRangeLabel(row: PlanItem) {
  return `${datePart(row.planStartTime)} 至 ${datePart(row.planEndTime)}`
}

function timeRangeLabel(row: PlanItem) {
  return `${timePart(row.planStartTime)} - ${timePart(row.planEndTime)}`
}

function scheduleLabel(row: PlanItem) {
  if (row.type === 'DAY') return '每天'
  if (row.type === 'WEEK') {
    const labels = (row.workdays || '')
      .split(',')
      .map(value => weekdayOptions.find(day => day.value === value)?.label)
      .filter(Boolean)
    return labels.join('、') || '-'
  }
  const date = new Date(row.planDate || '')
  if (Number.isNaN(date.getTime())) return '-'
  if (row.type === 'MONTH') return `每月 ${date.getDate()} 日`
  const calendar = row.lunarCalendar ? '农历' : '公历'
  return `${calendar} ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

function resetSchedule() {
  form.planDate = ''
  form.workdays = []
  form.lunarCalendar = false
  formRef.value?.clearValidate?.(['planDate', 'workdays'])
}

function resetForm() {
  editingId.value = null
  form.type = 'DAY'
  form.title = ''
  form.detail = ''
  form.activeRange = []
  form.planDate = ''
  form.workdays = []
  form.lunarCalendar = false
  form.startTime = ''
  form.endTime = ''
  formRef.value?.clearValidate?.()
}

async function fetchData() {
  loading.value = true
  try {
    const page = await planApi.getPlans({
      pageNum: pageNum.value,
      pageSize,
      title: query.title,
      type: query.type,
    })
    records.value = page.list
    total.value = page.total
  } catch {
    ElMessage.error('计划加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  pageNum.value = 1
  fetchData()
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: PlanItem) {
  resetForm()
  editingId.value = row.id
  form.type = row.type
  form.title = row.title || ''
  form.detail = row.detail || ''
  form.activeRange = [datePart(row.planStartTime), datePart(row.planEndTime)]
  form.planDate = datePart(row.planDate)
  form.workdays = row.workdays ? row.workdays.split(',') : []
  form.lunarCalendar = Boolean(row.lunarCalendar)
  form.startTime = timePart(row.planStartTime)
  form.endTime = timePart(row.planEndTime)
  dialogVisible.value = true
}

async function savePlan() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const [startDate, endDate] = form.activeRange
  const payload: PlanSaveRequest = {
    type: form.type,
    title: form.title,
    detail: form.detail,
    lunarCalendar: form.type === 'YEAR' && form.lunarCalendar,
    planDate: form.type === 'MONTH' || form.type === 'YEAR' ? toIso(form.planDate) : null,
    workdays: form.type === 'WEEK' ? [...form.workdays].sort().join(',') : null,
    planStartTime: toIso(startDate, form.startTime),
    planEndTime: toIso(endDate, form.endTime),
  }

  saving.value = true
  try {
    const result = editingId.value
      ? await planApi.updatePlan(editingId.value, payload)
      : await planApi.createPlan(payload)
    if (result) {
      ElMessage.success('计划已保存')
      dialogVisible.value = false
      fetchData()
    }
  } catch {
    ElMessage.error('计划保存失败')
  } finally {
    saving.value = false
  }
}

async function deletePlan(row: PlanItem) {
  try {
    await ElMessageBox.confirm(`确定删除计划“${row.title}”吗？`, '删除计划', { type: 'warning' })
  } catch {
    return
  }

  try {
    const deleted = await planApi.deletePlan(row.id)
    if (!deleted) throw new Error('delete failed')
    ElMessage.success('计划已删除')
    fetchData()
  } catch {
    ElMessage.error('计划删除失败')
  }
}

watch(pageNum, fetchData)
onMounted(fetchData)

useHead({ title: '周期计划 - ch-wiki' })
</script>

<style scoped>
.plans-page {
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
  grid-template-columns: minmax(180px, 1fr) 150px 88px;
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
}
.time-range,
.year-date-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
@media (max-width: 768px) {
  .plans-page {
    padding: 16px;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .filter-bar {
    grid-template-columns: 1fr;
  }
  .time-range,
  .year-date-row {
    align-items: flex-start;
    flex-direction: column;
    width: 100%;
  }
}
</style>
