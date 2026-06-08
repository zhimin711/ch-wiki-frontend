import type { ApiResult } from './api-client'
import { extractData, useApiClient } from './api-client'
import type { APIClassifyDTO } from './public-api'

export interface PageResponse<T> {
  rows?: T[]
  list?: T[]
  total: number
}

export interface UserArticleItem {
  id: number
  categoryId?: string
  categoryName?: string
  title: string
  href?: string
  image?: string
  keywords?: string
  description?: string
  author?: string
  createAt?: string
  updateAt?: string
  publishAt?: string
  countView?: number
  countComment?: number
  status?: number
  showMode?: string
  approveStatus?: string
  content?: string
}

export interface UserArticleQuery {
  pageNum?: number
  pageSize?: number
  title?: string
  categoryId?: string
  keywords?: string
  status?: number | null
  approveStatus?: string
}

export interface UserArticleSaveRequest {
  id?: number
  categoryId?: string
  title: string
  href?: string
  image?: string
  keywords?: string
  description?: string
  status?: number
  showMode?: string
  content?: string
}

function toPage<T>(data: PageResponse<T> | null): { list: T[]; total: number } {
  return {
    list: data?.rows || data?.list || [],
    total: data?.total || 0,
  }
}

export function useArticleApi() {
  const client = useApiClient()

  return {
    async getArticleCategories() {
      const { data: resp } = await client.get<ApiResult<APIClassifyDTO[]>>('/api/classifies/public', {
        params: { bizType: 'article' },
      })
      return extractData(resp) || []
    },

    async getMyArticles(params: UserArticleQuery) {
      const { data: resp } = await client.get<ApiResult<PageResponse<UserArticleItem>>>('/api/user/articles', { params })
      return toPage(extractData(resp))
    },

    async getMyArticle(id: number) {
      const { data: resp } = await client.get<ApiResult<UserArticleItem>>(`/api/user/articles/${id}`)
      return extractData(resp)
    },

    async getMyArticleContent(id: number) {
      const { data: resp } = await client.get<ApiResult<string>>(`/api/user/articles/${id}/content`)
      return extractData(resp) || ''
    },

    async createMyArticle(request: UserArticleSaveRequest) {
      const { data: resp } = await client.post<ApiResult<number>>('/api/user/articles', request)
      return extractData(resp)
    },

    async updateMyArticle(id: number, request: UserArticleSaveRequest) {
      const { data: resp } = await client.put<ApiResult<boolean>>(`/api/user/articles/${id}`, request)
      return extractData(resp)
    },

    async deleteMyArticle(id: number) {
      const { data: resp } = await client.delete<ApiResult<boolean>>(`/api/user/articles/${id}`)
      return extractData(resp)
    },

    async analyzeArticleUrl(url: string) {
      const { data: resp } = await client.post<ApiResult<Partial<UserArticleSaveRequest>>>('/api/user/articles/analyze-url', { url })
      return extractData(resp)
    },
  }
}
