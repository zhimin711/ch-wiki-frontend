<template>
  <div class="pagination" v-if="totalPages > 1">
    <el-pagination
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      layout="prev, pager, next"
      @current-change="onPageChange"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  total: number
  pageSize: number
  modelValue: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', page: number): void
}>()

const currentPage = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

function onPageChange(page: number) {
  emit('update:modelValue', page)
}
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}
</style>
