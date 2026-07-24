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
            <el-checkbox-button
              v-for="day in weekdayOptions"
              :key="day.value"
              :value="day.value"
              :disabled="form.skipWeekend && isWeekendValue(day.value)"
            >
              {{ day.label }}
            </el-checkbox-button>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item v-if="form.type === 'WEEK'" label="跳过日期">
          <div class="skip-options">
            <el-checkbox v-model="form.skipWeekend">跳过周末</el-checkbox>
            <el-checkbox v-model="form.skipHoliday">跳过法定节假日</el-checkbox>
          </div>
        </el-form-item>

        <el-form-item v-if="form.type === 'INTERVAL'" label="间隔天数" prop="intervalDays">
          <div class="interval-row">
            <el-input-number v-model="form.intervalDays" :min="1" :max="3650" :precision="0" />
            <span>天</span>
          </div>
        </el-form-item>

        <el-form-item v-if="form.type === 'INTERVAL'" label="顺延规则">
          <el-checkbox v-model="form.workdayDelay">遇工作日顺延</el-checkbox>
        </el-form-item>

        <el-form-item v-if="form.type === 'MONTH'" label="每月执行日" prop="planDate">
          <el-date-picker v-model="form.planDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期，以日期中的日为准" />
        </el-form-item>

        <el-form-item v-if="form.type === 'MONTH'" label="月计划规则">
          <div class="month-options">
            <el-checkbox v-model="form.weekendDelay">遇周末顺延</el-checkbox>
            <el-checkbox v-model="form.workdayDelay">遇工作日顺延</el-checkbox>
            <el-segmented v-model="form.monthDayPolicy" :options="monthDayPolicyOptions" />
          </div>
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
              class="time-select"
              start="05:00"
              step="00:15"
              end="23:45"
              placeholder="开始时间"
            />
            <span>至</span>
            <el-time-select
              v-model="form.endTime"
              class="time-select"
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
import type { MonthDayPolicy, PlanItem, PlanSaveRequest, PlanType } from '~/services/plan-api'
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
  { label: '每 N 天', value: 'INTERVAL' },
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
const weekendValues = ['1', '7']
const monthDayPolicyOptions: Array<{ label: string; value: MonthDayPolicy }> = [
  { label: '当月无该日跳过', value: 'SKIP' },
  { label: '往前推到月底', value: 'LAST_DAY' },
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
  intervalDays: 1,
  workdays: [] as string[],
  skipWeekend: false,
  skipHoliday: false,
  weekendDelay: false,
  workdayDelay: false,
  monthDayPolicy: 'SKIP' as MonthDayPolicy,
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
  intervalDays: [{
    validator: (_rule, _value, callback) => {
      if (form.type === 'INTERVAL' && (!form.intervalDays || form.intervalDays < 1 || form.intervalDays > 3650)) {
        callback(new Error('请输入1到3650之间的间隔天数'))
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
  if (row.type === 'INTERVAL') {
    const labels = intervalRuleLabels(row)
    const schedule = `每 ${row.intervalDays || '-'} 天`
    return labels.length ? `${schedule}（${labels.join('、')}）` : schedule
  }
  if (row.type === 'WEEK') {
    const labels = (row.workdays || '')
      .split(',')
      .map(value => weekdayOptions.find(day => day.value === value)?.label)
      .filter(Boolean)
    const skipLabels = weeklySkipLabels(row)
    const schedule = labels.join('、') || '-'
    return skipLabels.length ? `${schedule}（${skipLabels.join('、')}）` : schedule
  }
  const date = new Date(row.planDate || '')
  if (Number.isNaN(date.getTime())) return '-'
  if (row.type === 'MONTH') {
    const labels = monthRuleLabels(row)
    const schedule = `每月 ${date.getDate()} 日`
    return labels.length ? `${schedule}（${labels.join('、')}）` : schedule
  }
  const calendar = row.lunarCalendar ? '农历' : '公历'
  return `${calendar} ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

function intervalRuleLabels(row: PlanItem) {
  const labels: string[] = []
  if (row.workdayDelay) labels.push('遇工作日顺延')
  return labels
}

function monthRuleLabels(row: PlanItem) {
  const labels: string[] = []
  if (row.weekendDelay) labels.push('遇周末顺延')
  if (row.workdayDelay) labels.push('遇工作日顺延')
  if (row.monthDayPolicy === 'LAST_DAY') labels.push('无该日往前推到月底')
  else labels.push('无该日跳过')
  return labels
}

function weeklySkipLabels(row: PlanItem) {
  const labels: string[] = []
  if (row.skipWeekend) labels.push('跳过周末')
  if (row.skipHoliday) labels.push('跳过法定节假日')
  return labels
}

function isWeekendValue(value: string) {
  return weekendValues.includes(value)
}

function applySkipWeekend() {
  if (!form.skipWeekend) return
  form.workdays = form.workdays.filter(value => !isWeekendValue(value))
}

function resetSchedule() {
  form.planDate = ''
  form.intervalDays = 1
  form.workdays = []
  form.skipWeekend = false
  form.skipHoliday = false
  form.weekendDelay = false
  form.workdayDelay = false
  form.monthDayPolicy = 'SKIP'
  form.lunarCalendar = false
  formRef.value?.clearValidate?.(['planDate', 'intervalDays', 'workdays'])
}

function resetForm() {
  editingId.value = null
  form.type = 'DAY'
  form.title = ''
  form.detail = ''
  form.activeRange = []
  form.planDate = ''
  form.intervalDays = 1
  form.workdays = []
  form.skipWeekend = false
  form.skipHoliday = false
  form.weekendDelay = false
  form.workdayDelay = false
  form.monthDayPolicy = 'SKIP'
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
  form.intervalDays = row.intervalDays || 1
  form.workdays = row.workdays ? row.workdays.split(',') : []
  form.skipWeekend = Boolean(row.skipWeekend)
  form.skipHoliday = Boolean(row.skipHoliday)
  form.weekendDelay = Boolean(row.weekendDelay)
  form.workdayDelay = Boolean(row.workdayDelay)
  form.monthDayPolicy = row.monthDayPolicy || 'SKIP'
  applySkipWeekend()
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
    intervalDays: form.type === 'INTERVAL' ? form.intervalDays : null,
    workdays: form.type === 'WEEK' ? [...form.workdays].sort().join(',') : null,
    skipWeekend: form.type === 'WEEK' && form.skipWeekend,
    skipHoliday: form.type === 'WEEK' && form.skipHoliday,
    weekendDelay: form.type === 'MONTH' && form.weekendDelay,
    workdayDelay: (form.type === 'MONTH' || form.type === 'INTERVAL') && form.workdayDelay,
    monthDayPolicy: form.type === 'MONTH' ? form.monthDayPolicy : null,
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
watch(() => form.skipWeekend, () => {
  applySkipWeekend()
  formRef.value?.validateField?.('workdays')
})
watch(() => form.weekendDelay, (value) => {
  if (value) form.workdayDelay = false
})
watch(() => form.workdayDelay, (value) => {
  if (value) form.weekendDelay = false
})
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
.interval-row,
.skip-options,
.month-options,
.year-date-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.time-select {
  flex: 0 0 136px;
  width: 136px;
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
  .interval-row,
  .skip-options,
  .month-options,
  .year-date-row {
    align-items: flex-start;
    flex-direction: column;
    width: 100%;
  }
}
</style>
