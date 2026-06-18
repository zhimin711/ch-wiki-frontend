<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
    <div class="form-grid">
      <el-form-item label="书名" prop="name">
        <el-input v-model="form.name" maxlength="120" show-word-limit />
      </el-form-item>
      <el-form-item label="作者">
        <el-input v-model="form.author" maxlength="80" />
      </el-form-item>
      <el-form-item label="副标题">
        <el-input v-model="form.title" maxlength="160" />
      </el-form-item>
      <el-form-item label="类型" prop="type">
        <el-select v-model="form.type">
          <el-option
            v-for="item in bookTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status">
          <el-option label="新书" value="0" />
          <el-option label="连载" value="1" />
          <el-option label="完结" value="2" />
          <el-option label="暂无内容" value="4" />
        </el-select>
      </el-form-item>
      <el-form-item label="分类">
        <el-cascader
          v-model="classifyPath"
          :options="classifyOptions"
          :props="classifyProps"
          clearable
          filterable
          placeholder="选择书籍分类"
        />
      </el-form-item>
      <el-form-item label="标签">
        <el-input v-model="form.tags" maxlength="160" placeholder="多个标签用逗号分隔" />
      </el-form-item>
      <el-form-item label="来源类型">
        <el-select v-model="form.srcType" @change="onSrcTypeChange">
          <el-option label="无" :value="0" />
          <el-option label="网络" :value="1" />
          <el-option label="导入" :value="2" />
        </el-select>
      </el-form-item>
    </div>

    <el-form-item label="封面">
      <div class="cover-row">
        <CommonImageUploader
          v-model="form.image"
          purpose="BOOK_COVER"
          alt="书籍封面预览"
          :width="120"
          :height="160"
          hint="支持 jpg / png / webp / gif。上传后会自动回填地址;不再需要时可点上传区下方“清除”清空。"
        />
        <div class="cover-meta">
          <div v-if="form.image" class="cover-meta__row">
            <span class="cover-meta__label">当前地址</span>
            <el-input
              :model-value="form.image"
              readonly
              class="cover-meta__input"
              @click="selectCoverInput"
            >
              <template #append>
                <el-button :icon="DocumentCopy" title="复制" @click="copyCoverUrl" />
              </template>
            </el-input>
            <el-button link type="danger" @click="clearCover">清空</el-button>
          </div>
          <p v-else class="cover-meta__empty">尚未上传封面。点击左侧“选择图片”开始上传。</p>
        </div>
      </div>
    </el-form-item>
    <el-form-item v-if="requiresSourceUrl" label="来源地址" prop="srcUrl">
      <el-input v-model="form.srcUrl" maxlength="1000" />
    </el-form-item>
    <el-form-item label="摘要">
      <el-input v-model="form.summary" type="textarea" :rows="3" maxlength="500" show-word-limit />
    </el-form-item>
    <el-form-item label="描述">
      <el-input v-model="form.description" type="textarea" :rows="5" maxlength="2000" show-word-limit />
    </el-form-item>

    <div class="form-actions">
      <el-switch v-model="form.released" active-text="公开发布" />
      <el-button type="primary" :loading="saving" @click="submit">{{ submitText }}</el-button>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { DocumentCopy } from '@element-plus/icons-vue'
import type { CascaderOption } from 'element-plus'
import type { APIClassifyDTO } from '~/services/public-api'
import type { UserBookSaveRequest } from '~/services/user-book-api'
import { normalizeBookType } from '~/services/user-book-api'

const props = withDefaults(defineProps<{
  modelValue?: Partial<UserBookSaveRequest> | null
  categories?: APIClassifyDTO[]
  saving?: boolean
  submitText?: string
}>(), {
  submitText: '保存',
  categories: () => [],
})

const emit = defineEmits<{
  (e: 'submit', value: UserBookSaveRequest): void
}>()

const formRef = ref()
const form = reactive<UserBookSaveRequest>({
  name: '',
  author: '',
  title: '',
  type: 'TEXT',
  classify: '',
  image: '',
  srcType: 0,
  srcUrl: '',
  summary: '',
  description: '',
  status: '0',
  tags: '',
  released: false,
})
const classifyPath = ref<string[]>([])
const bookTypeOptions = [
  { label: '文字类型', value: 'TEXT' },
  { label: '图画类型', value: 'IMAGE' },
]
const classifyProps = {
  checkStrictly: true,
  emitPath: true,
}
const classifyOptions = computed(() => toClassifyOptions(props.categories))
const requiresSourceUrl = computed(() => form.srcType === 1 || form.srcType === 2)

