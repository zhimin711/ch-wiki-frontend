<template>
  <div class="md-editor">
    <div class="md-editor__toolbar">
      <el-button-group>
        <el-button size="small" @click="wrapSelection('**', '**')" title="粗体">B</el-button>
        <el-button size="small" @click="wrapSelection('*', '*')" title="斜体"><i>I</i></el-button>
        <el-button size="small" @click="wrapSelection('~~', '~~')" title="删除线"><s>S</s></el-button>
        <el-button size="small" @click="wrapSelection('`', '`')" title="行内代码">&lt;/&gt;</el-button>
      </el-button-group>
      <el-button-group>
        <el-button size="small" @click="prefixLine('## ')" title="二级标题">H2</el-button>
        <el-button size="small" @click="prefixLine('### ')" title="三级标题">H3</el-button>
        <el-button size="small" @click="prefixLine('#### ')" title="四级标题">H4</el-button>
      </el-button-group>
      <el-button-group>
        <el-button size="small" @click="prefixLine('> ')" title="引用">❝</el-button>
        <el-button size="small" @click="prefixLine('- ')" title="无序列表">• 列表</el-button>
        <el-button size="small" @click="prefixLine('1. ')" title="有序列表">1. 列表</el-button>
        <el-button size="small" @click="prefixLine('---')" title="分割线">—</el-button>
      </el-button-group>
      <el-button-group>
        <el-button size="small" @click="wrapSelection('[', '](https://)')" title="链接">🔗</el-button>
        <el-button size="small" @click="insertImage()" title="图片">🖼</el-button>
        <el-button size="small" @click="insertCodeBlock()" title="代码块">{ }</el-button>
        <el-button size="small" @click="insertTable()" title="表格">▦</el-button>
      </el-button-group>
      <el-button-group class="md-editor__toggle">
        <el-button
          size="small"
          :type="preview ? 'primary' : 'default'"
          @click="preview = !preview"
        >
          {{ preview ? '隐藏预览' : '显示预览' }}
        </el-button>
      </el-button-group>
    </div>
    <div class="md-editor__body" :class="{ 'with-preview': preview }">
      <textarea
        ref="textareaRef"
        v-model="content"
        class="md-editor__input"
        :placeholder="placeholder"
        @input="onInput"
        @keyup="recordSelection"
        @click="recordSelection"
        @select="recordSelection"
      />
      <div v-if="preview" class="md-editor__preview markdown-body" v-html="renderedHtml" />
    </div>
    <div class="md-editor__status">
      <span>字符数 {{ charCount }}</span>
      <span v-if="preview" class="md-editor__sep">·</span>
      <span v-if="preview">实时预览</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'

interface Props {
  modelValue?: string
  placeholder?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '使用 Markdown 语法书写正文...',
  height: '520px',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const content = ref<string>(props.modelValue || '')
const preview = ref<boolean>(true)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const selection = reactive({ start: 0, end: 0 })

function highlightCode(str: string, lang: string): string {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return `<pre class="hljs"><code>${
        hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      }</code></pre>`
    } catch (_e) { /* ignore */ }
  }
  return `<pre class="hljs"><code>${mdEscaper(str)}</code></pre>`
}

function mdEscaper(s: string): string {
  // 由 getMd() 延迟绑定,避免初始化时的循环引用
  return escapeHtml(s)
}

let escapeHtml: (s: string) => string = (s) => s

const mdOptions = {
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: highlightCode,
}

const md = new MarkdownIt(mdOptions)
escapeHtml = (s: string) => md.utils.escapeHtml(s)

// 为代码块加上 data-lang 便于自定义样式
const defaultFenceRender = md.renderer.rules.fence?.bind(md.renderer) as
  ((tokens: any[], idx: number, options: any, env: any, self: any) => string) | undefined

md.renderer.rules.fence = (tokens: any[], idx: number, options: any, env: any, self: any): string => {
  const token = tokens[idx]
  const lang = token.info.trim().split(/\s+/g)[0] || ''
  if (lang) token.info = lang
  const html = defaultFenceRender ? defaultFenceRender(tokens, idx, options, env, self) : ''
  return html.replace('<pre class="hljs">', `<pre class="hljs" data-lang="${md.utils.escapeHtml(lang)}">`)
}

const renderedHtml = computed(() => md.render(content.value || ''))
const charCount = computed(() => (content.value || '').length)

function onInput() {
  emit('update:modelValue', content.value)
}

function recordSelection() {
  const ta = textareaRef.value
  if (!ta) return
  selection.start = ta.selectionStart
  selection.end = ta.selectionEnd
}

