<template>
  <div class="rich-editor">
    <Toolbar
      :editor="editorRef"
      :default-config="toolbarConfig"
      mode="default"
      class="rich-editor__toolbar"
    />
    <Editor
      v-model="htmlContent"
      :default-config="editorConfig"
      mode="default"
      class="rich-editor__body"
      :style="{ height: bodyHeight }"
      @on-created="handleCreated"
      @on-change="handleChange"
      @on-destroyed="handleDestroyed"
    />
    <div v-if="mediaPurpose && uploadRows.length" class="rich-editor__uploads">
      <div
        v-for="item in uploadRows"
        :key="item.kind"
        class="rich-editor__upload-row"
      >
        <span class="rich-editor__upload-label">{{ item.label }}</span>
        <el-progress
          v-if="item.status === 'uploading'"
          :percentage="item.progress"
          :stroke-width="6"
          class="rich-editor__progress"
        />
        <span v-else class="rich-editor__upload-state" :class="`is-${item.status}`">
          {{ item.message }}
        </span>
        <el-button
          v-if="item.status === 'uploading'"
          text
          size="small"
          @click="item.cancel"
        >
          取消
        </el-button>
        <el-button
          v-if="item.canRetry"
          text
          size="small"
          @click="item.retry"
        >
          重试
        </el-button>
        <el-button
          v-if="item.status === 'success'"
          text
          size="small"
          type="danger"
          @click="item.remove"
        >
          移除
        </el-button>
        <el-button
          v-if="item.status === 'error' && !item.canRetry"
          text
          size="small"
          @click="item.clear"
        >
          清除
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import type { MediaItem, MediaPurpose } from '~/types/media'

type WangEditorInstance = {
  getHtml: () => string
  setHtml: (val: string) => void
  destroy: () => void
}

interface MediaUploadState {
  uploading: boolean
  failed: boolean
}

interface Props {
  modelValue?: string
  placeholder?: string
  height?: string
  /**
   * 图片上传字段名(仅在保留旧 /upload/image/article 服务端上传时生效)
   * @deprecated 请改用 mediaPurpose,走私域 /api/uploads/images
   */
  uploadImageFieldName?: string
  /** 单张图片最大体积（MB），默认 5 */
  imageMaxSizeMb?: number
  /**
   * 媒体业务用途,后端据此校验/选用途白名单。
   * 不传则默认 ARTICLE_CONTENT,统一走 useMediaUpload(/api/uploads/images)
   * 私域路径,上传后返回的 previewUrl 形如 /api/media/{id}/content,
   * 浏览器原生 <img> 标签请求时会自动带 WIKI_TOKEN cookie 完成鉴权。
   */
  mediaPurpose?: MediaPurpose
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入正文...',
  height: '520px',
  uploadImageFieldName: 'file',
  imageMaxSizeMb: 5,
  mediaPurpose: 'ARTICLE_CONTENT',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'media-status', value: MediaUploadState): void
}>()

const editorRef = shallowRef<WangEditorInstance | null>(null)
const htmlContent = ref<string>(props.modelValue || '')
const imageUpload = useMediaUpload({ purpose: props.mediaPurpose || 'ARTICLE_CONTENT', kind: 'IMAGE' })
const videoUpload = useMediaUpload({ purpose: props.mediaPurpose || 'ARTICLE_CONTENT', kind: 'VIDEO' })
const mediaIdsByUrl = new Map<string, string>()
let pendingImageInsert: ((url: string, alt?: string, href?: string) => void) | null = null
let pendingVideoInsert: ((url: string, poster?: string) => void) | null = null

const bodyHeight = computed(() => {
  // 减去工具栏高度（约 40px），避免出现滚动条叠加
  const m = /^(\d+)px$/.exec(props.height || '')
  if (m) return `${Math.max(120, Number(m[1]) - 40)}px`
  return '480px'
})

