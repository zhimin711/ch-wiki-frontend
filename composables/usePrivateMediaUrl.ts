/**
 * 私有媒体 URL 解析 composable
 *
 * 解决问题：浏览器原生 <img>/<audio> 标签请求 /api/media/{id}/content 时
 * 不会携带 Authorization header，导致 401。
 *
 * 工作原理：通过 axios（自动附加 Bearer token）下载为 Blob，
 * 再用 URL.createObjectURL() 生成临时 ObjectURL 供标签使用。
 *
 * 支持两种模式：
 * 1. 单 URL 响应式：传入 ref<string>，返回 resolvedUrl ref
 * 2. 批量 URL 映射：传入 URL 列表，返回 Map<string, string> 响应式对象
 */

import { useMediaApi } from '~/services/media-api'

/** 判断 URL 是否为需要鉴权的私有媒体 URL */
export function isPrivateMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.startsWith('/api/media/') && url.endsWith('/content')
}

/** 从 /api/media/{id}/content 中提取 mediaId */
export function extractMediaId(url: string): string | null {
  const match = url.match(/^\/api\/media\/([^/]+)\/content$/)
  return match ? match[1] : null
}

/**
 * 单 URL 响应式模式。
 *
 * 传入一个响应式 ref<string>（可能是私有 URL、公开 URL 或空值），
 * 返回一个始终指向可显示 URL 的 ref。
 *
 * - 私有 URL → axios 下载 → Blob → ObjectURL
 * - 公开 URL → 原样返回
 * - 空 → 返回空字符串
 *
 * 组件卸载时自动 revoke ObjectURL。
 */
export function usePrivateMediaUrl(source: Ref<string>) {
  const mediaApi = useMediaApi()
  const resolvedUrl = ref('')
  const loading = ref(false)
  const failed = ref(false)
  let currentObjectUrl = ''
  let currentSourceUrl = ''

  function revoke() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = ''
    }
  }

  async function resolve(url: string) {
    // 空值
    if (!url) {
      revoke()
      resolvedUrl.value = ''
      failed.value = false
      return
    }

    // 非私有 URL 直接使用
    if (!isPrivateMediaUrl(url)) {
      revoke()
      resolvedUrl.value = url
      failed.value = false
      return
    }

    // 已经在处理同一个 URL
    if (url === currentSourceUrl && currentObjectUrl) {
      return
    }

    currentSourceUrl = url
    revoke()
    loading.value = true
    failed.value = false

    const mediaId = extractMediaId(url)
    if (!mediaId) {
      loading.value = false
      failed.value = true
      return
    }

    try {
      const blob = await mediaApi.getPrivateContent(mediaId)
      // 检查是否已被替换（source 在异步过程中变化）
      if (currentSourceUrl !== url) return
      currentObjectUrl = URL.createObjectURL(blob)
      resolvedUrl.value = currentObjectUrl
    } catch {
      if (currentSourceUrl !== url) return
      failed.value = true
      resolvedUrl.value = ''
    } finally {
      if (currentSourceUrl === url) {
        loading.value = false
      }
    }
  }

  watch(source, (val) => {
    void resolve(val)
  }, { immediate: true })

  onBeforeUnmount(() => {
    revoke()
  })

  return {
    resolvedUrl: readonly(resolvedUrl),
    loading: readonly(loading),
    failed: readonly(failed),
  }
}

/**
 * 批量 URL 解析模式。
 *
 * 适用于列表页场景：一次传入多条记录的封面 URL，
 * 自动解析其中的私有 URL，返回 mediaId → ObjectURL 的映射。
 *
 * 使用方式：
 * ```ts
 * const { urlMap, loading } = usePrivateMediaUrlMap()
 * // 在数据加载后调用
 * resolveUrls(records.map(r => r.image))
 * // 模板中
 * <el-image :src="getDisplayUrl(row.image)" />
 * ```
 *
 * 组件卸载时自动 revoke 所有 ObjectURL。
 */
export function usePrivateMediaUrlMap() {
  const mediaApi = useMediaApi()
  const urlMap = ref<Map<string, string>>(new Map())
  const loading = ref(false)
  const objectUrls: string[] = []

  function revokeAll() {
    for (const url of objectUrls) {
      URL.revokeObjectURL(url)
    }
    objectUrls.length = 0
    urlMap.value = new Map()
  }

  /**
   * 批量解析 URL 列表中的私有 URL。
   * 公开 URL 和空值会被跳过。
   */
  async function resolveUrls(urls: (string | null | undefined)[]) {
    const privateUrls = urls
      .filter((u): u is string => !!u && isPrivateMediaUrl(u))
      .filter((u, i, arr) => arr.indexOf(u) === i) // 去重

    if (privateUrls.length === 0) return

    loading.value = true
    const results = await Promise.allSettled(
      privateUrls.map(async (url) => {
        const mediaId = extractMediaId(url)
        if (!mediaId) return null
        const blob = await mediaApi.getPrivateContent(mediaId)
        const objectUrl = URL.createObjectURL(blob)
        return { url, objectUrl }
      }),
    )

    const newMap = new Map(urlMap.value)
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        newMap.set(result.value.url, result.value.objectUrl)
        objectUrls.push(result.value.objectUrl)
      }
    }
    urlMap.value = newMap
    loading.value = false
  }

  /**
   * 获取单个 URL 的可显示地址。
   * - 私有 URL：如果已解析返回 ObjectURL，否则返回空
   * - 公开 URL：原样返回
   * - 空：返回空
   */
  function getDisplayUrl(url: string | null | undefined): string {
    if (!url) return ''
    if (!isPrivateMediaUrl(url)) return url
    return urlMap.value.get(url) || ''
  }

  onBeforeUnmount(() => {
    revokeAll()
  })

  return {
    urlMap: readonly(urlMap),
    loading: readonly(loading),
    resolveUrls,
    getDisplayUrl,
    revokeAll,
  }
}
