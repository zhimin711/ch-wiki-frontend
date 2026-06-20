export type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE'

export type MediaPurpose =
  | 'ARTICLE_CONTENT'
  | 'ARTICLE_COVER'
  | 'AVATAR'
  | 'BOOK_CONTENT'
  | 'BOOK_COVER'
  | 'RESOURCE_COVER'
  | 'RESOURCE_ATTACHMENT'
  | 'IMAGE_LIBRARY'
  | 'VIDEO_LIBRARY'
  | 'AUDIO_CONTENT'
  | 'AD_COVER'

export type MediaState =
  | 'PRIVATE_READY'
  | 'PENDING_PUBLICATION'
  | 'PUBLISH_FAILED'
  | 'PUBLIC'
  | 'PENDING_UNPUBLISH'
  | 'PROCESSING_FAILED'
  | 'PENDING_DELETE'
  | 'DELETED'

export interface MediaItem {
  mediaId: string
  kind: MediaKind
  purpose: MediaPurpose
  originalName: string
  contentType: string
  size: number
  width?: number | null
  height?: number | null
  durationMillis?: number | null
  state: MediaState
  previewUrl: string
  publicUrl?: string | null
  createAt?: string | number | null
  updateAt?: string | number | null
}

export interface MediaQuery {
  kind?: MediaKind
  purpose?: MediaPurpose
  state?: MediaState
  pageNum?: number
  pageSize?: number
}

export interface MediaUploadOptions {
  purpose: MediaPurpose
  clientRequestId: string
  signal?: AbortSignal
  onProgress?: (percent: number) => void
}

export type MediaUploadStatus =
  | 'idle'
  | 'ready'
  | 'uploading'
  | 'success'
  | 'error'
  | 'canceled'
  | 'deleting'

export type MediaErrorCategory =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'unsupported-type'
  | 'too-large'
  | 'invalid-content'
  | 'in-use'
  | 'processing'
  | 'storage'
  | 'canceled'
  | 'network'
  | 'unknown'

export interface MediaClientError {
  category: MediaErrorCategory
  code: string
  message: string
  status?: number
  retryable: boolean
}

export interface MediaValidationHints {
  imageMaxSize: number
  videoMaxSize: number
  audioMaxSize: number
  imageExtensions: readonly string[]
  videoExtensions: readonly string[]
  audioExtensions: readonly string[]
}

export interface MediaFilePreview {
  file: File
  kind: Extract<MediaKind, 'IMAGE' | 'VIDEO' | 'AUDIO'>
  name: string
  size: number
  contentType: string
  localUrl: string
}
