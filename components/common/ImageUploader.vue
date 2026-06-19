<template>
  <div class="image-uploader">
    <!-- 图片预览 -->
    <div v-if="mediaKind === 'IMAGE'" class="image-uploader__preview" :style="previewStyle">
      <img
        v-if="displayUrl"
        :src="displayUrl"
        :alt="alt"
        class="image-uploader__img"
        @error="onImgError"
      />
      <div v-else class="image-uploader__placeholder">
        <el-icon class="image-uploader__placeholder-icon"><Picture /></el-icon>
        <span class="image-uploader__placeholder-text">暂无封面</span>
      </div>

      <div v-if="uploading" class="image-uploader__mask">
        <el-progress
          type="circle"
          :percentage="progress"
          :width="56"
          :stroke-width="3"
        />
      </div>
    </div>

    <!-- 音频预览 -->
    <div v-else-if="mediaKind === 'AUDIO'" class="image-uploader__audio-preview">
      <audio v-if="displayUrl" :src="displayUrl" controls class="image-uploader__audio" />
      <div v-else class="image-uploader__placeholder">
        <el-icon class="image-uploader__placeholder-icon"><Headset /></el-icon>
        <span class="image-uploader__placeholder-text">暂无音频</span>
      </div>
      <div v-if="uploading" class="image-uploader__mask">
        <el-progress type="circle" :percentage="progress" :width="56" :stroke-width="3" />
      </div>
    </div>

    <!-- 视频/文件预览 -->
    <div v-else class="image-uploader__file-preview">
      <div v-if="displayUrl" class="image-uploader__file-info">
        <el-icon class="image-uploader__file-icon"><Document /></el-icon>
        <span class="image-uploader__file-name">{{ displayUrl }}</span>
      </div>
      <div v-else class="image-uploader__placeholder">
        <el-icon class="image-uploader__placeholder-icon"><Upload /></el-icon>
        <span class="image-uploader__placeholder-text">暂无文件</span>
      </div>
      <div v-if="uploading" class="image-uploader__mask">
        <el-progress type="circle" :percentage="progress" :width="56" :stroke-width="3" />
      </div>
    </div>

    <div class="image-uploader__actions">
      <el-upload
        :auto-upload="false"
        :show-file-list="false"
        :accept="acceptTypes"
        :on-change="handleFileChange"
      >
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="uploading"
        >
          {{ displayUrl ? '重新上传' : '选择图片' }}
        </el-button>
      </el-upload>
      <el-button
        v-if="displayUrl"
        link
        type="danger"
        :disabled="uploading"
        @click="clear"
      >
        清除
      </el-button>
    </div>

    <p v-if="hint" class="image-uploader__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { Picture, Headset, Document, Upload } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import type { MediaPurpose, MediaKind } from '~/types/media'
import { isPrivateMediaUrl, extractMediaId } from '~/composables/usePrivateMediaUrl'

interface Props {
  modelValue?: string
  /** 媒体业务用途,后端据此应用校验规则 */
  purpose: MediaPurpose
  /** 占位 alt */
  alt?: string
  /** 缩略图宽高(像素) */
  width?: number
  height?: number
  /** 提示文字 */
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  alt: '封面预览',
  width: 160,
  height: 200,
  hint: '支持 jpg / png / webp,建议尺寸 3:4',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const mediaApi = useMediaApi()
const uploading = ref(false)
const progress = ref(0)
const localPreviewUrl = ref('')
const failed = ref(false)

/** 远端私有 URL（/api/media/.../content）通过 axios 获取后转换的 ObjectURL */
const fetchedPreviewUrl = ref('')

/** 根据 purpose 推断媒体类型 */
const mediaKind = computed<MediaKind>(() => {
  const audioPurposes: MediaPurpose[] = ['AUDIO_CONTENT', 'BOOK_CONTENT']
  if (audioPurposes.includes(props.purpose)) return 'AUDIO'
  return 'IMAGE'
})

/** 根据 mediaKind 选择 accept */
const acceptTypes = computed(() => {
  switch (mediaKind.value) {
    case 'AUDIO': return 'audio/*'
    case 'VIDEO': return 'video/*'
    default: return 'image/*'
  }
})

/**
 * 判断 modelValue 是否为需要鉴权的私有媒体 URL。
 * 私有 URL 形如 /api/media/{id}/content，浏览器 <img> / <audio> 标签
 * 直接请求时不会携带 Authorization header，导致 401。
 * isPrivateMediaUrl 和 extractMediaId 已从 usePrivateMediaUrl composable 导入。
 */

const displayUrl = computed(() => {
  if (localPreviewUrl.value) return localPreviewUrl.value
  if (fetchedPreviewUrl.value) return fetchedPreviewUrl.value
  if (failed.value) return ''
  return props.modelValue || ''
})

const previewStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}))

