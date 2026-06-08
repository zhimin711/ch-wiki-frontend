<template>
  <div class="status-filter">
    <el-input
      :model-value="keyword"
      :placeholder="keywordPlaceholder"
      clearable
      @update:model-value="$emit('update:keyword', String($event || ''))"
      @keyup.enter="$emit('search')"
    />
    <el-select
      :model-value="status"
      clearable
      :placeholder="statusPlaceholder"
      @update:model-value="$emit('update:status', $event == null ? '' : String($event))"
    >
      <el-option
        v-for="option in statusOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </el-select>
    <slot />
    <div class="status-filter__actions">
      <el-button type="primary" :icon="Search" :loading="loading" @click="$emit('search')">查询</el-button>
      <el-button :icon="Refresh" :disabled="loading" @click="$emit('reset')">重置</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Refresh, Search } from '@element-plus/icons-vue'

export interface StatusOption {
  label: string
  value: string
}

withDefaults(defineProps<{
  keyword?: string
  status?: string
  keywordPlaceholder?: string
  statusPlaceholder?: string
  statusOptions?: StatusOption[]
  loading?: boolean
}>(), {
  keyword: '',
  status: '',
  keywordPlaceholder: '输入关键字',
  statusPlaceholder: '状态',
  statusOptions: () => [],
  loading: false,
})

defineEmits<{
  'update:keyword': [value: string]
  'update:status': [value: string]
  search: []
  reset: []
}>()
</script>

<style scoped>
.status-filter {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 150px;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}
.status-filter__actions {
  display: flex;
  gap: 8px;
}
@media (min-width: 900px) {
  .status-filter {
    grid-template-columns: minmax(220px, 1fr) 160px repeat(2, minmax(140px, auto));
  }
}
@media (max-width: 640px) {
  .status-filter {
    grid-template-columns: 1fr;
  }
}
</style>