function applyChange(next: string, cursor: number, selEnd?: number) {
  content.value = next
  emit('update:modelValue', next)
  nextTick(() => {
    const ta = textareaRef.value
    if (!ta) return
    ta.focus()
    ta.setSelectionRange(cursor, selEnd ?? cursor)
    selection.start = cursor
    selection.end = selEnd ?? cursor
  })
}

function wrapSelection(prefix: string, suffix: string) {
  const value = content.value
  const { start, end } = selection
  const selected = value.slice(start, end) || '文本'
  const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end)
  const cursor = start + prefix.length + selected.length
  applyChange(next, cursor + suffix.length, cursor + suffix.length)
}

function prefixLine(prefix: string) {
  const value = content.value
  const { start } = selection
  // 在当前行首插入 prefix;若已在行首则不重复
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineHead = value.slice(lineStart, lineStart + prefix.length)
  if (lineHead === prefix) {
    // 已存在,光标后移即可
    const cursor = start + prefix.length
    applyChange(value, cursor, cursor)
    return
  }
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
  const offset = start - lineStart
  const cursor = lineStart + prefix.length + offset
  applyChange(next, cursor, cursor)
}

function insertImage() {
  wrapSelection('![', '](https://)')
}

function insertCodeBlock() {
  const value = content.value
  const { start, end } = selection
  const selected = value.slice(start, end) || '// code'
  const block = '\n```\n' + selected + '\n```\n'
  const next = value.slice(0, start) + block + value.slice(end)
  const cursorStart = start + '\n```\n'.length
  const cursorEnd = cursorStart + selected.length
  applyChange(next, cursorEnd, cursorEnd)
  selection.start = cursorStart
  selection.end = cursorEnd
  nextTick(() => {
    const ta = textareaRef.value
    if (ta) ta.setSelectionRange(cursorStart, cursorEnd)
  })
}

function insertTable() {
  const block = [
    '',
    '| 列 1 | 列 2 | 列 3 |',
    '| --- | --- | --- |',
    '| 内容 | 内容 | 内容 |',
    '',
  ].join('\n')
  const value = content.value
  const { start, end } = selection
  const next = value.slice(0, start) + block + value.slice(end)
  const cursor = start + block.length
  applyChange(next, cursor, cursor)
}

watch(
  () => props.modelValue,
  (val) => {
    if (val == null) return
    if (val === content.value) return
    content.value = val
  },
)
</script>

<style scoped>
.md-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
}
.md-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 10px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}
.md-editor__toggle {
  margin-left: auto;
}
.md-editor__body {
  display: flex;
  min-height: 360px;
}
.md-editor__body.with-preview .md-editor__input {
  border-right: 1px solid #ebeef5;
}
.md-editor__input {
  flex: 1;
  width: 100%;
  min-height: 360px;
  padding: 14px 16px;
  border: none;
  outline: none;
  resize: vertical;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.7;
  color: #303133;
  background: #fff;
  box-sizing: border-box;
}
.md-editor__preview {
  flex: 1;
  min-height: 360px;
  max-height: 600px;
  overflow-y: auto;
  padding: 14px 18px;
  background: #fcfcfd;
  font-size: 15px;
  line-height: 1.8;
  color: #303133;
}
.md-editor__preview :deep(h1),
.md-editor__preview :deep(h2),
.md-editor__preview :deep(h3),
.md-editor__preview :deep(h4) {
  margin-top: 1.2em;
  margin-bottom: 0.6em;
}
.md-editor__preview :deep(pre) {
  background: #f6f8fa;
  padding: 12px 14px;
  border-radius: 6px;
  overflow-x: auto;
}
.md-editor__preview :deep(code) {
  background: rgba(27, 31, 35, 0.06);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.92em;
}
.md-editor__preview :deep(pre code) {
  background: transparent;
  padding: 0;
}
.md-editor__preview :deep(blockquote) {
  border-left: 4px solid #dcdfe6;
  color: #606266;
  padding: 4px 12px;
  margin: 12px 0;
  background: #fafafa;
}
.md-editor__preview :deep(table) {
  border-collapse: collapse;
  margin: 12px 0;
}
.md-editor__preview :deep(table th),
.md-editor__preview :deep(table td) {
  border: 1px solid #dcdfe6;
  padding: 6px 12px;
}
.md-editor__preview :deep(img) {
  max-width: 100%;
}
.md-editor__status {
  display: flex;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: #909399;
  background: #fafafa;
  border-top: 1px solid #ebeef5;
}
.md-editor__sep {
  color: #dcdfe6;
}
</style>
