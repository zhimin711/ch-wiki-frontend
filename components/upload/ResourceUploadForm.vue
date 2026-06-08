<template>
  <div class="resource-editor">
    <div class="page-header">
      <div>
        <h1>{{ mode === 'edit' ? '编辑资源' : '上传资源' }}</h1>
        <p>维护资源文件、分类和展示信息。</p>
      </div>
      <NuxtLink to="/center/resource" class="table-link">返回列表</NuxtLink>
    </div>

    <el-skeleton v-if="loading" :rows="8" animated />
    <el-form v-else ref="formRef" :model="form" :rules="rules" label-position="top">
      <div class="form-grid">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" filterable placeholder="选择分类">
            <el-option
              v-for="item in flatCategories"
              :key="item.id"
              :label="item.label"
              :value="`${item.id}`"
            />
          </el-select>
        </el-form-item>
      </div>

      <div class="form-grid">
        <el-form-item label="资源类型" prop="type">
          <el-select v-model="form.type">
            <el-option label="文档" value="0" />
            <el-option label="工具" value="1" />
            <el-option label="代码" value="2" />
            <el-option label="其他" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="展示方式" prop="showMode">
          <el-segmented v-model="form.showMode" :options="showModeOptions" />
        </el-form-item>
      </div>

      <el-form-item label="标签" prop="keywords">
        <el-input v-model="form.keywords" maxlength="120" placeholder="多个标签用逗号分隔" />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="5" maxlength="500" show-word-limit />
      </el-form-item>

      <el-form-item :label="mode === 'edit' ? '替换文件' : '资源文件'" prop="file">
        <el-upload
          ref="uploadRef"
          drag
          :auto-upload="false"
          :limit="1"
          :accept="acceptedExtensions"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :on-exceed="handleFileExceed"
        >
          <div class="upload-copy">
            <strong>{{ selectedFile ? selectedFile.name : '选择或拖入文件' }}</strong>
            <span>支持 PDF、Office、压缩包等格式，最大 50MB</span>
          </div>
        </el-upload>
        <small v-if="mode === 'edit' && !selectedFile" class="field-hint">不选择文件将保留当前文件。</small>
      </el-form-item>

      <div v-if="initialValue?.previewUrl || initialValue?.downloadUrl" class="current-file">
        <span>当前文件</span>
        <a
          v-if="initialValue.previewUrl"
          :href="initialValue.previewUrl"
          target="_blank"
          rel="noopener noreferrer"
        >预览</a>
        <a
          v-if="initialValue.downloadUrl"
          :href="initialValue.downloadUrl"
          target="_blank"
          rel="noopener noreferrer"
        >下载</a>
      </div>

      <el-progress
        v-if="saving || uploadProgress > 0"
        :percentage="uploadProgress"
        :status="submitError ? 'exception' : undefined"
      />
      <el-alert v-if="submitError" :title="submitError" type="error" :closable="false" show-icon />

      <div class="form-actions">
        <el-button type="primary" :loading="saving" @click="submit">
          {{ submitError ? '重试提交' : mode === 'edit' ? '保存修改' : '上传并提交' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import type { APIClassifyDTO } from '~/services/public-api'
import type { UserResourceItem, UserResourceSaveRequest } from '~/services/resource-api'

interface FlatCategory {
  id: number
  label: string
}

const props = withDefaults(defineProps<{
  mode: 'add' | 'edit'
  initialValue?: UserResourceItem | null
  categories: APIClassifyDTO[]
  loading?: boolean
  saving?: boolean
  uploadProgress?: number
  submitError?: string
}>(), {
  uploadProgress: 0,
  submitError: '',
})

const emit = defineEmits<{
  (e: 'submit', value: UserResourceSaveRequest): void
}>()

const MAX_FILE_SIZE = 50 * 1024 * 1024
const allowedExtensions = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'chm', 'zip', 'rar', 'gz', 'tar', '7z'])
const acceptedExtensions = [...allowedExtensions].map(item => `.${item}`).join(',')
const formRef = ref()
const uploadRef = ref()
const selectedFile = ref<File | null>(null)

const form = reactive({
  title: '',
  categoryId: '',
  type: '0',
  keywords: '',
  description: '',
  showMode: '0',
})

const showModeOptions = [
  { label: '隐藏', value: '0' },
  { label: '公开', value: '1' },
]

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

const flatCategories = computed(() => flattenCategories(props.categories))

watch(
  () => props.initialValue,
  (value) => {
    if (!value) return
    Object.assign(form, {
      title: value.title || '',
      categoryId: value.categoryId ? `${value.categoryId}` : '',
      type: value.type || '0',
      keywords: value.keywords || '',
      description: value.description || '',
      showMode: value.showMode === '1' ? '1' : '0',
    })
  },
  { immediate: true },
)

function flattenCategories(categories: APIClassifyDTO[], prefix = ''): FlatCategory[] {
  const result: FlatCategory[] = []
  for (const item of categories || []) {
    const label = prefix ? `${prefix} / ${item.name}` : item.name
    if (!item.children || item.children.length === 0) {
      result.push({ id: item.id, label })
    } else {
      result.push(...flattenCategories(item.children, label))
    }
  }
  return result
}

function extensionOf(fileName: string) {
  return fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : ''
}

function validateFile(file: File) {
  if (!allowedExtensions.has(extensionOf(file.name))) {
    ElMessage?.error?.('不支持该文件格式')
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    ElMessage?.error?.('资源文件不能超过 50MB')
    return false
  }
  return true
}

function handleFileChange(uploadFile: { raw?: File }) {
  const file = uploadFile.raw
  if (!file || !validateFile(file)) {
    selectedFile.value = null
    uploadRef.value?.clearFiles?.()
    return
  }
  selectedFile.value = file
  if (!form.title) {
    form.title = file.name.replace(/\.[^.]+$/, '')
  }
}

function handleFileRemove() {
  selectedFile.value = null
}

function handleFileExceed() {
  ElMessage?.warning?.('每次只能选择一个资源文件')
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (props.mode === 'add' && !selectedFile.value) {
    ElMessage?.warning?.('请选择资源文件')
    return
  }
  emit('submit', {
    ...form,
    file: selectedFile.value,
  })
}
</script>

<style scoped>
.resource-editor {
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
  margin: 0 0 6px;
  font-size: 22px;
  color: #303133;
}
.page-header p {
  margin: 0;
  color: #909399;
  font-size: 13px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.upload-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #606266;
}
.upload-copy span,
.field-hint {
  color: #909399;
  font-size: 12px;
}
.current-file {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: -4px 0 18px;
  color: #606266;
}
.current-file a,
.table-link {
  color: #409eff;
  text-decoration: none;
}
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}
@media (max-width: 768px) {
  .page-header,
  .form-grid {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
  }
}
</style>
