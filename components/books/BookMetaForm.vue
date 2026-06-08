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
          <el-option label="小说" value="1" />
          <el-option label="漫画" value="2" />
          <el-option label="其他" value="0" />
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
        <el-input v-model="form.classify" maxlength="120" />
      </el-form-item>
      <el-form-item label="标签">
        <el-input v-model="form.tags" maxlength="160" placeholder="多个标签用逗号分隔" />
      </el-form-item>
      <el-form-item label="来源类型">
        <el-select v-model="form.srcType">
          <el-option label="无" :value="0" />
          <el-option label="网络" :value="1" />
          <el-option label="导入" :value="2" />
        </el-select>
      </el-form-item>
    </div>

    <el-form-item label="封面地址">
      <el-input v-model="form.image" maxlength="512" />
    </el-form-item>
    <el-form-item label="来源地址">
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
import type { UserBookSaveRequest } from '~/services/user-book-api'

const props = withDefaults(defineProps<{
  modelValue?: Partial<UserBookSaveRequest> | null
  saving?: boolean
  submitText?: string
}>(), {
  submitText: '保存',
})

const emit = defineEmits<{
  (e: 'submit', value: UserBookSaveRequest): void
}>()

const formRef = ref()
const form = reactive<UserBookSaveRequest>({
  name: '',
  author: '',
  title: '',
  type: '1',
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

const rules = {
  name: [{ required: true, message: '请输入书名', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

watch(
  () => props.modelValue,
  value => Object.assign(form, {
    name: value?.name || '',
    author: value?.author || '',
    title: value?.title || '',
    type: value?.type || '1',
    classify: value?.classify || '',
    image: value?.image || '',
    srcType: value?.srcType ?? 0,
    srcUrl: value?.srcUrl || '',
    summary: value?.summary || '',
    description: value?.description || '',
    status: value?.status || '0',
    tags: value?.tags || '',
    released: Boolean(value?.released),
  }),
  { immediate: true },
)

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (valid) emit('submit', { ...form })
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
@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
