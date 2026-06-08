import type { ApiResult } from './api-client'
import { extractData, useApiClient } from './api-client'
import type { PageResponse } from './article-api'

export type PlanType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

export interface PlanItem {
  id: number
  type: PlanType
  title: string
  detail?: string
  lunarCalendar?: boolean
  planDate?: string | null
  workdays?: string | null
  planStartTime: string
  planEndTime: string
  createAt?: string
}

export interface PlanQuery {
  pageNum?: number
  pageSize?: number
  title?: string
  type?: PlanType | ''
}

export interface PlanSaveRequest {
  type: PlanType
  title: string
  detail?: string
  lunarCalendar: boolean
  planDate?: string | null
  workdays?: string | null
  planStartTime: string
  planEndTime: string
}

function toPage<T>(data: PageResponse<T> | null): { list: T[]; total: number } {
  return {
    list: data?.rows || data?.list || [],
    total: data?.total || 0,
  }
}

export function planTypeLabel(type: PlanType) {
  return {
    DAY: '每天',
    WEEK: '每周',
    MONTH: '每月',
    YEAR: '每年',
  }[type]
}

export function usePlanApi() {
  const client = useApiClient()

  return {
    async getPlans(params: PlanQuery) {
      const { data: resp } = await client.get<ApiResult<PageResponse<PlanItem>>>('/api/plans', { params })
      return toPage(extractData(resp))
    },

    async createPlan(request: PlanSaveRequest) {
      const { data: resp } = await client.post<ApiResult<number>>('/api/plans', request)
      return extractData(resp)
    },

    async updatePlan(id: number, request: PlanSaveRequest) {
      const { data: resp } = await client.put<ApiResult<boolean>>(`/api/plans/${id}`, request)
      return extractData(resp)
    },

    async deletePlan(id: number) {
      const { data: resp } = await client.delete<ApiResult<boolean>>(`/api/plans/${id}`)
      return extractData(resp)
    },
  }
}
