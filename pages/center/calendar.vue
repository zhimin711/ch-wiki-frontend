<template>
  <div class="calendar-page">
    <div class="page-header">
      <div>
        <h1>我的日程</h1>
        <p>按月查看个人任务安排。</p>
      </div>
      <div class="header-actions">
        <div class="month-actions">
          <el-button @click="shiftMonth(-1)">上月</el-button>
          <strong>{{ monthTitle }}</strong>
          <el-button @click="shiftMonth(1)">下月</el-button>
        </div>
        <el-button @click="openUnscheduledDialog">未排日程</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog()">新建任务</el-button>
      </div>
    </div>

    <div class="calendar-grid week-header">
      <span v-for="day in weekDays" :key="day">{{ day }}</span>
    </div>

    <div v-loading="loading" class="calendar-grid month-grid">
      <button
        v-for="day in days"
        :key="day.key"
        class="day-cell"
        :class="{
          muted: !day.inMonth,
          today: day.isToday,
          holiday: day.calendarInfo?.legalHoliday,
          adjust: day.calendarInfo?.adjustWorkday,
          weekend: day.date.getDay() === 0 || day.date.getDay() === 6,
        }"
        type="button"
        @click="selectDay(day.key)"
      >
        <span class="day-heading">
          <span class="day-number" :class="{ 'is-today': day.isToday }">
            <span v-if="day.isToday" class="today-dot" aria-hidden="true" />
            {{ day.date.getDate() }}
          </span>
          <span v-if="day.calendarInfo?.legalHoliday" class="day-flag holiday-flag">休</span>
          <span v-else-if="day.calendarInfo?.adjustWorkday" class="day-flag adjust-flag">班</span>
        </span>
        <span class="lunar-line">{{ day.calendarInfo?.lunarDate || '' }}</span>
        <span v-if="calendarMarker(day.calendarInfo)" class="calendar-marker">
          {{ calendarMarker(day.calendarInfo) }}
        </span>
        <span v-for="item in tasksByDay[day.key]?.slice(0, 3)" :key="item.id" class="event-dot" :class="`status-${taskStatusCode(item.status)}`">
          <span class="event-dot__bar" :class="`status-${taskStatusCode(item.status)}`" aria-hidden="true" />
          {{ item.title }}
        </span>
        <span v-if="(tasksByDay[day.key]?.length || 0) > 3" class="more">+{{ (tasksByDay[day.key]?.length || 0) - 3 }} 更多</span>
      </button>
    </div>

    <el-dialog v-model="dialogVisible" :title="selectedDateTitle" width="560px">
      <el-empty v-if="selectedTasks.length === 0" description="当天暂无任务" />
      <div v-else class="task-list">
        <div v-for="item in selectedTasks" :key="item.id" class="task-row" :class="`task-row--status-${taskStatusCode(item.status)}`">
          <span class="task-row__bar" aria-hidden="true" />
          <div class="task-main">
            <strong>{{ item.title }}</strong>
            <p v-if="item.detail" class="task-detail">{{ item.detail }}</p>
            <p class="task-time">{{ formatRange(item.planStartTime, item.planEndTime) }}</p>
          </div>
          <div class="task-actions">
            <el-tag :type="taskStatusType(item.status)">{{ taskStatusLabel(item.status) }}</el-tag>
            <!-- 未完成（0）和进行中（1）都允许点击「完成」 -->
            <el-button
              v-if="taskStatusCode(item.status) === 0 || taskStatusCode(item.status) === 1"
              link
              type="success"
              @click.stop="updateStatus(item, 2)"
            >完成</el-button>
            <!-- 只有未完成（0）才显示「开始」 -->
            <el-button
              v-if="taskStatusCode(item.status) === 0"
              link
              type="warning"
              @click.stop="updateStatus(item, 1)"
            >开始</el-button>
            <el-button v-if="taskStatusCode(item.status) !== 3" link type="primary" @click.stop="openEditDialog(item)">编辑</el-button>
            <el-button link type="danger" @click.stop="deleteTask(item)">删除</el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog(selectedDate)">为当天新建任务</el-button>
      </template>
    </el-dialog>

    <!-- 任务表单弹窗（创建/编辑共用） -->
    <el-dialog
      v-model="formDialogVisible"
      :title="editingId ? '编辑任务' : '新建任务'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入任务标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.categoryCode" placeholder="选择分类" style="width: 100%">
            <el-option
              v-for="opt in categoryOptions"
              :key="opt.code"
              :value="opt.code"
              :label="`${opt.image} ${opt.name}`"
            >
              <span style="margin-right: 6px">{{ opt.image }}</span>{{ opt.name }}
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="form.planDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-time-picker
            v-model="form.planStartTime"
            value-format="HH:mm"
            format="HH:mm"
            placeholder="开始时间（可选）"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-time-picker
            v-model="form.planEndTime"
            value-format="HH:mm"
            format="HH:mm"
            placeholder="结束时间（可选）"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="详情">
          <el-input
            v-model="form.detail"
            type="textarea"
            :rows="3"
            placeholder="任务详情（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSaving" @click="submitForm">
          {{ editingId ? '保存修改' : '创建任务' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 未排日程弹窗：通过 /api/tasks + unscheduled=true 标识筛选 planDate 为空的任务 -->
    <el-dialog
      v-model="unscheduledDialogVisible"
      title="未排日程"
      width="640px"
    >
      <div v-loading="unscheduledLoading">
        <el-empty
          v-if="!unscheduledLoading && unscheduledRecords.length === 0"
          description="暂无未排日程的任务"
        />
        <div v-else class="task-list">
          <div v-for="item in unscheduledRecords" :key="item.id" class="task-row" :class="`task-row--status-${taskStatusCode(item.status)}`">
            <span class="task-row__bar" aria-hidden="true" />
            <div class="task-main">
              <strong>{{ item.title }}</strong>
              <p v-if="item.detail" class="task-detail">{{ item.detail }}</p>
              <p v-if="item.category" class="task-time">{{ item.category }}</p>
            </div>
            <div class="task-actions">
              <el-tag :type="taskStatusType(item.status)">{{ taskStatusLabel(item.status) }}</el-tag>
              <el-button
                v-if="taskStatusCode(item.status) !== 3"
                link
                type="primary"
                @click="openEditFromUnscheduled(item)"
              >编辑</el-button>
              <el-button link type="danger" @click="deleteUnscheduled(item)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
      <CommonPagination
        v-if="unscheduledDialogVisible"
        v-model="unscheduledPageNum"
        :total="unscheduledTotal"
        :page-size="unscheduledPageSize"
      />
      <template #footer>
        <el-button @click="unscheduledDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { TaskItem, TaskStatusCode, TaskSaveRequest } from '~/services/task-api'
import type { PublicCalendarDayDTO } from '~/services/public-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

interface CalendarDay {
  key: string
  date: Date
  inMonth: boolean
  isToday: boolean
  calendarInfo?: PublicCalendarDayDTO
}

const taskApi = useTaskApi()
const { getCalendarMonth } = usePublicApi()
const loading = ref(false)
const currentMonth = ref(startOfMonth(new Date()))
const tasks = ref<TaskItem[]>([])
const calendarByDate = ref<Record<string, PublicCalendarDayDTO>>({})
const selectedDate = ref('')
const dialogVisible = ref(false)
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const monthTitle = computed(() => `${currentMonth.value.getFullYear()}年${currentMonth.value.getMonth() + 1}月`)

const days = computed(() => {
  const first = startOfMonth(currentMonth.value)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return {
      key: toDateKey(date),
      date,
      inMonth: date.getMonth() === currentMonth.value.getMonth(),
      isToday: toDateKey(date) === toDateKey(new Date()),
      calendarInfo: calendarByDate.value[toDateKey(date)],
    }
  })
})

