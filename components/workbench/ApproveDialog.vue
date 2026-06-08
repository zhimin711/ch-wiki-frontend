<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="min(760px, 94vw)"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="opinion = ''"
  >
    <div class="approve-dialog">
      <iframe
        v-if="content"
        class="approve-dialog__preview"
        title="待审核内容预览"
        sandbox=""
        :srcdoc="content"
      />
      <el-empty v-else description="没有可预览的内容" :image-size="64" />
      <el-input
        v-model="opinion"
        type="textarea"
        :rows="3"
        maxlength="500"
        show-word-limit
        placeholder="审核意见（可选）"
      />
    </div>
    <template #footer>
      <el-button :disabled="loading" @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="danger" :loading="loading" @click="$emit('reject', opinion)">驳回</el-button>
      <el-button
        type="primary"
        :loading="loading"
        :disabled="!allowApprove"
        @click="$emit('approve', opinion)"
      >
        通过
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  content?: string
  loading?: boolean
  allowApprove?: boolean
}>(), {
  title: '内容审核',
  content: '',
  loading: false,
  allowApprove: true,
})

defineEmits<{
  'update:modelValue': [value: boolean]
  approve: [opinion: string]
  reject: [opinion: string]
}>()

const opinion = ref('')
</script>

<style scoped>
.approve-dialog {
  display: grid;
  gap: 14px;
}
.approve-dialog__preview {
  width: 100%;
  height: min(52vh, 440px);
  border: 1px solid #dcdfe6;
  background: #fff;
}
</style>
