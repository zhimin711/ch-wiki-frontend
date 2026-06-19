<template>
  <Teleport to="body">
    <Transition name="efs-fade">
      <div
        v-if="modelValue"
        class="efs-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="close"
      >
        <div class="efs-panel" :style="panelStyle">
          <header class="efs-panel__header">
            <div class="efs-panel__title">{{ title }}</div>
            <div class="efs-panel__actions">
              <slot name="actions" />
              <button
                type="button"
                class="efs-panel__close"
                title="退出全屏（Esc）"
                @click="close"
              >
                <span aria-hidden="true">×</span>
                <span class="efs-panel__close-text">退出全屏</span>
              </button>
            </div>
          </header>
          <div class="efs-panel__body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  topOffset?: string
  bottomOffset?: string
  sideOffset?: string
  closeOnEsc?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '全屏编辑',
  topOffset: '4vh',
  bottomOffset: '4vh',
  sideOffset: '4vw',
  closeOnEsc: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const panelStyle = computed(() => ({
  top: props.topOffset,
  bottom: props.bottomOffset,
  left: props.sideOffset,
  right: props.sideOffset,
}))

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (!props.modelValue) return
  if (e.key === 'Escape' && props.closeOnEsc) {
    e.preventDefault()
    e.stopPropagation()
    close()
  }
}

let prevOverflow: string | null = null

watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === 'undefined') return
    if (open) {
      prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown, true)
    } else {
      document.removeEventListener('keydown', onKeydown, true)
      if (prevOverflow !== null) {
        document.body.style.overflow = prevOverflow
        prevOverflow = null
      } else {
        document.body.style.overflow = ''
      }
    }
  },
)

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', onKeydown, true)
  if (prevOverflow !== null) {
    document.body.style.overflow = prevOverflow
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.efs-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}
.efs-panel {
  position: fixed;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.efs-panel__header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}
.efs-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.efs-panel__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.efs-panel__close {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.efs-panel__close:hover {
  color: #1677b8;
  border-color: #1677b8;
  background: #ecf5ff;
}
.efs-panel__close span[aria-hidden] {
  font-size: 18px;
  line-height: 1;
}
.efs-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px 14px;
  overflow: auto;
}
.efs-fade-enter-active,
.efs-fade-leave-active {
  transition: opacity 0.18s ease;
}
.efs-fade-enter-from,
.efs-fade-leave-to {
  opacity: 0;
}
</style>