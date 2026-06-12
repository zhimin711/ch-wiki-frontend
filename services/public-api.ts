import type { ApiResult, PageResult } from './api-client'
import { extractData, extractPageData, useApiClient } from './api-client'
import { normalizeBackendUrl } from '~/composables/useAvatar'

export interface PublicHomeAdItem {
  id: number
  type: string
  title: string
  image: string
  url: string
  srcType: string
  description: string
}

export interface PublicArticleRef {
  id: number
  title: string
  image: string
  description: string
  categoryName: string
  author: string
  publishAt: number | null
  countView: number
  countComment: number
}

export interface PublicHomeDTO {
  ads: PublicHomeAdItem[]
  latestArticles: PublicArticleRef[]
  goodArticles: PublicArticleRef[]
  recommendArticles: PublicArticleRef[]
}

export interface PublicArticleCardDTO {
  id: number
  categoryName: string
  title: string
  href: string
  image: string
  keywords: string
  description: string
  author: string
  publishAt: number | null
  countView: number
  countComment: number
  avgScore: number
}

export interface PublicArticleDetailDTO {
  id: number
  categoryId: string
  categoryName: string
  title: string
  href: string
  image: string
  keywords: string
  description: string
  author: string
  authorAvatar: string
  authorRemark: string
  publishAt: number | null
  countView: number
  countComment: number
  avgScore: number
  content: string
  recommendArticles: PublicArticleCardDTO[]
}

export interface PublicResourceCardDTO {
  id: number
  type: string
  categoryName: string
  title: string
  image: string
  keywords: string
  description: string
  author: string
  publishAt: number | null
  countView: number
  countComment: number
  countDownload: number
  avgScore: number
}

export interface PublicResourceDetailDTO {
  id: number
  type: string
  categoryId: string
  categoryName: string
  title: string
  image: string
  keywords: string
  description: string
  author: string
  publishAt: number | null
  countView: number
  countComment: number
  countDownload: number
  avgScore: number
  downloadUrl: string | null
  previewUrl: string | null
}

export interface SafeFileLink {
  label: string
  previewUrl: string
  downloadUrl: string
  fileType: string
  fileSize: number
  canPreview: boolean
  canDownload: boolean
}

export interface PublicImageDTO {
  id: number
  name: string
  path: string
  category: string
  tag: string
  description: string
  createAt: number | null
}

export interface APIClassifyDTO {
  id: number
  pid: string
  code: string
  name: string
  image: string
  scope: string
  sort: number
  children: APIClassifyDTO[]
}

export interface PublicBookCardDTO {
  id: number
  name: string
  author: string
  title: string
  type: string
  classify: string
  image: string
  summary: string
  description: string
  latestChapter: string
  latestChapterAt: number | null
  status: string
  tags: string
}

export interface PublicBookDetailDTO {
  id: number
  name: string
  author: string
  title: string
  type: string
  classify: string
  image: string
  summary: string
  description: string
  latestChapter: string
  latestChapterAt: number | null
  status: string
  tags: string
  chapters: PublicBookChapterDTO[]
}

export interface PublicBookChapterDTO {
  id: string
  bookId: number
  name: string
  number: string
  pre: string
  next: string
  content: string
  children: PublicBookChapterDTO[]
}

const emptyPage = { list: [], total: 0 }

async function safeData<T>(request: () => Promise<ApiResult<T>>): Promise<T | null> {
  try {
    return extractData(await request())
  } catch {
    return null
  }
}

async function safePage<T>(request: () => Promise<PageResult<T>>): Promise<{ list: T[]; total: number }> {
  try {
    return extractPageData(await request())
  } catch {
    return emptyPage
  }
}

function safeFileName(url: string | null | undefined): string {
  if (!url) return ''
  const clean = url.split('?')[0].split('#')[0]
  return decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1))
}

function fileTypeFromUrl(url: string | null | undefined): string {
  const name = safeFileName(url).toLowerCase()
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.substring(dot + 1) : ''
}

export function buildDocPreviewUrl(file: string | null | undefined): string {
  const normalized = normalizeBackendUrl(file)
  if (!normalized) return ''
  return `/doc/preview?file=${encodeURIComponent(normalized)}`
}

export function toSafeFileLink(resource: Pick<PublicResourceDetailDTO, 'title' | 'downloadUrl' | 'previewUrl'>): SafeFileLink {
  const previewUrl = normalizeBackendUrl(resource.previewUrl) || buildDocPreviewUrl(resource.downloadUrl)
  const downloadUrl = normalizeBackendUrl(resource.downloadUrl)
  const source = downloadUrl || previewUrl
  return {
    label: resource.title || safeFileName(source) || '文件',
    previewUrl,
    downloadUrl,
    fileType: fileTypeFromUrl(source),
    fileSize: 0,
    canPreview: !!previewUrl,
    canDownload: !!downloadUrl,
  }
}

