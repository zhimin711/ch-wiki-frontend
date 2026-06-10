import type { ApiResult } from './api-client'
import { extractData, useApiClient } from './api-client'
import type { PageResponse } from './article-api'
import type { APIClassifyDTO } from './public-api'

export interface UserResourceItem {
  id: number
  type?: string
  categoryId?: string
  categoryName?: string
  title: string
  image?: string
  keywords?: string
  description?: string
  status?: string
  showMode?: string
  approveStatus?: string
  createAt?: string
  updateAt?: string
  publishAt?: string
  countView?: number
  countComment?: number
  countDownload?: number
  avgScore?: number
  fileSize?: string
  previewUrl?: string
  downloadUrl?: string
}

export interface UserResourceQuery {
  pageNum?: number
  pageSize?: number
  title?: string
  type?: string
  status?: string
  approveStatus?: string
}

export interface UserResourceSaveRequest {
  file?: File | null
  type?: string
  categoryId: string
  title: string
  keywords?: string
  description?: string
  showMode?: string
}

function toPage<T>(data: PageResponse<T> | null): { list: T[]; total: number } {
  return {
    list: data?.rows || data?.list || [],
    total: data?.total || 0,
  }
}

export function resourceApproveLabel(status?: string) {
  if (status === '0') return '待审核'
  if (status === '1') return '通过'
  if (status === '2') return '驳回'
  if (status === '3') return '重新审核'
  return '未提交'
}

export function resourceApproveType(status?: string) {
  if (status === '1') return 'success'
  if (status === '0') return 'warning'
  if (status === '2') return 'danger'
  return 'info'
}

export function resourceStatusLabel(status?: string) {
  if (status === '0') return '草稿'
  if (status === '1') return '已发布'
  if (status === '3') return '已删除'
  return '未知'
}

export function resourceShowModeLabel(showMode?: string) {
  if (showMode === '0') return '隐藏'
  if (showMode === '1') return '公开'
  if (showMode === '2') return '私有'
  return '-'
}

export function useResourceApi() {
  const client = useApiClient()

  function toFormData(request: UserResourceSaveRequest) {
    const data = new FormData()
    if (request.file) data.append('file', request.file)
    data.append('type', request.type || '0')
    data.append('categoryId', request.categoryId)
    data.append('title', request.title)
    data.append('keywords', request.keywords || '')
    data.append('description', request.description || '')
    data.append('showMode', request.showMode || '0')
    return data
  }

  function uploadOptions(onProgress?: (percent: number) => void) {
    return {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: { loaded: number; total?: number }) => {
        if (!onProgress || !event.total) return
        onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)))
      },
    }
  }

  return {
    async getResourceCategories() {
      const { data: resp } = await client.get<ApiResult<APIClassifyDTO[]>>('/api/public/classify/list', {
        params: { bizType: 'resource' },
      })
      return extractData(resp) || []
    },

    async getMyResources(params: UserResourceQuery) {
      const { data: resp } = await client.get<ApiResult<PageResponse<UserResourceItem>>>('/api/user/resources', { params })
      return toPage(extractData(resp))
    },

    async getMyResource(id: number) {
      const { data: resp } = await client.get<ApiResult<UserResourceItem>>(`/api/user/resources/${id}`)
      return extractData(resp)
    },

    async deleteMyResource(id: number) {
      const { data: resp } = await client.delete<ApiResult<boolean>>(`/api/user/resources/${id}`)
      return extractData(resp)
    },

    async createMyResource(request: UserResourceSaveRequest, onProgress?: (percent: number) => void) {
      const { data: resp } = await client.post<ApiResult<UserResourceItem>>(
        '/api/user/resources',
        toFormData(request),
        uploadOptions(onProgress),
      )
      return extractData(resp)
    },

    async updateMyResource(
      id: number,
      request: UserResourceSaveRequest,
      onProgress?: (percent: number) => void,
    ) {
      const { data: resp } = await client.put<ApiResult<UserResourceItem>>(
        `/api/user/resources/${id}`,
        toFormData(request),
        uploadOptions(onProgress),
      )
      return extractData(resp)
    },
  }
}