function revokeLocal() {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value)
    localPreviewUrl.value = ''
  }
}

function revokeFetched() {
  if (fetchedPreviewUrl.value) {
    URL.revokeObjectURL(fetchedPreviewUrl.value)
    fetchedPreviewUrl.value = ''
  }
}

/**
 * 当 modelValue 是私有媒体 URL（/api/media/{id}/content）时，
 * 浏览器 <img>/<audio> 标签无法携带 Authorization header，
 * 需要通过 axios 下载为 Blob，再生成临时 ObjectURL 供标签使用。
 */
async function fetchPrivateContent(url: string) {
  const mediaId = extractMediaId(url)
  if (!mediaId) return
  revokeFetched()
  failed.value = false
  try {
    const blob = await mediaApi.getPrivateContent(mediaId)
    fetchedPreviewUrl.value = URL.createObjectURL(blob)
  } catch {
    failed.value = true
  }
}

/** 监听 modelValue 变化：新上传用 localPreviewUrl，重新编辑需 fetch 私有内容 */
watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      revokeFetched()
      failed.value = false
      return
    }
    // 新上传的 localPreviewUrl 优先，不需要 fetch
    if (localPreviewUrl.value) return
    // 私有 URL 需要通过 axios 获取
    if (isPrivateMediaUrl(val)) {
      void fetchPrivateContent(val)
    } else {
      // 公开 URL 直接使用
      revokeFetched()
      failed.value = false
    }
  },
  { immediate: true },
)

function handleFileChange(uploadFile: UploadFile) {
  const file = uploadFile.raw
  if (!file) return
  failed.value = false
  revokeLocal()
  revokeFetched()
  localPreviewUrl.value = URL.createObjectURL(file)
  void uploadFile2Server(file)
}

async function uploadFile2Server(file: File) {
  uploading.value = true
  progress.value = 0
  try {
    const uploadOptions = {
      purpose: props.purpose,
      clientRequestId: buildClientRequestId(),
      onProgress: (percent: number) => {
        progress.value = percent
      },
    }
    let item: { previewUrl?: string } | null = null
    if (mediaKind.value === 'AUDIO') {
      item = await mediaApi.uploadAudio(file, uploadOptions)
    } else {
      item = await mediaApi.uploadImage(file, uploadOptions)
    }
    // 后端返回的 previewUrl 形如 /api/media/{id}/content,
    // 直接把这个 URL 写回 v-model,持久化到书籍.image 等字段
    emit('update:modelValue', item?.previewUrl || '')
    ElMessage?.success?.('上传成功')
  } catch (err) {
    failed.value = true
    revokeLocal()
    const message = err instanceof Error ? err.message : '上传失败'
    ElMessage?.error?.(message)
  } finally {
    uploading.value = false
    progress.value = 0
  }
}

function onImgError() {
  // 远端 URL 失效:把失效标记置位,展示占位图
  failed.value = true
}

function clear() {
  failed.value = false
  revokeLocal()
  revokeFetched()
  emit('update:modelValue', '')
}

function buildClientRequestId(): string {
  // 简单去重的客户端请求 id,后端用于幂等去重
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

onBeforeUnmount(() => {
  revokeLocal()
  revokeFetched()
})
</script>

<style scoped>
.image-uploader {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 320px;
}
.image-uploader__preview {
  position: relative;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #fafbfc;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-uploader__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.image-uploader__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 12px;
}
.image-uploader__placeholder-icon {
  font-size: 32px;
  color: #c0c4cc;
}
.image-uploader__placeholder-text {
  user-select: none;
}
.image-uploader__mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-uploader__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.image-uploader__hint {
  margin: 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
</style>
