<template>
  <div class="chapter-editor">
    <el-skeleton v-if="loading" :rows="10" animated />
    <template v-else-if="chapter">
      <div class="page-header">
        <div>
          <NuxtLink :to="`/center/books/${bookId}`" class="back-link">返回目录</NuxtLink>
          <h1>{{ chapterTitle }}</h1>
        </div>
        <NuxtLink :to="`${route.path}/text`" class="table-link">纯文本查看</NuxtLink>
      </div>

      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="编号">
            <el-input v-model="form.number" maxlength="80" />
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="form.name" maxlength="160" />
          </el-form-item>
          <el-form-item label="内容类型">
            <el-select
              :model-value="form.contentType"
              @update:model-value="onContentTypeChange"
            >
              <el-option label="文字" value="TEXT" />
              <el-option label="图片" value="IMAGE" />
              <el-option label="视频" value="VIDEO" />
              <el-option label="混合" value="MIX" />
            </el-select>
          </el-form-item>
          <el-form-item label="源地址">
            <el-input v-model="form.srcUrl" maxlength="512" />
          </el-form-item>
        </div>

        <el-form-item label="正文">
          <ClientOnly>
            <EditorChapterContentEditor
              v-model="form.content"
              :content-type="form.contentType"
              height="600px"
            />
            <template #fallback>
              <el-skeleton :rows="16" animated />
            </template>
          </ClientOnly>
        </el-form-item>

        <div class="actions">
          <el-button type="primary" :loading="saving" @click="saveChapter">保存正文</el-button>
          <el-button :loading="importing" @click="triggerImport">{{ importButtonLabel }}</el-button>
          <el-progress
            v-if="importing && importProgress > 0"
            :percentage="importProgress"
            :stroke-width="6"
            style="width: 160px"
          />
          <el-button :disabled="!chapter.pre" @click="goChapter(chapter.pre)">上一章</el-button>
          <el-button :disabled="!chapter.next" @click="goChapter(chapter.next)">下一章</el-button>
          <!-- 隐藏的 file input:由导入按钮 click 触发 -->
          <input
            ref="importInputRef"
            type="file"
            class="hidden-file-input"
            :accept="importAccept"
            :multiple="importMultiple"
            @change="onImportFileChange"
          />
        </div>
      </el-form>
    </template>
    <el-empty v-else description="章节不存在或无权访问" />
  </div>
</template>

<script setup lang="ts">
import type { BookContentType, UserBookChapter } from '~/services/user-book-api'

definePageMeta({ layout: 'center', middleware: 'auth' })

const route = useRoute()
const api = useUserBookApi()
const mediaApi = useMediaApi()
const loading = ref(true)
const saving = ref(false)
const importing = ref(false)
const importProgress = ref(0)
const chapter = ref<UserBookChapter | null>(null)
const importInputRef = ref<HTMLInputElement | null>(null)
const bookId = computed(() => Number(route.params.bookId))
const chapterId = computed(() => `${route.params.chapterId}`)

const form = reactive({
  number: '',
  name: '',
  contentType: 'TEXT' as BookContentType,
  srcUrl: '',
  content: '',
})

const chapterTitle = computed(() => [form.number, form.name].filter(Boolean).join(' ') || '章节正文')

// 根据 contentType 决定文件选择器参数
const importAccept = computed(() => {
  switch (form.contentType) {
    case 'IMAGE': return 'image/*,.zip'
    case 'VIDEO': return 'video/*,.zip'
    case 'TEXT':
    case 'MIX':
    default: return '.txt,.md,text/plain,text/markdown'
  }
})
const importMultiple = computed(() => form.contentType === 'IMAGE')
const importButtonLabel = computed(() => {
  if (form.contentType === 'IMAGE') return '批量上传图片 / 压缩包'
  if (form.contentType === 'VIDEO') return '上传视频 / 压缩包'
  return '导入 TXT / Markdown'
})

/**
 * 切换内容类型:若当前正文非空,弹确认让用户先备份。
 * 确认后才清空 form.content 并切换类型;取消则保持原类型不变。
 */