// --- API 方法 ---

export function usePublicApi() {
  const client = useApiClient()

  return {
    /** 获取首页聚合数据 */
    async getHome() {
      return safeData(async () => {
        const { data } = await client.get<ApiResult<PublicHomeDTO>>('/api/public/home')
        return data
      })
    },

    /** 获取文章列表（分页） */
    async getArticles(params: { pageNum?: number; pageSize?: number; categoryId?: string; q?: string }) {
      return safePage(async () => {
        const { data } = await client.get<PageResult<PublicArticleCardDTO>>('/api/public/articles', { params })
        return data
      })
    },

    /** 搜索公开文章 */
    async searchArticles(params: { q?: string; pageNum?: number; pageSize?: number; categoryId?: string }) {
      return safePage(async () => {
        const { data } = await client.get<PageResult<PublicArticleCardDTO>>('/api/public/articles', { params })
        return data
      })
    },

    /** 获取推荐文章 */
    async getRecommendArticles(type = '1', size = 20) {
      return safeData(async () => {
        const { data } = await client.get<ApiResult<PublicArticleCardDTO[]>>('/api/public/articles/recommend', { params: { type, size } })
        return data
      })
    },

    /** 获取文章详情 */
    async getArticleDetail(id: number) {
      return safeData(async () => {
        const { data } = await client.get<ApiResult<PublicArticleDetailDTO>>(`/api/public/articles/${id}`)
        return data
      })
    },

    /** 获取文章正文 */
    async getArticleContent(id: number) {
      return safeData(async () => {
        const { data } = await client.get<ApiResult<string>>(`/api/public/articles/${id}/content`)
        return data
      })
    },

    /** 获取文章评论 */
    async getArticleComments(id: number, pageNum = 1, pageSize = 6) {
      return safePage(async () => {
        const { data } = await client.get<PageResult<any>>(`/api/public/articles/${id}/comments`, { params: { pageNum, pageSize } })
        return data
      })
    },

    /** 获取文档资源列表 */
    async getResources(params: { pageNum?: number; pageSize?: number; categoryId?: string; q?: string }) {
      return safePage(async () => {
        const { data } = await client.get<PageResult<PublicResourceCardDTO>>('/api/public/resources', { params })
        return data
      })
    },

    /** 获取工具箱资源列表 */
    async getToolboxResources(params: { pageNum?: number; pageSize?: number; categoryId?: string; q?: string }) {
      return safePage(async () => {
        const { data } = await client.get<PageResult<PublicResourceCardDTO>>('/api/public/resources', { params })
        return data
      })
    },

    /** 获取文档资源详情 */
    async getResourceDetail(id: number) {
      return safeData(async () => {
        const { data } = await client.get<ApiResult<PublicResourceDetailDTO>>(`/api/public/resources/${id}`)
        return data
      })
    },

    /** 获取资源安全文件入口 */
    async getResourceFileLink(id: number) {
      const resource = await safeData(async () => {
        const { data } = await client.get<ApiResult<PublicResourceDetailDTO>>(`/api/public/resources/${id}`)
        return data
      })
      return resource ? toSafeFileLink(resource) : null
    },

    /** 获取图片列表 */
    async getImages(params: { pageNum?: number; pageSize?: number; categoryId?: number }) {
      return safePage(async () => {
        const { data } = await client.get<PageResult<PublicImageDTO>>('/api/public/images', { params })
        return data
      })
    },

    /** 获取相册图片列表 */
    async getPhotos(params: { pageNum?: number; pageSize?: number; categoryId?: number }) {
      return safePage(async () => {
        const { data } = await client.get<PageResult<PublicImageDTO>>('/api/public/images', { params })
        return data
      })
    },

    /** 获取图片分类 */
    async getImageCategories() {
      return safeData(async () => {
        const { data } = await client.get<ApiResult<APIClassifyDTO[]>>('/api/public/images/categories')
        return data
      })
    },

    /** 获取书籍列表（分页） */
    async getBooks(params: { pageNum?: number; pageSize?: number; type?: string }) {
      return safePage(async () => {
        const { data } = await client.get<PageResult<PublicBookCardDTO>>('/api/public/books', { params })
        return data
      })
    },

    /** 获取书籍详情和章节目录 */
    async getBookChapters(id: number) {
      return safeData(async () => {
        const { data } = await client.get<ApiResult<PublicBookDetailDTO>>(`/api/public/books/${id}/chapters`)
        return data
      })
    },

    /** 获取章节正文 */
    async getChapterContent(bookId: number, chapterId: string) {
      return safeData(async () => {
        const { data } = await client.get<ApiResult<PublicBookChapterDTO>>(`/api/public/books/${bookId}/chapters/${chapterId}`)
        return data
      })
    },
  }
}
