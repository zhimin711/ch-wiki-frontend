import type { ApiResult, PageResult } from './api-client'
import { extractData, extractPageData, useApiClient } from './api-client'

export interface AdminPageQuery {
  pageNum: number
  pageSize: number
  [key: string]: string | number | boolean | null | undefined
}

export interface AdminArticle {
  id: string | number
  title?: string
  categoryName?: string
  keywords?: string
  description?: string
  author?: string
  image?: string
  showMode?: string
  approveStatus?: string
  recommendType?: number | string
  publishAt?: string
  createAt?: string
  updateAt?: string
}

export interface AdminResource {
  id: string | number
  title?: string
  categoryName?: string
  fileType?: string
  approveStatus?: string
  previewUrl?: string
  downloadUrl?: string
  createBy?: string
  createAt?: string
}

export interface AdminImage {
  id: string | number
  name?: string
  category?: string
  categoryName?: string
  tag?: string
  image?: string
  url?: string
  approveStatus?: string
  status?: string | number
  createBy?: string
  createAt?: string
}

export interface AdminClassify {
  id: string | number
  pid?: string
  code?: string
  name?: string
  bizType?: string
  status?: string | number
  sort?: number
  createAt?: string
  children?: AdminClassify[]
}

export interface AdminSummary {
  pendingArticles?: number
  pendingResources?: number
  pendingImages?: number
  totalClassifies?: number
}

export interface AdminApiKeyConfig {
  id: string | number
  apiKey: string
  publicKey: string
  expiredAt?: string | null
  status: string
  createAt?: string
  updateAt?: string
}

export interface ApiKeyConfigUpdatePayload {
  expiredAt: Date | string | null
  status: string
}

export interface ApprovePayload {
  srcUid: string
  status: '1' | '4'
  opinion?: string
}

export interface RecommendPayload {
  srcUid: string
  type: string
  remark?: string
}

function cleanParams<T extends Record<string, unknown>>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

function unwrap<T>(result: ApiResult<T>, fallback: T): T {
  if (!result.success) throw new Error(result.message || '请求失败')
  return extractData(result) ?? fallback
}

function unwrapPage<T>(result: PageResult<T>) {
  if (!result.success) throw new Error(result.message || '列表加载失败')
  return extractPageData(result)
}

export function getAdminErrorMessage(error: unknown, fallback = '操作失败') {
  const candidate = error as {
    message?: string
    response?: { data?: { message?: string } }
  }
  return candidate?.response?.data?.message || candidate?.message || fallback
}

export function useAdminApi() {
  const client = useApiClient()

  return {
    async getSummary() {
      const { data } = await client.get<ApiResult<AdminSummary>>('/api/admin/reports/summary')
      return unwrap(data, {})
    },
    async listArticles(query: AdminPageQuery) {
      const { data } = await client.get<PageResult<AdminArticle>>('/api/admin/articles', {
        params: cleanParams(query),
      })
      return unwrapPage(data)
    },
    async getArticleContent(id: string | number) {
      const { data } = await client.get<ApiResult<{ content?: string }>>(`/api/admin/articles/${id}/content`)
      return unwrap(data, {})
    },
    async approveArticle(payload: ApprovePayload) {
      const { data } = await client.post<ApiResult<number>>('/api/admin/articles/approve', payload)
      return unwrap(data, 0)
    },
    async recommendArticle(payload: RecommendPayload) {
      const { data } = await client.post<ApiResult<boolean>>('/api/admin/articles/recommend', payload)
      return unwrap(data, false)
    },
    async listResources(query: AdminPageQuery) {
      const { data } = await client.get<PageResult<AdminResource>>('/api/admin/resources', {
        params: cleanParams(query),
      })
      return unwrapPage(data)
    },
    async approveResource(payload: ApprovePayload) {
      const { data } = await client.post<ApiResult<number>>('/api/admin/resources/approve', payload)
      return unwrap(data, 0)
    },
    async listImages(query: AdminPageQuery) {
      const { data } = await client.get<PageResult<AdminImage>>('/api/admin/images', {
        params: cleanParams(query),
      })
      return unwrapPage(data)
    },
    async approveImage(payload: ApprovePayload) {
      const { data } = await client.post<ApiResult<number>>('/api/admin/images/approve', payload)
      return unwrap(data, 0)
    },
    async updateImage(id: string | number, payload: Partial<AdminImage>) {
      const { data } = await client.put<ApiResult<AdminImage>>(`/api/admin/images/${id}`, payload)
      return unwrap(data, {} as AdminImage)
    },
    async listClassifies(query: AdminPageQuery) {
      const { data } = await client.get<PageResult<AdminClassify>>('/api/admin/classifies', {
        params: cleanParams(query),
      })
      return unwrapPage(data)
    },
    async createClassify(payload: Partial<AdminClassify>) {
      const { data } = await client.post<ApiResult<AdminClassify>>('/api/admin/classifies', payload)
      return unwrap(data, {} as AdminClassify)
    },
    async updateClassify(id: string | number, payload: Partial<AdminClassify>) {
      const { data } = await client.put<ApiResult<AdminClassify>>(`/api/admin/classifies/${id}`, payload)
      return unwrap(data, {} as AdminClassify)
    },
    async listApiKeyConfigs(query: AdminPageQuery) {
      const { data } = await client.get<PageResult<AdminApiKeyConfig>>('/api/admin/api-key-configs', {
        params: cleanParams(query),
      })
      return unwrapPage(data)
    },
    async generateApiKeyConfig() {
      const { data } = await client.post<ApiResult<AdminApiKeyConfig>>('/api/admin/api-key-configs/generate')
      return unwrap(data, {} as AdminApiKeyConfig)
    },
    async updateApiKeyConfig(id: string | number, payload: ApiKeyConfigUpdatePayload) {
      const { data } = await client.put<ApiResult<boolean>>(`/api/admin/api-key-configs/${id}`, payload)
      return unwrap(data, false)
    },
    async updateApiKeyConfigStatus(id: string | number, status: string) {
      const { data } = await client.patch<ApiResult<boolean>>(`/api/admin/api-key-configs/${id}/status`, { status })
      return unwrap(data, false)
    },
  }
}
