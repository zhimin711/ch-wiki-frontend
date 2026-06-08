import { ref, type Ref } from 'vue'

interface PaginationOptions {
  pageSize?: number
}

/** 分页组合式函数 */
export function usePagination(options: PaginationOptions = {}) {
  const pageSize = ref(options.pageSize || 10)
  const pageNum = ref(1)
  const total = ref(0)

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
  const hasNext = computed(() => pageNum.value < totalPages.value)
  const hasPrev = computed(() => pageNum.value > 1)

  function goToPage(page: number) {
    pageNum.value = Math.max(1, Math.min(page, totalPages.value))
  }

  function nextPage() {
    if (hasNext.value) pageNum.value++
  }

  function prevPage() {
    if (hasPrev.value) pageNum.value--
  }

  function reset() {
    pageNum.value = 1
    total.value = 0
  }

  return {
    pageNum,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrev,
    goToPage,
    nextPage,
    prevPage,
    reset,
  }
}
