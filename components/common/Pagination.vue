<template>
  <div class="pagination" v-if="visible">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="currentPageSize"
      :page-sizes="pageSizes"
      :total="total"
      :layout="layout"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  total: number
  pageSize: number
  modelValue: number
  pageSizes?: number[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', page: number): void
  (e: 'update:pageSize', pageSize: number): void
}>()

const currentPage = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const currentPageSize = computed({
  get: () => props.pageSize,
  set: (val) => emit('update:pageSize', val),
})

const totalPages = computed(() => Math.ceil(props.total / props.pageSize))
const visible = computed(() => totalPages.value > 1 || (!!props.pageSizes?.length && props.total > 0))
const layout = computed(() => props.pageSizes?.length
  ? 'total, sizes, prev, pager, next'
  : 'prev, pager, next')
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}
</style>
