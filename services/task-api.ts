import type { ApiResult } from './api-client'
import { extractData, useApiClient } from './api-client'
import type { PageResponse } from './article-api'

export type TaskStatusCode = 0 | 1 | 2 | 3
export type TaskStatusName = 'WAIT' | 'PROCESSING' | 'DONE' | 'CANCEL'

export interface TaskItem {
  id: number
  type?: string
  title: string
  detail?: string
  planDate?: string
  planStartTime?: string
  planEndTime?: string
  startTime?: string
  endTime?: string
  status?: TaskStatusCode | TaskStatusName
  category?: string
}

export interface TaskQuery {
  pageNum?: number
  pageSize?: number
  title?: string
  category?: string
  status?: TaskStatusCode | null
  start?: string
  end?: string
  /** 仅查询未排日期的任务（planDate 为空），由后端按此标识过滤 */
  unscheduled?: boolean
}

export interface TaskSaveRequest {
  id?: number
  title: string
  detail?: string
  planDate?: string | null
  planStartTime?: string | null
  planEndTime?: string | null
  category?: {
    code: string
    name: string
    image: string
  }
}

function toPage<T>(data: PageResponse<T> | null): { list: T[]; total: number } {
  return {
    list: data?.rows || data?.list || [],
    total: data?.total || 0,
  }
}

function toRows<T>(data: T[] | null | undefined): T[] {
  return Array.isArray(data) ? data : []
}

export function taskStatusCode(status?: TaskStatusCode | TaskStatusName): TaskStatusCode {
  if (status === 'WAIT') return 0
  if (status === 'PROCESSING') return 1
  if (status === 'DONE') return 2
  if (status === 'CANCEL') return 3
  return typeof status === 'number' ? status : 0
}

export function taskStatusName(status?: TaskStatusCode | TaskStatusName): TaskStatusName {
  const code = taskStatusCode(status)
  if (code === 1) return 'PROCESSING'
  if (code === 2) return 'DONE'
  if (code === 3) return 'CANCEL'
  return 'WAIT'
}

export function taskStatusLabel(status?: TaskStatusCode | TaskStatusName) {
  const code = taskStatusCode(status)
  if (code === 1) return '进行中'
  if (code === 2) return '已完成'
  if (code === 3) return '已取消'
  return '未完成'
}

export function taskStatusType(status?: TaskStatusCode | TaskStatusName) {
  const code = taskStatusCode(status)
  if (code === 1) return 'primary'
  if (code === 2) return 'success'
  if (code === 3) return 'info'
  return 'warning'
}

export function useTaskApi() {
  const client = useApiClient()

  return {
    async getTasks(params: TaskQuery) {
      const { data: resp } = await client.get<ApiResult<PageResponse<TaskItem>>>('/api/tasks', { params })
      return toPage(extractData(resp))
    },

    async getTodayTasks() {
      const { data: resp } = await client.get<ApiResult<TaskItem[]>>('/api/tasks/today')
      return toRows(extractData(resp))
    },

    async getCalendarTasks(start: string, end: string) {
      const { data: resp } = await client.get<ApiResult<TaskItem[]>>('/api/user/calendar', { params: { start, end } })
      return toRows(extractData(resp))
    },

    async createTask(request: TaskSaveRequest) {
      const { data: resp } = await client.post<ApiResult<number>>('/api/tasks', request)
      return extractData(resp)
    },

    async updateTask(request: TaskSaveRequest) {
      const { data: resp } = await client.put<ApiResult<boolean>>('/api/tasks', request)
      return extractData(resp)
    },

    async updateTaskStatus(id: number, status: TaskStatusCode | TaskStatusName) {
      const { data: resp } = await client.put<ApiResult<boolean>>(`/api/tasks/${id}/${taskStatusName(status)}`)
      return extractData(resp)
    },

    async deleteTask(id: number) {
      const { data: resp } = await client.delete<ApiResult<boolean>>(`/api/tasks/${id}`)
      return extractData(resp)
    },
  }
}