async function onContentTypeChange(newType: BookContentType | string | number | undefined) {
  const target = newType as BookContentType
  if (!target || target === form.contentType) return
  const hasContent = !!(form.content && form.content.trim())
  if (hasContent) {
    try {
      await ElMessageBox?.confirm?.(
        '切换内容类型将清空当前正文。请先在外部备份后再继续,确定要继续吗?',
        '切换内容类型',
        { type: 'warning', confirmButtonText: '清空并切换', cancelButtonText: '取消' },
      )
    } catch {
      // 用户取消:不动 form.contentType,选择器会自动回到旧值
      return
    }
  }
  form.content = ''
  form.contentType = target
}

function triggerImport() {
  const input = importInputRef.value
  if (!input) return
  // 每次触发都清空 value,让选择同名文件也能再次触发 change
  input.value = ''
  input.click()
}

async function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return
  importing.value = true
  try {
    if (form.contentType === 'IMAGE') {
      // 优先识别压缩包:用户可一次性上传一卷番/漫画的所有分镜
      const zipFile = findZipFile(Array.from(files))
      if (zipFile) {
        // 优先调用后端导入解压接口
        try {
          const response = await api.importChapterZip(
            bookId.value,
            chapterId.value,
            zipFile,
            (percent) => { importProgress.value = percent },
          )
          form.content = response.content
          form.srcUrl = response.imageUrls[0] || ''
          ElMessage?.success?.(`已导入 ${response.count} 张图片`)
          return
        } catch (err) {
          // 4xx 错误：显示错误信息，不降级
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status && status >= 400 && status < 500) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
              || '导入失败'
            ElMessage?.error?.(message)
            return
          }
          // 5xx/超时/网络错误：降级为前端 JSZip 逐张上传
          ElMessage?.warning?.('后端导入失败，已切换为逐张上传模式')
          const extracted = await extractImagesFromZip(zipFile)
          await importImages(extracted)
        }
      } else {
        await importImages(Array.from(files))
      }
    } else if (form.contentType === 'VIDEO') {
      // 视频也支持 zip:取第一个视频文件上传
      const zipFile = findZipFile(Array.from(files))
      if (zipFile) {
        const video = await extractFirstVideoFromZip(zipFile)
        if (!video) {
          ElMessage?.error?.('压缩包内未找到视频文件')
          return
        }
        await importVideo(video, { sourceName: zipFile.name })
      } else {
        await importVideo(files[0])
      }
    } else {
      // 文本/混合:不解析 zip
      await importTextFile(files[0])
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '导入失败'
    ElMessage?.error?.(message)
  } finally {
    importing.value = false
    importProgress.value = 0
    if (input) input.value = ''
  }
}

/** 找出第一个 .zip 文件(忽略大小写) */
function findZipFile(files: File[]): File | null {
  return files.find(f => /\.zip$/i.test(f.name)) || null
}

/** 常见图片后缀 */
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|avif|heic|heif)$/i
/** 常见视频后缀 */
const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|mov)$/i

/**
 * 用 JSZip 解压 zip,按文件名排序后把所有图片转成 File 列表。
 * 跳过 macOS 自动生成的 __MACOSX/、.DS_Store 等元数据条目。
 */
async function extractImagesFromZip(zipFile: File): Promise<File[]> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await zipFile.arrayBuffer())
  const collected: { name: string; file: File }[] = []
  const entries = Object.values(zip.files)
  for (const entry of entries) {
    if (entry.dir) continue
    const name = entry.name
    if (!IMAGE_EXT.test(name)) continue
    if (name.includes('__MACOSX/') || name.endsWith('.DS_Store')) continue
    const blob = await entry.async('blob')
    // 用 zip 里的 basename 作为文件名,避免上传到后端时全部是 "image" 这种默认名
    const baseName = name.substring(name.lastIndexOf('/') + 1)
    collected.push({
      name: baseName,
      file: new File([blob], baseName, { type: blob.type || 'image/jpeg', lastModified: zipFile.lastModified }),
    })
  }
  if (!collected.length) {
    throw new Error('压缩包内未找到图片')
  }
  collected.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }))
  return collected.map(c => c.file)
}

