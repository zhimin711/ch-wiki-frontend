import axios from 'axios'
import type { ApiResult } from './api-client'
import { extractData, useApiClient } from './api-client'
import type {
  MediaClientError,
  MediaItem,
  MediaQuery,
  MediaUploadOptions,
} from '~/types/media'

interface MediaPageResponse {
  rows?: MediaItem[]
  total: number
}

const MEDIA_ERROR_MESSAGES: Record<string, Omit<MediaClientError, 'code' | 'status'>> = {
  MEDIA_UNAUTHORIZED: {
    category: 'unauthorized',
    message: '登录状态已失效，请重新登录',
    retryable: false,
  },
  MEDIA_FORBIDDEN: {
    category: 'forbidden',
    message: '当前账号无权操作该媒体',
    retryable: false,
  },
  MEDIA_NOT_FOUND: {
    category: 'not-found',
    message: '媒体不存在或已不可访问',
    retryable: false,
  },
  MEDIA_TYPE_UNSUPPORTED: {
    category: 'unsupported-type',
    message: '不支持该文件类型',
    retryable: false,
  },
  MEDIA_FILE_TOO_LARGE: {
    category: 'too-large',
    message: '文件超过允许的大小',
    retryable: false,
  },
  MEDIA_INVALID_CONTENT: {
    category: 'invalid-content',
    message: '文件内容校验失败，请更换文件',
    retryable: false,
  },
  MEDIA_IN_USE: {
    category: 'in-use',
    message: '媒体已被内容引用，暂时不能删除',
    retryable: false,
  },
  MEDIA_PROCESSING: {
    category: 'processing',
    message: '媒体仍在处理中，请稍后重试',
    retryable: true,
  },
  MEDIA_STORAGE_UNAVAILABLE: {
    category: 'storage',
    message: '媒体存储暂时不可用，请稍后重试',
    retryable: true,
  },
}

class MediaResponseError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'MediaResponseError'
  }
}

function requireData<T>(result: ApiResult<T>): T {
  const data = extractData(result)
  if (!result.success || data === null) {
    throw new MediaResponseError(String(result.code || 'MEDIA_UNKNOWN'), result.message || '媒体请求失败')
  }
  return data
}

function errorCode(error: unknown): string {
  if (error instanceof MediaResponseError) return error.code
  if (axios.isAxiosError<ApiResult<unknown>>(error)) {
    return String(error.response?.data?.code || '')
  }
  return ''
}

export function toMediaClientError(error: unknown): MediaClientError {
  if (axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError')) {
    return {
      category: 'canceled',
      code: 'MEDIA_CANCELED',
      message: '上传已取消',
      retryable: true,
    }
  }

  const code = errorCode(error)
  const mapped = MEDIA_ERROR_MESSAGES[code]
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  if (mapped) {
    return { ...mapped, code, status }
  }
  if (status === 401) {
    return {
      category: 'unauthorized',
      code: code || 'MEDIA_UNAUTHORIZED',
      message: '登录状态已失效，请重新登录',
      status,
      retryable: false,
    }
  }
  if (status === 403) {
    return {
      category: 'forbidden',
      code: code || 'MEDIA_FORBIDDEN',
      message: '当前账号无权操作该媒体',
      status,
      retryable: false,
    }
  }
  if (status === 404) {
    return {
      category: 'not-found',
      code: code || 'MEDIA_NOT_FOUND',
      message: '媒体不存在或已不可访问',
      status,
      retryable: false,
    }
  }
  if (status === 413) {
    return {
      category: 'too-large',
      code: code || 'MEDIA_FILE_TOO_LARGE',
      message: '文件超过允许的大小',
      status,
      retryable: false,
    }
  }
  if (status === 415) {
    return {
      category: 'unsupported-type',
      code: code || 'MEDIA_TYPE_UNSUPPORTED',
      message: '文件类型不支持或内容校验失败',
      status,
      retryable: false,
    }
  }
  if (axios.isAxiosError(error) && !error.response) {
    return {
      category: 'network',
      code: 'MEDIA_NETWORK_ERROR',
      message: '网络连接失败，请检查网络后重试',
      retryable: true,
    }
  }
  return {
    category: 'unknown',
    code: code || 'MEDIA_UNKNOWN',
    message: error instanceof Error && error.message ? error.message : '媒体操作失败，请稍后重试',
    status,
    retryable: true,
  }
}

export function useMediaApi() {
  const client = useApiClient()

  async function upload(
    endpoint: '/api/uploads/images' | '/api/uploads/videos' | '/api/uploads/audios' | '/api/uploads/files',
    file: File,
    options: MediaUploadOptions,
  ) {
    const form = new FormData()
    form.append('file', file)
    form.append('purpose', options.purpose)
    form.append('clientRequestId', options.clientRequestId)
    const { data: response } = await client.post<ApiResult<MediaItem>>(endpoint, form, {
      signal: options.signal,
      timeout: 5 * 60 * 1000,
      // 显式删除 axios 实例默认的 Content-Type: application/json,
      // 让浏览器根据 FormData 自动生成 `multipart/form-data; boundary=...`,
      // 否则服务端会因 Content-Type 不匹配 consumes=multipart/form-data 返回 415
      headers: { 'Content-Type': undefined as any },
      onUploadProgress: (event) => {
        if (!options.onProgress || !event.total) return
        options.onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)))
      },
    })
    return requireData(response)
  }

  return {
    uploadImage(file: File, options: MediaUploadOptions) {
      return upload('/api/uploads/images', file, options)
    },

    uploadVideo(file: File, options: MediaUploadOptions) {
      return upload('/api/uploads/videos', file, options)
    },

    uploadAudio(file: File, options: MediaUploadOptions) {
      return upload('/api/uploads/audios', file, options)
    },

    uploadFile(file: File, options: MediaUploadOptions) {
      return upload('/api/uploads/files', file, options)
    },

    async getMyMedia(query: MediaQuery = {}) {
      const { data: response } = await client.get<ApiResult<MediaPageResponse>>('/api/user/media', {
        params: query,
      })
      const page = requireData(response)
      return { list: page.rows || [], total: page.total || 0 }
    },

    async getMedia(mediaId: string) {
      const { data: response } = await client.get<ApiResult<MediaItem>>(
        `/api/media/${encodeURIComponent(mediaId)}`,
      )
      return requireData(response)
    },

    async getPrivateContent(mediaId: string, signal?: AbortSignal) {
      const response = await client.get<Blob>(
        `/api/media/${encodeURIComponent(mediaId)}/content`,
        { responseType: 'blob', signal },
      )
      return response.data
    },

    async deletePrivateMedia(mediaId: string) {
      const { data: response } = await client.delete<ApiResult<void>>(
        `/api/media/${encodeURIComponent(mediaId)}`,
      )
      if (!response.success) {
        throw new MediaResponseError(String(response.code || 'MEDIA_UNKNOWN'), response.message || '删除失败')
      }
    },
  }
}