const toolbarConfig = computed(() => ({
  // 默认开启所有内置工具:粗体/斜体/下划线/删除线/字号/颜色/H1-H6/列表/引用/对齐/链接/图片/视频/表格/代码块/撤销 等
  // - 视频/iframe 在博客类站点容易被滥用,默认隐藏
  // - wangeditor 内置 fullScreen 只是把容器 position:fixed,无法遮住父级 tabs/表单,
  //   也没有显式的"退出全屏"按钮;改由 ChapterContentEditor.client.vue 的
  //   EditorFullscreenPanel 统一接管。
  excludeKeys: [
    ...(props.mediaPurpose ? [] : ['insertVideo']),
    'fullScreen',
  ],
}))

const editorConfig = computed(() => ({
  placeholder: props.placeholder,
  MENU_CONF: {
    // 统一走私域 /api/uploads/images(wangeditor 不直接支持,
    // 这里用 customUpload 完全接管上传,imageUpload.upload 内部
    // 调 useMediaApi().uploadImage,purpose 来自 props.mediaPurpose)
    uploadImage: {
      maxFileSize: props.imageMaxSizeMb * 1024 * 1024,
      maxNumberOfFiles: 1,
      async customUpload(
        file: File,
        insertFn: (url: string, alt?: string, href?: string) => void,
      ) {
        pendingImageInsert = insertFn
        if (!imageUpload.selectFile(file)) return
        const media = await imageUpload.upload()
        if (media) insertUploadedMedia(media, insertFn)
      },
    },
    uploadVideo: {
      maxFileSize: videoUpload.hints.videoMaxSize,
      maxNumberOfFiles: 1,
      async customUpload(
        file: File,
        insertFn: (url: string, poster?: string) => void,
      ) {
        pendingVideoInsert = insertFn
        if (!videoUpload.selectFile(file)) return
        const media = await videoUpload.upload()
        if (media) insertUploadedMedia(media, insertFn)
      },
    },
  },
}))

const uploadRows = computed(() => [
  uploadRow('IMAGE', '图片', imageUpload, retryImage, removeImage),
  uploadRow('VIDEO', '视频', videoUpload, retryVideo, removeVideo),
].filter(item => item.status !== 'idle'))

function uploadRow(
  kind: 'IMAGE' | 'VIDEO',
  label: string,
  uploadState: typeof imageUpload,
  retry: () => Promise<void>,
  remove: () => Promise<void>,
) {
  const state = uploadState.status.value
  const message = uploadState.error.value?.message
    || (state === 'success'
      ? `${uploadState.media.value?.originalName || label}已上传`
      : state === 'ready'
        ? `${uploadState.filePreview.value?.name || label}待上传`
        : state === 'canceled'
          ? '已取消'
          : '')
  return {
    kind,
    label,
    status: state,
    progress: uploadState.progress.value,
    message,
    canRetry: uploadState.canRetry.value && uploadState.error.value?.retryable,
    cancel: uploadState.cancel,
    retry,
    remove,
    clear: uploadState.reset,
  }
}

function insertUploadedMedia(
  media: MediaItem,
  insertFn: ((url: string, alt?: string, href?: string) => void)
    | ((url: string, poster?: string) => void),
) {
  mediaIdsByUrl.set(media.previewUrl, media.mediaId)
  if (media.kind === 'VIDEO') {
    ;(insertFn as (url: string, poster?: string) => void)(media.previewUrl)
  } else {
    ;(insertFn as (url: string, alt?: string, href?: string) => void)(
      media.previewUrl,
      media.originalName,
    )
  }
}

async function retryImage() {
  const media = await imageUpload.retry()
  if (media && pendingImageInsert) insertUploadedMedia(media, pendingImageInsert)
}

async function retryVideo() {
  const media = await videoUpload.retry()
  if (media && pendingVideoInsert) insertUploadedMedia(media, pendingVideoInsert)
}

async function removeImage() {
  await removeUploadedMedia(imageUpload)
}

async function removeVideo() {
  await removeUploadedMedia(videoUpload)
}

async function removeUploadedMedia(uploadState: typeof imageUpload) {
  const mediaId = uploadState.media.value?.mediaId
  if (!mediaId) return
  if (await uploadState.remove()) {
    removeMediaNode(mediaId)
  }
}