const tasksByDay = computed(() => {
  const grouped: Record<string, TaskItem[]> = {}
  for (const item of tasks.value) {
    const key = toDateKey(item.planStartTime ? new Date(item.planStartTime) : new Date())
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }
  return grouped
})

const selectedTasks = computed(() => tasksByDay.value[selectedDate.value] || [])
const selectedDateTitle = computed(() => selectedDate.value || '日程')

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function toDateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function toMonthKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

function calendarMarker(day?: PublicCalendarDayDTO) {
  if (!day) return ''
  if (day.solarTerm) return day.solarTerm
  const festival = (day.festivals || []).find(item => item !== '传统节日' && item !== '法定假日')
  return festival || ''
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

function formatRange(start?: string, end?: string) {
  return `${formatDate(start)} - ${formatDate(end)}`
}

function monthRange() {
  const visibleDays = days.value
  const first = visibleDays[0]?.date || currentMonth.value
  const last = visibleDays[visibleDays.length - 1]?.date || currentMonth.value
  const end = new Date(last)
  end.setHours(23, 59, 59, 999)
  return { start: first.toISOString(), end: end.toISOString() }
}

async function fetchData() {
  loading.value = true
  try {
    const range = monthRange()
    const [calendarMap, taskRows] = await Promise.all([
      fetchCalendarInfo(),
      taskApi.getCalendarTasks(range.start, range.end),
    ])
    calendarByDate.value = calendarMap
    tasks.value = taskRows
  } catch {
    ElMessage?.error?.('日程加载失败')
  } finally {
    loading.value = false
  }
}

async function fetchCalendarInfo() {
  const months = new Map<string, Date>()
  for (const day of days.value) {
    months.set(toMonthKey(day.date), day.date)
  }
  const result: Record<string, PublicCalendarDayDTO> = {}
  await Promise.all(Array.from(months.values()).map(async (date) => {
    const month = await getCalendarMonth(date.getFullYear(), date.getMonth() + 1)
    for (const item of month?.days || []) {
      result[item.date] = item
    }
  }))
  return result
}

function shiftMonth(offset: number) {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + offset, 1)
  fetchData()
}