const rules = {
  name: [{ required: true, message: '请输入书名', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  srcUrl: [{
    validator: (_: unknown, value: string | undefined, callback: (error?: Error) => void) => {
      if (requiresSourceUrl.value && !`${value || ''}`.trim()) {
        return callback(new Error('请输入来源地址'))
      }
      callback()
    },
    trigger: 'blur',
  }],
}

watch(
  () => props.modelValue,
  applyValue,
  { immediate: true },
)

watch(
  () => props.categories,
  () => {
    classifyPath.value = toClassifyPath(form.classify)
  },
  { deep: true },
)

function applyValue(value?: Partial<UserBookSaveRequest> | null) {
  Object.assign(form, {
    name: value?.name || '',
    author: value?.author || '',
    title: value?.title || '',
    type: normalizeBookType(value?.type) || 'TEXT',
    classify: value?.classify || '',
    image: value?.image || '',
    srcType: value?.srcType ?? 0,
    srcUrl: value?.srcUrl || '',
    summary: value?.summary || '',
    description: value?.description || '',
    status: value?.status || '0',
    tags: value?.tags || '',
    released: Boolean(value?.released),
  })
  classifyPath.value = toClassifyPath(form.classify)
}

function toClassifyOptions(categories: APIClassifyDTO[]): CascaderOption[] {
  return (categories || []).map(item => ({
    label: item.name,
    value: `${item.id}`,
    children: item.children?.length ? toClassifyOptions(item.children) : undefined,
  }))
}

function toClassifyPath(value?: string) {
  const ids = `${value || ''}`.split(',').map(item => item.trim()).filter(Boolean)
  if (!ids.length) return []
  return findClassifyPath(props.categories, ids.at(-1) || '') || ids
}

function findClassifyPath(categories: APIClassifyDTO[], target: string, parents: string[] = []): string[] | null {
  for (const item of categories || []) {
    const path = [...parents, `${item.id}`]
    if (`${item.id}` === target) return path
    const childPath = findClassifyPath(item.children || [], target, path)
    if (childPath) return childPath
  }
  return null
}

function selectedClassifyValue() {
  return classifyPath.value.at(-1) || ''
}

function onSrcTypeChange() {
  form.srcUrl = ''
}

function clearCover() {
  // 双向清空:既清 form.image,ImageUploader 内部也会切回占位图
  form.image = ''
  ElMessage?.success?.('已清空封面')
}

function selectCoverInput(event: FocusEvent | MouseEvent) {
  const target = event.target as HTMLInputElement | null
  if (target && typeof target.select === 'function') {
    target.select()
  }
}

async function copyCoverUrl() {
  const url = form.image
  if (!url) return
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url)
      ElMessage?.success?.('封面地址已复制')
      return
    }
  } catch {
    /* fall through to legacy fallback */
  }
  // 兜底:用临时 textarea + execCommand('copy')
  if (typeof document === 'undefined') return
  const textarea = document.createElement('textarea')
  textarea.value = url
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
    ElMessage?.success?.('封面地址已复制')
  } catch {
    ElMessage?.error?.('复制失败,请手动选中')
  } finally {
    document.body.removeChild(textarea)
  }
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', {
    ...form,
    type: normalizeBookType(form.type) || 'TEXT',
    classify: selectedClassifyValue(),
    srcUrl: requiresSourceUrl.value ? form.srcUrl : '',
  })
}
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
:deep(.el-cascader) {
  width: 100%;
}
/* 封面:左侧缩略图上传,右侧地址回填(只读) + 复制 + 清空 */
.cover-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.cover-meta {
  flex: 1 1 240px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cover-meta__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cover-meta__label {
  flex-shrink: 0;
  font-size: 12px;
  color: #909399;
}
.cover-meta__input {
  flex: 1 1 auto;
  min-width: 0;
}
.cover-meta__empty {
  margin: 0;
  font-size: 12px;
  color: #909399;
  padding: 4px 0;
}
@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .cover-row {
    flex-direction: column;
  }
  .cover-meta {
    width: 100%;
  }
  .cover-meta__row {
    flex-wrap: wrap;
  }
  .cover-meta__input {
    width: 100%;
  }
}
</style>