function removeMediaNode(mediaId: string) {
  const document = new DOMParser().parseFromString(htmlContent.value, 'text/html')
  document.querySelectorAll('[data-media-id]').forEach((element) => {
    if (element.getAttribute('data-media-id') === mediaId) element.remove()
  })
  const html = document.body.innerHTML
  htmlContent.value = html
  editorRef.value?.setHtml(html)
  emit('update:modelValue', html)
}

function collectMediaReferences(html: string) {
  if (!html) return
  const document = new DOMParser().parseFromString(html, 'text/html')
  document.querySelectorAll<HTMLElement>('[data-media-id]').forEach((element) => {
    const mediaId = element.dataset.mediaId
    const url = element.getAttribute('src') || element.getAttribute('poster')
    if (mediaId && url) mediaIdsByUrl.set(url, mediaId)
  })
}

function decorateMediaReferences(html: string) {
  if (!html || mediaIdsByUrl.size === 0) return html
  const document = new DOMParser().parseFromString(html, 'text/html')
  document.querySelectorAll<HTMLElement>('img[src], video[src], source[src]').forEach((element) => {
    const url = element.getAttribute('src')
    const mediaId = url ? mediaIdsByUrl.get(url) : null
    if (mediaId) element.dataset.mediaId = mediaId
  })
  return document.body.innerHTML
}

function handleCreated(editor: WangEditorInstance) {
  editorRef.value = editor
  collectMediaReferences(htmlContent.value)
  // 防御: 编辑器实例刚就绪,主动把当前内容同步过去。
  // wangeditor-for-vue 理论上会用 props.modelValue 作为初始 html,
  // 但在 SSR/异步加载/重挂载等场景下时序可能错位,
  // 这里做一次兜底,确保内容一定会显示出来。
  if (htmlContent.value && editor.getHtml() !== htmlContent.value) {
    editor.setHtml(htmlContent.value)
  }
}

function handleChange(editor: WangEditorInstance) {
  const html = decorateMediaReferences(editor.getHtml())
  if (html !== htmlContent.value) {
    htmlContent.value = html
  }
  emit('update:modelValue', html)
}

function handleDestroyed() {
  editorRef.value = null
}

watch(
  () => props.modelValue,
  (val) => {
    if (val == null) return
    if (val !== htmlContent.value) {
      htmlContent.value = val
    }
    collectMediaReferences(val)
    // 关键: 以 editorRef.value.getHtml() 作为判断依据,
    // 而不是 htmlContent.value。因为父组件 (如 ChapterContentEditor 的 syncAll)
    // 可能已经先更新了本地 ref,但 wangeditor 实例的 DOM 尚未同步。
    // 典型场景: 进入编辑页时,内容是异步加载的,初次挂载的编辑器是空的。
    if (editorRef.value && editorRef.value.getHtml() !== val) {
      editorRef.value.setHtml(val)
    }
  },
)

watch(
  () => [
    imageUpload.status.value,
    videoUpload.status.value,
  ],
  () => {
    emit('media-status', {
      uploading: imageUpload.uploading.value || videoUpload.uploading.value,
      failed: imageUpload.status.value === 'error' || videoUpload.status.value === 'error',
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor && typeof editor.destroy === 'function') {
    editor.destroy()
  }
  editorRef.value = null
})
</script>

<style scoped>
.rich-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
}
.rich-editor :deep(.w-e-toolbar) {
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}
.rich-editor :deep(.w-e-text-container) {
  background: #fff;
}
.rich-editor :deep(.w-e-text) {
  font-size: 15px;
  line-height: 1.7;
}
.rich-editor__uploads {
  border-top: 1px solid #ebeef5;
  background: #fafafa;
  padding: 6px 10px;
}
.rich-editor__upload-row {
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.rich-editor__upload-label {
  width: 32px;
  color: #606266;
}
.rich-editor__progress {
  width: min(260px, 55%);
}
.rich-editor__upload-state {
  min-width: 0;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rich-editor__upload-state.is-success {
  color: #529b2e;
}
.rich-editor__upload-state.is-error,
.rich-editor__upload-state.is-canceled {
  color: #c45656;
}
</style>