function selectDay(key: string) {
  selectedDate.value = key
  dialogVisible.value = true
}

async function updateStatus(row: TaskItem, status: TaskStatusCode) {
  try {
    const ok = await taskApi.updateTaskStatus(row.id, status)
    if (ok) {
      ElMessage?.success?.('状态已更新')
      dialogVisible.value = false
      fetchData()
    }
  } catch {
    ElMessage?.error?.('状态更新失败')
  }
}

// --- 未排日程列表：通过 /api/tasks + unscheduled=true 查询 planDate 为空的任务 ---
const unscheduledDialogVisible = ref(false)
const unscheduledLoading = ref(false)
const unscheduledRecords = ref<TaskItem[]>([])
const unscheduledTotal = ref(0)
const unscheduledPageNum = ref(1)
const unscheduledPageSize = 10

async function fetchUnscheduled() {
  unscheduledLoading.value = true
  try {
    const page = await taskApi.getTasks({
      pageNum: unscheduledPageNum.value,
      pageSize: unscheduledPageSize,
      // 关键标识：告诉后端只查未排日期的任务
      unscheduled: true,
    })
    unscheduledRecords.value = page.list
    unscheduledTotal.value = page.total
  } catch {
    ElMessage?.error?.('未排日程加载失败')
  } finally {
    unscheduledLoading.value = false
  }
}

function openUnscheduledDialog() {
  unscheduledPageNum.value = 1
  unscheduledDialogVisible.value = true
  fetchUnscheduled()
}

function openEditFromUnscheduled(task: TaskItem) {
  // 先关掉未排日程弹窗，避免双层 dialog 动画打架
  unscheduledDialogVisible.value = false
  openEditDialog(task)
}

