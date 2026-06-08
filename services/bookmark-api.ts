import type { ApiResult } from './api-client'
import { extractData, useApiClient } from './api-client'
import type { PageResponse } from './article-api'

export interface BookmarkItem {
  id: number
  type?: string
  name: string
  mark?: string
  href?: string
  sort?: number
  status?: string
  markAt?: string
  createAt?: string
  updateAt?: string
}

export interface BookmarkQuery {
  pageNum?: number
  pageSize?: number
  type?: string
  name?: string
  mark?: string
}

export interface BookmarkCreateRequest {
  type?: string
  name: string
  mark?: string
  href?: string
  sort?: number
  status?: string
}

function toPage<T>(data: PageResponse<T> | null): { list: T[]; total: number } {
  return {
    list: data?.rows || data?.list || [],
    total: data?.total || 0,
  }
}

export function useBookmarkApi() {
  const client = useApiClient()

  return {
    async getBookmarks(params: BookmarkQuery) {
      const pageNum = params.pageNum || 1
      const pageSize = params.pageSize || 10
      const { data: resp } = await client.get<ApiResult<PageResponse<BookmarkItem>>>(
        `/api/bookmarks/${pageNum}/${pageSize}`,
        { params: { type: params.type, name: params.name, mark: params.mark } },
      )
      return toPage(extractData(resp))
    },

    async createBookmark(request: BookmarkCreateRequest) {
      const { data: resp } = await client.post<ApiResult<boolean>>('/api/bookmarks', request)
      return extractData(resp)
    },

    async deleteBookmark(id: number) {
      const { data: resp } = await client.delete<ApiResult<boolean>>(`/api/bookmarks/${id}`)
      return extractData(resp)
    },
  }
}
