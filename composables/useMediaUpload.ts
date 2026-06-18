import type {
  MediaClientError,
  MediaFilePreview,
  MediaItem,
  MediaKind,
  MediaPurpose,
  MediaUploadStatus,
  MediaValidationHints,
} from '~/types/media'
import { toMediaClientError, useMediaApi } from '~/services/media-api'

const DEFAULT_HINTS: MediaValidationHints = {
  imageMaxSize: 5 * 1024 * 1024,
  videoMaxSize: 200 * 1024 * 1024,
  audioMaxSize: 50 * 1024 * 1024,
  imageExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  videoExtensions: ['mp4', 'webm'],
  audioExtensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'],
}

export interface UseMediaUploadOptions {
  purpose: MediaPurpose
  kind?: Extract<MediaKind, 'IMAGE' | 'VIDEO'>
  hints?: Partial<MediaValidationHints>
}

function requestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function extension(file: File) {
  const separator = file.name.lastIndexOf('.')
  return separator < 0 ? '' : file.name.slice(separator + 1).toLowerCase()
}

function inferredKind(
  file: File,
  hints: MediaValidationHints,
): Extract<MediaKind, 'IMAGE' | 'VIDEO'> | null {
  if (file.type.startsWith('image/')) return 'IMAGE'
  if (file.type.startsWith('video/')) return 'VIDEO'
  const fileExtension = extension(file)
  if (hints.imageExtensions.includes(fileExtension)) return 'IMAGE'
  if (hints.videoExtensions.includes(fileExtension)) return 'VIDEO'
  return null
}

function localValidationError(
  file: File,
  expectedKind: Extract<MediaKind, 'IMAGE' | 'VIDEO'> | undefined,
  hints: MediaValidationHints,
): MediaClientError | null {
  const kind = inferredKind(file, hints)
  if (!kind || (expectedKind && kind !== expectedKind)) {
    return {
      category: 'unsupported-type',
      code: 'MEDIA_TYPE_UNSUPPORTED',
      message: expectedKind === 'VIDEO' ? '请选择支持的视频文件' : '请选择支持的图片文件',
      retryable: false,
    }
  }
  const allowed = kind === 'IMAGE' ? hints.imageExtensions : hints.videoExtensions
  if (!allowed.includes(extension(file))) {
    return {
      category: 'unsupported-type',
      code: 'MEDIA_TYPE_UNSUPPORTED',
      message: `支持的格式：${allowed.join('、')}`,
      retryable: false,
    }
  }
  const maxSize = kind === 'IMAGE' ? hints.imageMaxSize : hints.videoMaxSize
  if (file.size > maxSize) {
    return {
      category: 'too-large',
      code: 'MEDIA_FILE_TOO_LARGE',
      message: `文件不能超过 ${formatFileSize(maxSize)}`,
      retryable: false,
    }
  }
  return null
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function useMediaUpload(options: UseMediaUploadOptions) {
  const api = useMediaApi()
  const hints: MediaValidationHints = {
    ...DEFAULT_HINTS,
    ...options.hints,
  }
  const filePreview = shallowRef<MediaFilePreview | null>(null)
  const media = shallowRef<MediaItem | null>(null)
  const progress = ref(0)
  const status = ref<MediaUploadStatus>('idle')
  const error = shallowRef<MediaClientError | null>(null)
  let clientRequestId = ''
  let controller: AbortController | null = null

  const uploading = computed(() => status.value === 'uploading')
  const canRetry = computed(() => status.value === 'error' || status.value === 'canceled')

  function revokeLocalPreview() {
    if (filePreview.value?.localUrl) {
      URL.revokeObjectURL(filePreview.value.localUrl)
    }
  }

  function selectFile(file: File) {
    if (uploading.value) return false
    revokeLocalPreview()
    media.value = null
    progress.value = 0
    error.value = localValidationError(file, options.kind, hints)
    if (error.value) {
      filePreview.value = null
      status.value = 'error'
      clientRequestId = ''
      return false
    }
    const kind = options.kind || inferredKind(file, hints)
    if (!kind) return false
    filePreview.value = {
      file,
      kind,
      name: file.name,
      size: file.size,
      contentType: file.type,
      localUrl: URL.createObjectURL(file),
    }
    clientRequestId = requestId()
    status.value = 'ready'
    return true
  }

  async function upload() {
    if (uploading.value || status.value === 'success' || !filePreview.value) return media.value
    if (!clientRequestId) clientRequestId = requestId()
    controller = new AbortController()
    status.value = 'uploading'
    error.value = null
    progress.value = 0
    try {
      const uploadOptions = {
        purpose: options.purpose,
        clientRequestId,
        signal: controller.signal,
        onProgress: (value: number) => {
          progress.value = value
        },
      }
      media.value = filePreview.value.kind === 'VIDEO'
        ? await api.uploadVideo(filePreview.value.file, uploadOptions)
        : await api.uploadImage(filePreview.value.file, uploadOptions)
      progress.value = 100
      status.value = 'success'
      return media.value
    } catch (cause) {
      error.value = toMediaClientError(cause)
      status.value = error.value.category === 'canceled' ? 'canceled' : 'error'
      return null
    } finally {
      controller = null
    }
  }

  function cancel() {
    controller?.abort()
  }

  async function retry() {
    if (!canRetry.value || !error.value?.retryable) return null
    return upload()
  }

  async function remove() {
    if (!media.value || uploading.value) return false
    status.value = 'deleting'
    error.value = null
    try {
      await api.deletePrivateMedia(media.value.mediaId)
      reset()
      return true
    } catch (cause) {
      error.value = toMediaClientError(cause)
      status.value = 'error'
      return false
    }
  }

  function reset() {
    controller?.abort()
    controller = null
    revokeLocalPreview()
    filePreview.value = null
    media.value = null
    progress.value = 0
    status.value = 'idle'
    error.value = null
    clientRequestId = ''
  }

  onScopeDispose(reset)

  return {
    filePreview: readonly(filePreview),
    media: readonly(media),
    progress: readonly(progress),
    status: readonly(status),
    error: readonly(error),
    uploading,
    canRetry,
    hints,
    selectFile,
    upload,
    cancel,
    retry,
    remove,
    reset,
  }
}
