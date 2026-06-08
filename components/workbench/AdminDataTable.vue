<template>
  <section class="admin-table">
    <el-alert
      v-if="error"
      class="admin-table__error"
      type="error"
      :title="error"
      :closable="false"
      show-icon
    >
      <template #default>
        <el-button link type="primary" :loading="loading" @click="$emit('retry')">重新加载</el-button>
      </template>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="rows"
      :row-key="rowKey"
      border
      stripe
      table-layout="fixed"
      @selection-change="$emit('selection-change', $event)"
    >
      <slot />
      <template #empty>
        <el-empty :description="emptyText" :image-size="72" />
      </template>
    </el-table>

    <div v-if="total > 0" class="admin-table__pagination">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next, jumper"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="pageSizes"
        :total="total"
        @update:current-page="$emit('update:page', $event)"
        @update:page-size="$emit('update:page-size', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  rows: Record<string, any>[]
  loading?: boolean
  error?: string
  emptyText?: string
  rowKey?: string
  page: number
  pageSize: number
  total: number
  pageSizes?: number[]
}>(), {
  loading: false,
  error: '',
  emptyText: '暂无数据',
  rowKey: 'id',
  pageSizes: () => [10, 20, 50],
})

defineEmits<{
  'update:page': [value: number]
  'update:page-size': [value: number]
  retry: []
  'selection-change': [rows: Record<string, any>[]]
}>()
</script>

<style scoped>
.admin-table {
  min-width: 0;
}
.admin-table__error {
  margin-bottom: 14px;
}
.admin-table__pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  overflow-x: auto;
}
</style>