async function deleteUnscheduled(task: TaskItem) {
  try {
    await ElMessageBox.confirm(`确定删除任务「${task.title}」吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    const ok = await taskApi.deleteTask(task.id)
    if (ok) {
      ElMessage.success('任务已删除')
      // 重新拉一次列表，保持与后端同步
      fetchUnscheduled()
    }
  } catch (err) {
    ElMessage.error('删除失败：' + ((err as Error)?.message || '未知错误'))
  }
}

// 监听翻页，重新拉数据
watch(unscheduledPageNum, fetchUnscheduled)

// --- 任务表单（创建/编辑共用） ---

const categoryOptions = [
  { code: 'work', name: '工作', image: '💼' },
  { code: 'study', name: '学习', image: '📚' },
  { code: 'life', name: '生活', image: '🏠' },
  { code: 'health', name: '健康', image: '💪' },
  { code: 'other', name: '其他', image: '📌' },
]

const formDialogVisible = ref(false)
const formSaving = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<any>(null)
const form = ref({
  title: '',
  detail: '',
  planDate: '',
  planStartTime: '',
  planEndTime: '',
  categoryCode: 'other',
})
const rules = {
  title: [{ required: true, message: '请输入任务标题', trigger: 'blur' }],
}

function resetForm() {
  form.value.title = ''
  form.value.detail = ''
  form.value.planDate = ''
  form.value.planStartTime = ''
  form.value.planEndTime = ''
  form.value.categoryCode = 'other'
  editingId.value = null
  formRef.value?.clearValidate?.()
}

function openCreateDialog(prefillDate?: string) {
  resetForm()
  if (prefillDate) {
    form.value.planDate = prefillDate
  }
  formDialogVisible.value = true
  nextTick(() => {
    dialogVisible.value = false
  })
}

function openEditDialog(task: TaskItem) {
  try {
    resetForm()
    editingId.value = task.id
    // 逐字段赋值，避免 form.value = {...} 替换对象引用导致 el-form 不刷新
    form.value.title = task.title || ''
    form.value.detail = task.detail || ''
    form.value.planDate = toDateString(task.planDate) || toDateString(task.planStartTime)
    form.value.planStartTime = toTimeString(task.planStartTime)
    form.value.planEndTime = toTimeString(task.planEndTime)
    form.value.categoryCode = task.category || 'other'
    formDialogVisible.value = true
    // 延后关闭当天弹窗，避免双层 dialog 关闭动画打架
    nextTick(() => {
      dialogVisible.value = false
    })
  } catch (err) {
    console.error('[calendar] openEditDialog failed', err)
    ElMessage.error('打开编辑失败：' + ((err as Error)?.message || '未知错误'))
  }
}

// 工具：把任意可解析的时间值转成 HH:mm（原生 time input 期望的格式）
// 注意：使用本地时间分量，不用 toISOString（避免 UTC 时区把凌晨/深夜推到前一天/后一天）
function toTimeString(value: string | number | Date | undefined | null): string {
  if (value === null || value === undefined || value === '') return ''
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 工具：把任意可解析的时间值转成本地 YYYY-MM-DD
function toDateString(value: string | number | Date | undefined | null): string {
  if (value === null || value === undefined || value === '') return ''
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 工具：把 HH:mm 或 HH:mm:ss 统一补成 HH:mm:ss
function normalizeTime(value: string): string {
  if (!value) return ''
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value
  return ''
}

async function submitForm() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  // 校验：设置了开始/结束时间时，日期必填
  if ((form.value.planStartTime || form.value.planEndTime) && !form.value.planDate) {
    ElMessage?.error?.('设置了开始/结束时间时，日期不能为空')
    return
  }
  // 校验：结束 > 开始
  if (form.value.planStartTime && form.value.planEndTime) {
    const toSec = (s: string) => {
      const [h, m, sec] = s.split(':').map(Number)
      return h * 3600 + m * 60 + (sec || 0)
    }
    if (toSec(form.value.planEndTime) <= toSec(form.value.planStartTime)) {
      ElMessage?.error?.('结束时间必须晚于开始时间')
      return
    }
  }

  formSaving.value = true
  try {
    const cat = categoryOptions.find(c => c.code === form.value.categoryCode)
    const date = form.value.planDate
    const startT = normalizeTime(form.value.planStartTime)
    const endT = normalizeTime(form.value.planEndTime)
    const request: TaskSaveRequest = {
      id: editingId.value ?? undefined,
      title: form.value.title.trim(),
      detail: form.value.detail.trim() || undefined,
      planDate: date || null,
      planStartTime: startT ? `${date}T${startT}` : null,
      planEndTime: endT ? `${date}T${endT}` : null,
      category: cat ? { code: cat.code, name: cat.name, image: cat.image } : undefined,
    }

    if (editingId.value) {
      await taskApi.updateTask(request)
      ElMessage?.success?.('任务已更新')
    } else {
      await taskApi.createTask(request)
      ElMessage?.success?.('任务已创建')
    }

    formDialogVisible.value = false
    fetchData()
  } catch {
    ElMessage?.error?.(editingId.value ? '更新失败' : '创建失败')
  } finally {
    formSaving.value = false
  }
}

async function deleteTask(task: TaskItem) {
  try {
    await ElMessageBox.confirm(`确定删除任务「${task.title}」吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    const ok = await taskApi.deleteTask(task.id)
    if (ok) {
      ElMessage.success('任务已删除')
      dialogVisible.value = false
      fetchData()
    }
  } catch (err) {
    ElMessage.error('删除失败：' + ((err as Error)?.message || '未知错误'))
  }
}

onMounted(fetchData)

useHead({ title: '我的日程 - ch-wiki' })
</script>

<style scoped>
/* =========================================================
   整体卡片化:外层用圆角白底,内嵌的 header / 网格也走同一调色板,
   形成层次柔和的"面板"感。
   ========================================================= */
.calendar-page {
  background: #ffffff;
  border-radius: 14px;
  padding: 24px 28px 28px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04);
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.page-header h1 {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 600;
  color: #1f2329;
  letter-spacing: 0.3px;
}
.page-header p {
  margin: 0;
  color: #86909c;
  font-size: 13px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 月份切换:pill 化容器,中央大字号显示当前年月 */
.month-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: #f2f3f5;
}
.month-actions :deep(.el-button) {
  border: none;
  background: transparent;
  color: #4e5969;
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 999px;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.month-actions :deep(.el-button:hover) {
  background: rgba(64, 158, 255, 0.12);
  color: #1677b8;
}
.month-actions strong {
  display: inline-flex;
  align-items: center;
  min-width: 130px;
  height: 30px;
  padding: 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  background: #ffffff;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

/* =========================================================
   网格整体:圆角与外层卡片呼应,表头与日期格分隔线柔和
   ========================================================= */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  background: #f5f7fa;
}
.week-header {
  background: #fafbfc;
  border-bottom: 1px solid #ebeef5;
}
.week-header span {
  padding: 12px 8px;
  text-align: center;
  color: #4e5969;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.4px;
}
.week-header span:first-child,
.week-header span:last-child {
  color: #f5222d;
}
.month-grid {
  background: #ebeef5;
  gap: 1px;
  border-top: 0;
}

/* =========================================================
   日期单元格
   ========================================================= */
.day-cell {
  position: relative;
  min-height: 116px;
  padding: 8px 8px 10px;
  border: 0;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}
.day-cell:hover {
  background: #f5f9ff;
  box-shadow: inset 0 0 0 1px #c6dafc;
  z-index: 1;
}
.day-cell:focus-visible {
  outline: 0;
  box-shadow: inset 0 0 0 2px #409eff;
}

/* 周末(六/日)默认弱化 */
.day-cell.weekend:not(.muted):not(.today) .day-number {
  color: #c45656;
}

/* 法定休 / 调休班 */
.day-cell.holiday:not(.muted) {
  background: #fff8f1;
}
.day-cell.adjust:not(.muted) {
  background: #f1f6ff;
}
.day-cell.muted {
  background: #f7f8fa;
  color: #b0b3ba;
}
.day-cell.muted.holiday {
  background: #fdf5ed;
}
.day-cell.muted.adjust {
  background: #f0f4fd;
}

/* 今天:左上角小蓝点 + 数字加粗 */
.day-cell.today {
  background: linear-gradient(180deg, #e8f3ff 0%, #f6fbff 100%);
}
.day-cell.today:hover {
  background: linear-gradient(180deg, #d6e8ff 0%, #e8f3ff 100%);
}
.day-cell .is-today {
  position: relative;
  font-weight: 700;
  color: #1677b8 !important;
}
.today-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #1677b8;
  margin-right: 4px;
  vertical-align: middle;
  position: relative;
  top: -2px;
}

.day-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 22px;
}
.day-number {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}
.day-flag {
  flex: 0 0 auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 4px;
  text-align: center;
  line-height: 18px;
  font-size: 11px;
  font-weight: 600;
}
.holiday-flag {
  color: #c4561d;
  background: #ffe1c2;
}
.adjust-flag {
  color: #2458a6;
  background: #d3e2ff;
}

.lunar-line,
.calendar-marker,
.event-dot,
.more {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lunar-line {
  min-height: 16px;
  color: #a3a8b3;
  font-size: 11px;
  line-height: 16px;
}
.calendar-marker {
  color: #c4561d;
  font-size: 11px;
  line-height: 14px;
  font-weight: 500;
}

/* =========================================================
   任务事件行:左侧小色条 + 文字胶囊
   ========================================================= */
.event-dot {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  padding: 2px 6px 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 18px;
  color: #303133;
  background: #f3f4f5;
  max-width: 100%;
}
.event-dot__bar {
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 3px;
  border-radius: 2px;
  background: #c9cdd4;
}
.event-dot.status-0 {
  background: #fff4e0;
  color: #8a5a14;
}
.event-dot.status-0 .event-dot__bar,
.event-dot__bar.status-0 {
  background: #f59e0b;
}
.event-dot.status-1 {
  background: #e8f3ff;
  color: #1d4ed8;
}
.event-dot.status-1 .event-dot__bar,
.event-dot__bar.status-1 {
  background: #3b82f6;
}
.event-dot.status-2 {
  background: #ebfae1;
  color: #1f7a3b;
}
.event-dot.status-2 .event-dot__bar,
.event-dot__bar.status-2 {
  background: #22c55e;
}
.event-dot.status-3 {
  background: #f1f2f4;
  color: #8c939c;
  text-decoration: line-through;
  text-decoration-color: rgba(140, 147, 156, 0.5);
}
.event-dot.status-3 .event-dot__bar,
.event-dot__bar.status-3 {
  background: #b6b9c0;
}

.more {
  margin-top: 2px;
  color: #86909c;
  font-size: 11px;
  line-height: 16px;
}

/* =========================================================
   任务弹窗列表:左侧色条 + 状态圆点,视觉层次更清晰
   ========================================================= */
.task-list {
  display: flex;
  flex-direction: column;
  max-height: 60vh;
  overflow-y: auto;
}
.task-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px 14px 22px;
  border-bottom: 1px solid #f0f2f5;
  transition: background-color 0.15s ease;
}
.task-row:last-child {
  border-bottom: 0;
}
.task-row:hover {
  background: #fafbfc;
}
.task-row__bar {
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: #c9cdd4;
}
.task-row--status-0 .task-row__bar { background: #f59e0b; }
.task-row--status-1 .task-row__bar { background: #3b82f6; }
.task-row--status-2 .task-row__bar { background: #22c55e; }
.task-row--status-3 .task-row__bar { background: #b6b9c0; }

.task-main {
  flex: 1;
  min-width: 0;
}
.task-main strong {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
  word-break: break-word;
}
.task-detail {
  margin: 4px 0 0;
  color: #4e5969;
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.task-time {
  margin: 6px 0 0;
  color: #86909c;
  font-size: 12px;
}
.task-row p {
  margin: 6px 0 0;
  color: #86909c;
  font-size: 13px;
}
.task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* el-time-picker 弹层里只显示 时/分 两列 */
:deep(.el-time-spinner) {
  grid-template-columns: repeat(2, 1fr) !important;
}
:deep(.el-time-spinner__wrapper:nth-child(3)) {
  display: none !important;
}
:deep(.el-time-panel__footer .el-time-panel__btn.confirm) {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 768px) {
  .page-header,
  .task-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .day-cell {
    min-height: 90px;
    padding: 6px;
  }
  .event-dot {
    padding: 2px 4px 2px 6px;
    font-size: 11px;
  }
  .month-actions strong {
    min-width: 100px;
    font-size: 14px;
  }
}
</style>
