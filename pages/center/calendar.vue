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
        :class="{ muted: !day.inMonth, today: day.isToday }"
        type="button"
        @click="selectDay(day.key)"
      >
        <span class="day-number">{{ day.date.getDate() }}</span>
        <span v-for="item in tasksByDay[day.key]?.slice(0, 3)" :key="item.id" class="event-dot" :class="`status-${taskStatusCode(item.status)}`">
          {{ item.title }}
        </span>
        <span v-if="(tasksByDay[day.key]?.length || 0) > 3" class="more">+{{ (tasksByDay[day.key]?.length || 0) - 3 }}</span>
      </button>
    </div>

    <el-dialog v-model="dialogVisible" :title="selectedDateTitle" width="560px">
      <el-empty v-if="selectedTasks.length === 0" description="当天暂无任务" />
      <div v-else class="task-list">
        <div v-for="item in selectedTasks" :key="item.id" class="task-row">
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
      :z-index="2100"
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
          <el-input
            v-model="form.planDate"
            placeholder="YYYY-MM-DD（点击编辑任务时会自动填入）"
            clearable
          />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-input
            v-model="form.planStartTime"
            type="time"
            placeholder="开始时间（可选）"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-input
            v-model="form.planEndTime"
            type="time"
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
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { TaskItem, TaskStatusCode, TaskSaveRequest } from '~/services/task-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

interface CalendarDay {
  key: string
  date: Date
  inMonth: boolean
  isToday: boolean
}

const taskApi = useTaskApi()
const loading = ref(false)
const currentMonth = ref(startOfMonth(new Date()))
const tasks = ref<TaskItem[]>([])
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
    tasks.value = await taskApi.getCalendarTasks(range.start, range.end)
  } catch {
    ElMessage?.error?.('日程加载失败')
  } finally {
    loading.value = false
  }
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
.calendar-page {
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
  flex-wrap: wrap;
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
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.month-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 原生 input[type=date]，样式与 el-input 对齐 */
.date-input {
  width: 100%;
  height: 32px;
  padding: 4px 11px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text);
  background-color: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
}
.date-input:hover {
  border-color: var(--color-primary-light);
}
.date-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.12);
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
.week-header {
  border: 1px solid #e4e7ed;
  border-bottom: 0;
  background: #f5f7fa;
}
.week-header span {
  padding: 10px;
  text-align: center;
  color: #606266;
  font-size: 13px;
}
.month-grid {
  border-left: 1px solid #e4e7ed;
  border-top: 1px solid #e4e7ed;
}
.day-cell {
  min-height: 112px;
  padding: 8px;
  border: 0;
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  text-align: left;
  cursor: pointer;
}
.day-cell.muted {
  background: #fafafa;
  color: #b0b3ba;
}
.day-cell.today .day-number {
  color: #409eff;
  font-weight: 700;
}
.day-number,
.event-dot,
.more {
  display: block;
}
.event-dot {
  margin-top: 6px;
  padding: 3px 6px;
  border-radius: 4px;
  color: #303133;
  background: #fdf6ec;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.status-1 {
  background: #ecf5ff;
}
.status-2 {
  background: #f0f9eb;
}
.status-3 {
  background: #f4f4f5;
}
.more {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.task-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}
.task-main {
  flex: 1;
  min-width: 0;
}
.task-main strong {
  font-size: 14px;
  color: #303133;
}
.task-detail {
  margin: 4px 0 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.task-time {
  margin: 6px 0 0;
  color: #909399;
  font-size: 12px;
}
.task-row p {
  margin: 6px 0 0;
  color: #909399;
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
@media (max-width: 768px) {
  .page-header,
  .task-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .day-cell {
    min-height: 84px;
    padding: 6px;
  }
  .event-dot {
    padding: 2px 4px;
  }
}
</style>
