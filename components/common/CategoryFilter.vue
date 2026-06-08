<template>
  <div class="category-filter">
    <el-select
      :model-value="modelValue"
      placeholder="选择分类"
      clearable
      @update:model-value="emit('update:modelValue', $event)"
    >
      <el-option
        v-for="cat in categories"
        :key="cat.id"
        :label="cat.name"
        :value="String(cat.id)"
      />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import type { APIClassifyDTO } from '~/services/public-api'

defineProps<{
  categories: APIClassifyDTO[]
  modelValue: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()
</script>

<style scoped>
.category-filter {
  display: inline-block;
}
</style>
