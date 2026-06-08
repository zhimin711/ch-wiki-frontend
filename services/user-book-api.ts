import type { ApiResult } from './api-client'
import { extractData, useApiClient } from './api-client'
import type { PageResponse } from './article-api'

export type BookContentType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'MIX'

export interface UserBookChapter {
  id: string
  bookId: number
  contentType?: BookContentType
  pid?: string
  pre?: string
  next?: string
  name?: string
  sort?: number
  number?: string
  leaf?: boolean
  status?: number
  srcUrl?: string
  content?: string
  children?: UserBookChapter[]
}

export interface UserBook {
  id: number
  name: string
  author?: string
  title?: string
  type?: string
  classify?: string
  sort?: number
  image?: string
  srcType?: number
  srcUrl?: string
  latestChapter?: string
  latestChapterAt?: string
  latestChapterUrl?: string
  summary?: string
  description?: string
  status?: string
  tags?: string
  released?: boolean
  chapterList?: UserBookChapter[]
}

export interface UserBookQuery {
  pageNum?: number
  pageSize?: number
  title?: string
  type?: string
  status?: string
}

export interface UserBookSaveRequest {
  name: string
  author?: string
  title?: string
  type: string
  classify?: string
  image?: string
  srcType?: number
  srcUrl?: string
  summary?: string
  description?: string
  status?: string
  tags?: string
  released?: boolean
}

export interface UserBookChapterSaveRequest {
  contentType?: BookContentType
  pid?: string | null
  pre?: string
  name?: string
  number?: string
  leaf?: boolean
  status?: number
  srcUrl?: string
  content?: string
}

function toPage<T>(data: PageResponse<T> | null) {
  return {
    list: data?.rows || data?.list || [],
    total: data?.total || 0,
  }
}

export function bookStatusLabel(status?: string) {
  if (status === '0') return '新书'
  if (status === '1') return '连载'
  if (status === '2') return '完结'
  if (status === '4') return '暂无内容'
  return '未知'
}

export function bookTypeLabel(type?: string) {
  if (type === '1') return '小说'
  if (type === '2') return '漫画'
  return '其他'
}

export function flattenBookChapters(chapters: UserBookChapter[] = []): UserBookChapter[] {
  return chapters.flatMap(item => [item, ...flattenBookChapters(item.children || [])])
}

export function useUserBookApi() {
  const client = useApiClient()

  return {
    async getBooks(params: UserBookQuery) {
      const { data } = await client.get<ApiResult<PageResponse<UserBook>>>('/api/user/books', { params })
      return toPage(extractData(data))
    },

    async createBook(request: UserBookSaveRequest) {
      const { data } = await client.post<ApiResult<number>>('/api/user/books', request)
      return extractData(data)
    },

    async getBook(bookId: number) {
      const { data } = await client.get<ApiResult<UserBook>>(`/api/user/books/${bookId}`)
      return extractData(data)
    },

    async updateBook(bookId: number, request: UserBookSaveRequest) {
      const { data } = await client.put<ApiResult<boolean>>(`/api/user/books/${bookId}`, request)
      return extractData(data)
    },

    async deleteBook(bookId: number) {
      const { data } = await client.delete<ApiResult<boolean>>(`/api/user/books/${bookId}`)
      return extractData(data)
    },

    async getChapters(bookId: number) {
      const { data } = await client.get<ApiResult<UserBookChapter[]>>(`/api/user/books/${bookId}/chapters`)
      return extractData(data) || []
    },

    async createChapter(bookId: number, request: UserBookChapterSaveRequest) {
      const { data } = await client.post<ApiResult<string>>(`/api/user/books/${bookId}/chapters`, request)
      return extractData(data)
    },

    async getChapter(bookId: number, chapterId: string) {
      const { data } = await client.get<ApiResult<UserBookChapter>>(
        `/api/user/books/${bookId}/chapters/${encodeURIComponent(chapterId)}`,
      )
      return extractData(data)
    },

    async updateChapter(bookId: number, chapterId: string, request: UserBookChapterSaveRequest) {
      const { data } = await client.put<ApiResult<boolean>>(
        `/api/user/books/${bookId}/chapters/${encodeURIComponent(chapterId)}`,
        request,
      )
      return extractData(data)
    },

    async deleteChapter(bookId: number, chapterId: string) {
      const { data } = await client.delete<ApiResult<boolean>>(
        `/api/user/books/${bookId}/chapters/${encodeURIComponent(chapterId)}`,
      )
      return extractData(data)
    },
  }
}