/** 取出压缩包内第一个视频文件 */
async function extractFirstVideoFromZip(zipFile: File): Promise<File | null> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await zipFile.arrayBuffer())
  const candidates = Object.values(zip.files).filter(e => {
    if (e.dir) return false
    if (e.name.includes('__MACOSX/') || e.name.endsWith('.DS_Store')) return false
    return VIDEO_EXT.test(e.name)
  })
  candidates.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }))
  const picked = candidates[0]
  if (!picked) return null
  const blob = await picked.async('blob')
  const baseName = picked.name.substring(picked.name.lastIndexOf('/') + 1)
  return new File([blob], baseName, { type: blob.type || 'video/mp4', lastModified: zipFile.lastModified })
}

async function importTextFile(file: File) {
  const text = await file.text()
  form.content = text
  // 文本类型不自动填 srcUrl,保持可读性
  ElMessage?.success?.(`已导入 ${file.name}`)
}

async function importImages(files: File[]) {
  if (!files.length) return
  // 按文件名排序,保持用户预期的顺序
  const ordered = [...files].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }))
  const urls: string[] = []
  for (let i = 0; i < ordered.length; i++) {
    const file = ordered[i]
    try {
      const item = await mediaApi.uploadImage(file, {
        purpose: 'BOOK_CONTENT',
        clientRequestId: buildClientRequestId(),
      })
      const url = item?.previewUrl
      if (url) urls.push(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败'
      ElMessage?.error?.(`${file.name} 上传失败: ${message}`)
    }
  }
  if (!urls.length) {
    ElMessage?.error?.('图片上传均失败,请重试')
    return
  }
  // 内容:按用户输入格式(逗号/换行),ChapterContentEditor 已支持两种分隔
  form.content = urls.join('\n')
  form.srcUrl = urls[0]
  ElMessage?.success?.(`已导入 ${urls.length} 张图片`)
}

async function importVideo(file: File, options: { sourceName?: string } = {}) {
  const item = await mediaApi.uploadVideo(file, {
    purpose: 'BOOK_CONTENT',
    clientRequestId: buildClientRequestId(),
  })
  const url = item?.previewUrl
  if (!url) {
    ElMessage?.error?.('视频上传失败:未返回地址')
    return
  }
  form.content = url
  form.srcUrl = url
  ElMessage?.success?.(`已导入 ${options.sourceName || file.name}`)
}

function buildClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function loadChapter() {
  loading.value = true
  try {
    chapter.value = await api.getChapter(bookId.value, chapterId.value)
    if (chapter.value) {
      Object.assign(form, {
        number: chapter.value.number || '',
        name: chapter.value.name || '',
        contentType: chapter.value.contentType || 'TEXT',
        srcUrl: chapter.value.srcUrl || '',
        content: chapter.value.content || '',
      })
    }
  } catch {
    ElMessage?.error?.('章节加载失败')
  } finally {
    loading.value = false
  }
}

async function saveChapter() {
  if (!chapter.value) return
  saving.value = true
  try {
    const ok = await api.updateChapter(bookId.value, chapter.value.id, {
      ...form,
      pid: chapter.value.pid,
      pre: chapter.value.pre,
      leaf: true,
      status: chapter.value.status ?? 1,
    })
    if (ok) ElMessage?.success?.('章节正文已保存')
  } catch (err) {
    const message = err instanceof Error ? err.message : '章节保存失败'
    ElMessage?.error?.(message)
  } finally {
    saving.value = false
  }
}

async function goChapter(id?: string) {
  if (id) await navigateTo(`/center/books/${bookId.value}/chapter/${id}`)
}

watch(chapterId, loadChapter)
onMounted(loadChapter)
useHead({ title: () => `${chapterTitle.value} - 我的书籍` })
</script>

<style scoped>
.chapter-editor {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.page-header h1 {
  margin: 8px 0 0;
  font-size: 22px;
}
.back-link,
.table-link {
  color: #1677b8;
  text-decoration: none;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.hidden-file-input {
  display: none;
}
@media (max-width: 720px) {
  .page-header,
  .form-grid {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
  }
}
</style>
