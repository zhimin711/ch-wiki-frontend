import type { ApiResult } from './api-client'
import { extractData, requireData, useApiClient } from './api-client'
import type { PageResponse } from './article-api'
import type { APIClassifyDTO } from './public-api'

export type BookContentType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'MIX'
export type UserBookType = 'TEXT' | 'IMAGE'

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
  classifyName?: string
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

export interface ChapterImportResponse {
  imageUrls: string[]
  count: number
  scaled: boolean
  content: string
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
  if (normalizeBookType(type) === 'TEXT') return '文字类型'
  if (normalizeBookType(type) === 'IMAGE') return '图画类型'
  return '未知'
}

export function normalizeBookType(type?: string): UserBookType | '' {
  const value = `${type || ''}`.trim().toUpperCase()
  if (value === 'TEXT' || value === '1' || value === '0') return 'TEXT'
  if (value === 'IMAGE' || value === '2' || value === '3') return 'IMAGE'
  return ''
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

    async getBookClassifies() {
      const { data } = await client.get<ApiResult<APIClassifyDTO[]>>('/api/public/classify/list', {
        params: { bizType: 'BOOK' },
      })
      return extractData(data) || []
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

    async fixCatalog(bookId: number) {
      const { data } = await client.post<ApiResult<boolean>>(`/api/user/books/${bookId}/fix`)
      return extractData(data)
    },

    async getChapters(bookId: number) {
      const { data } = await client.get<ApiResult<UserBookChapter[]>>(`/api/user/books/${bookId}/chapters`)
      return extractData(data) || []
    },

    async createChapter(bookId: number, request: UserBookChapterSaveRequest) {
      const { data } = await client.post<ApiResult<string>>(`/api/user/books/${bookId}/chapters`, request)
      // 用 requireData 而非 extractData,success=false 时抛错,
      // 让页面 try/catch 能弹后端的 message（例如 "上一章节参数错误/无效-..."）
      return requireData(data)
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

    async importChapterZip(
      bookId: number,
      chapterId: string,
      file: File,
      onProgress?: (percent: number) => void,
    ): Promise<ChapterImportResponse> {
      const form = new FormData()
      form.append('file', file)
      const { data } = await client.post<ApiResult<ChapterImportResponse>>(
        `/api/user/books/${bookId}/chapters/${encodeURIComponent(chapterId)}/import`,
        form,
        {
          headers: { 'Content-Type': undefined as any },
          timeout: 5 * 60 * 1000,
          onUploadProgress: (event) => {
            if (!onProgress || !event.total) return
            onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)))
          },
        },
      )
      return extractData(data)
    },
  }
}
