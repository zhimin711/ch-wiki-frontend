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
  </div>
</template>

<script setup lang="ts">
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

type WangEditorInstance = {
  getHtml: () => string
  setHtml: (val: string) => void
  destroy: () => void
}

interface Props {
  modelValue?: string
  placeholder?: string
  height?: string
  /** 图片上传端点，默认 /upload/image/article */
  uploadImageServer?: string
  /** 图片上传请求头（如 Authorization） */
  uploadImageHeaders?: Record<string, string> | (() => Record<string, string>)
  /** 图片上传字段名，默认 file */
  uploadImageFieldName?: string
  /** 单张图片最大体积（MB），默认 5 */
  imageMaxSizeMb?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入正文...',
  height: '520px',
  uploadImageServer: '/upload/image/article',
  uploadImageHeaders: () => ({}),
  uploadImageFieldName: 'file',
  imageMaxSizeMb: 5,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editorRef = shallowRef<WangEditorInstance | null>(null)
const htmlContent = ref<string>(props.modelValue || '')

const bodyHeight = computed(() => {
  // 减去工具栏高度（约 40px），避免出现滚动条叠加
  const m = /^(\d+)px$/.exec(props.height || '')
  if (m) return `${Math.max(120, Number(m[1]) - 40)}px`
  return '480px'
})

const toolbarConfig = {
  // 默认开启所有内置工具:粗体/斜体/下划线/删除线/字号/颜色/H1-H6/列表/引用/对齐/链接/图片/视频/表格/代码块/撤销/全屏 等
  excludeKeys: [
    // 视频/iframe 在博客类站点容易被滥用，默认隐藏；如需开启可移除
    'insertVideo',
  ],
}

const editorConfig = computed(() => ({
  placeholder: props.placeholder,
  MENU_CONF: {
    uploadImage: {
      server: props.uploadImageServer,
      fieldName: props.uploadImageFieldName,
      maxFileSize: props.imageMaxSizeMb * 1024 * 1024,
      maxNumberOfFiles: 10,
      headers: typeof props.uploadImageHeaders === 'function'
        ? props.uploadImageHeaders()
        : props.uploadImageHeaders,
      // 兼容后端 ApiResult 包装：{ code, success, data: { url, href, path, ... } }
      customInsert(res: any, insertFn: (url: string, alt?: string, href?: string) => void) {
        const ok = res && (res.success === true || res.code === 0 || res.code === '0' || res.code === 200)
        const data = res?.data
        const url: string = data?.url || data?.href || data?.path || data?.src || ''
        if (ok && url) {
          insertFn(url, data?.name || 'image', url)
        } else {
          // eslint-disable-next-line no-console
          console.warn('[RichTextEditor] 图片上传失败：', res)
        }
      },
    },
  },
}))

function handleCreated(editor: WangEditorInstance) {
  editorRef.value = editor
  // 防御: 编辑器实例刚就绪,主动把当前内容同步过去。
  // wangeditor-for-vue 理论上会用 props.modelValue 作为初始 html,
  // 但在 SSR/异步加载/重挂载等场景下时序可能错位,
  // 这里做一次兜底,确保内容一定会显示出来。
  if (htmlContent.value && editor.getHtml() !== htmlContent.value) {
    editor.setHtml(htmlContent.value)
  }
}

function handleChange(editor: WangEditorInstance) {
  const html = editor.getHtml()
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
    // 关键: 以 editorRef.value.getHtml() 作为判断依据,
    // 而不是 htmlContent.value。因为父组件 (如 ChapterContentEditor 的 syncAll)
    // 可能已经先更新了本地 ref,但 wangeditor 实例的 DOM 尚未同步。
    // 典型场景: 进入编辑页时,内容是异步加载的,初次挂载的编辑器是空的。
    if (editorRef.value && editorRef.value.getHtml() !== val) {
      editorRef.value.setHtml(val)
    }
  },
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
</style>
