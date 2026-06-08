<template>
  <div class="article-page" v-if="article">
    <!-- 顶部阅读进度条 -->
    <div class="reading-progress" :style="{ width: progress + '%' }" />

    <!-- 头图 -->
    <div v-if="article.image" class="article-cover">
      <img :src="article.image" :alt="article.title" />
    </div>

    <!-- 头部（标题区） -->
    <header class="article-header">
      <div class="article-header-inner">
        <NuxtLink
          v-if="article.categoryId"
          :to="`/tech?categoryId=${article.categoryId}`"
          class="article-category"
        >
          {{ article.categoryName || '未分类' }}
        </NuxtLink>

        <h1 class="article-title">{{ article.title }}</h1>

        <p v-if="article.description" class="article-desc">{{ article.description }}</p>

        <!-- 关键词 tag（仍保留在标题区） -->
        <div v-if="article.keywords" class="article-keywords">
          <el-tag
            v-for="kw in keywordsList"
            :key="kw"
            size="small"
            effect="plain"
            round
            class="keyword-tag"
          >
            {{ kw }}
          </el-tag>
        </div>
      </div>
    </header>

    <!-- 移动端目录按钮 -->
    <button
      v-if="toc.length"
      class="toc-mobile-toggle"
      :class="{ active: mobileTocOpen }"
      @click="mobileTocOpen = !mobileTocOpen"
    >
      <el-icon><Menu /></el-icon>
      <span>目录</span>
    </button>

    <!-- 主体三栏 -->
    <div class="article-layout">
      <!-- 左：目录（始终占位，避免 grid 塌陷） -->
      <aside class="toc-sidebar" :class="{ open: mobileTocOpen }">
        <div class="toc-sticky">
          <div class="toc-title">
            <el-icon><Notebook /></el-icon>
            <span>文章目录</span>
          </div>
          <ul v-if="toc.length" class="toc-list">
            <li
              v-for="item in tocVisible"
              :key="item.id"
              :class="['toc-item', `toc-level-${item.level}`, { active: activeId === item.id, passed: passedIds.has(item.id) }]"
            >
              <a :href="`#${item.id}`" @click.prevent="scrollToHeading(item.id)">
                <span class="toc-progress" />
                <span class="toc-text">{{ item.text }}</span>
              </a>
            </li>
          </ul>
          <button
            v-if="tocHiddenCount > 0"
            class="toc-toggle"
            @click="tocExpanded = !tocExpanded"
          >
            <el-icon><component :is="tocExpanded ? ArrowUp : ArrowDown" /></el-icon>
            <span v-if="tocExpanded">收起</span>
            <span v-else>展开剩余 {{ tocHiddenCount }} 条</span>
          </button>
          <div v-else-if="!toc.length" class="toc-empty">
            <el-icon><DocumentRemove /></el-icon>
            <p>本文暂无目录</p>
            <p class="toc-empty-tip">使用 H1-H3 标题或 "1、分点" 格式自动生成</p>
          </div>
        </div>
      </aside>

      <!-- 中：正文 -->
      <article class="article-body">
        <div ref="contentRef" class="article-content prose" v-html="renderedContent" />

        <!-- 文末版权 / 标签 -->
        <div v-if="article.keywords" class="article-footer-tags">
          <span class="footer-label">本文标签：</span>
          <el-tag
            v-for="kw in keywordsList"
            :key="`f-${kw}`"
            size="small"
            effect="plain"
            round
            class="keyword-tag"
          >
            {{ kw }}
          </el-tag>
        </div>

        <!-- 评论 -->
        <ArticleComments :article-id="article.id" />

        <!-- 推荐文章 -->
        <section v-if="article.recommendArticles?.length" class="recommend-section">
          <h3 class="section-title">
            <el-icon><Promotion /></el-icon>
            相关推荐
          </h3>
          <div class="recommend-grid">
            <NuxtLink
              v-for="rec in article.recommendArticles"
              :key="rec.id"
              :to="`/tech/${rec.id}`"
              class="recommend-card"
            >
              <div v-if="rec.image" class="recommend-cover">
                <img :src="rec.image" :alt="rec.title" />
              </div>
              <div class="recommend-body">
                <h4 class="recommend-title">{{ rec.title }}</h4>
                <p v-if="rec.description" class="recommend-desc">{{ rec.description }}</p>
                <div class="recommend-meta">
                  <span v-if="rec.categoryName" class="recommend-cat">
                    {{ rec.categoryName }}
                  </span>
                  <span v-if="rec.author">· {{ rec.author }}</span>
                  <span v-if="rec.countView != null">· {{ rec.countView }} 阅读</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </section>
      </article>

      <!-- 右：作者 + 完整文章信息（已从顶部迁来） -->
      <aside v-if="article.author" class="author-sidebar">
        <div class="author-sticky">
          <!-- 作者卡（始终显示） -->
          <div class="author-card">
            <el-avatar :size="56" :src="authorAvatar" :alt="article.author" />
            <div class="author-name">{{ article.author }}</div>
            <div v-if="article.authorRemark" class="author-remark">
              {{ article.authorRemark }}
            </div>
          </div>

          <div class="info-card">
            <h4 class="info-title">文章信息</h4>
            <ul class="info-list">
              <li v-if="article.publishAt">
                <span class="info-label">
                  <el-icon><Calendar /></el-icon>
                  发布
                </span>
                <span class="info-value">{{ formatDate(article.publishAt) }}</span>
              </li>
              <li v-if="article.countView != null">
                <span class="info-label">
                  <el-icon><View /></el-icon>
                  阅读
                </span>
                <span class="info-value">{{ article.countView }}</span>
              </li>
              <li v-if="article.countComment != null">
                <span class="info-label">
                  <el-icon><ChatLineRound /></el-icon>
                  评论
                </span>
                <span class="info-value">{{ article.countComment }}</span>
              </li>
              <li v-if="article.avgScore != null && article.avgScore > 0">
                <span class="info-label">
                  <el-icon><Star /></el-icon>
                  评分
                </span>
                <span class="info-value">{{ article.avgScore.toFixed(1) }}</span>
              </li>
              <li>
                <span class="info-label">
                  <el-icon><Document /></el-icon>
                  字数
                </span>
                <span class="info-value">{{ wordCount }}</span>
              </li>
              <li>
                <span class="info-label">
                  <el-icon><Reading /></el-icon>
                  时长
                </span>
                <span class="info-value">约 {{ readingMinutes }} 分钟</span>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>

    <!-- 全局返回顶部按钮（任何时候都可见） -->
    <button
      class="back-top-global"
      :class="{ visible: progress > 5 }"
      @click="scrollToTop"
      title="回到顶部"
      aria-label="回到顶部"
    >
      <el-icon><Top /></el-icon>
    </button>
  </div>
  <el-empty v-else description="文章不存在或未公开" />
</template>

<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChatLineRound,
  Document,
  DocumentRemove,
  Menu,
  Notebook,
  Promotion,
  Reading,
  Star,
  Top,
  View,
} from '@element-plus/icons-vue'
import type { PublicArticleDetailDTO } from '~/services/public-api'

// highlight.js 代码高亮
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import scss from 'highlight.js/lib/languages/scss'
import yaml from 'highlight.js/lib/languages/yaml'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import nginx from 'highlight.js/lib/languages/nginx'
import sql from 'highlight.js/lib/languages/sql'
import java from 'highlight.js/lib/languages/java'
import python from 'highlight.js/lib/languages/python'
import go from 'highlight.js/lib/languages/go'
import markdown from 'highlight.js/lib/languages/markdown'

const LANG_ALIASES: Record<string, string> = {
  sh: 'bash',
  shell: 'bash',
  js: 'javascript',
  ts: 'typescript',
  yml: 'yaml',
  html: 'xml',
  vue: 'xml',
  py: 'python',
  md: 'markdown',
}
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('scss', scss)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('dockerfile', dockerfile)
hljs.registerLanguage('nginx', nginx)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('java', java)
hljs.registerLanguage('python', python)
hljs.registerLanguage('go', go)
hljs.registerLanguage('markdown', markdown)

const route = useRoute()
const { getArticleDetail } = usePublicApi()
const { render: renderContent } = useArticleContent()

const id = computed(() => Number(route.params.id))
const { data: result } = await useAsyncData(`article-${id.value}`, () => getArticleDetail(id.value))
const article = computed<PublicArticleDetailDTO | null>(() => result.value ?? null)

// 渲染后的文章正文（自动判断 HTML / markdown）
const renderedContent = computed(() => renderContent(article.value?.content || ''))

// 根据用户名生成渐变默认头像
const defaultAvatar = computed(() =>
  article.value?.author ? generateAvatar(article.value.author) : generateAvatar('?'),
)
const authorAvatar = computed(() => article.value?.authorAvatar || defaultAvatar.value)

const keywordsList = computed(() => {
  const k = article.value?.keywords
  if (!k) return []
  return k.split(/[,,;;\s]+/).filter(Boolean).slice(0, 8)
})

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

// ============== 目录 TOC ==============
interface TocItem { id: string; text: string; level: number }
const toc = ref<TocItem[]>([])
const activeId = ref<string>('')
const mobileTocOpen = ref(false)

/** 超过该数量折叠 */
const TOC_LIMIT = 20
const tocExpanded = ref(false)
const tocVisible = computed(() =>
  tocExpanded.value || toc.value.length <= TOC_LIMIT ? toc.value : toc.value.slice(0, TOC_LIMIT),
)
const tocHiddenCount = computed(() => Math.max(0, toc.value.length - TOC_LIMIT))

/** 已读章节 id 集合（用于进度联动） */
const passedIds = ref<Set<string>>(new Set())

function slugify(text: string) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    // 去除 emoji 等非 BMP 字符（BMP 之外统一替换为 -）
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

/**
 * 后备方案：把 <p>1、xxx</p> 或 <li>1. xxx</li> 这种分点识别为 h2
 * 应对 tinymce 编辑器里没用标题样式但用数字分点的情况
 * 严格过滤避免误识别（嵌套 list、链表中点号、emoji 编号等）
 */
function fallbackToc(root: HTMLElement): TocItem[] {
  const items: TocItem[] = []
  const used = new Set<string>()
  const candidates = root.querySelectorAll<HTMLElement>('p, li, strong, b')
  // 必须以 "1、" / "1." / "1．" / "1)" 开头（中文顿号或英文点号）
  // 数字部分 1-3 位（避免 1.2.3 子编号被误识别）
  const re = /^(\d{1,3})[\s\u3000]*[、.．)][\s\u3000]*(.{1,40}?)$/
  candidates.forEach((el) => {
    // 跳过嵌套：pre/code/a/blockquote 内；已有 h 标签的祖先；嵌套 list item
    if (el.closest('pre, code, a, blockquote, h1, h2, h3, h4')) return
    // 跳过 li 嵌套（ol > ol > li）
    if (el.tagName === 'LI' && el.parentElement?.tagName === 'LI') return
    if (el.tagName === 'STRONG' || el.tagName === 'B') {
      // strong/b 内识别为标题的前提是父级是 p 或 li
      const parent = el.parentElement
      if (!parent || !/^(P|LI)$/.test(parent.tagName)) return
    }
    const text = (el.textContent || '').trim()
    if (!text) return
    // 文本总长度限制（避免长段落误识别）
    if (text.length > 60) return
    // 标题部分不能以标点结尾（避免 "1、..." 后面还有内容）
    const m = text.match(re)
    if (!m) return
    const num = m[1]
    const title = m[2].trim()
    if (!title) return
    // title 不能含问号/冒号/顿号（避免 "1、说明：xxx" 这种带冒号的描述被识别）
    if (/[：:?!？。,\s][^、.．)\d]{0,}$/.test(title) && title.length > 30) return
    let id = slugify(`${num}-${title}`)
    if (!id) id = `item-${items.length + 1}`
    let unique = id
    let i = 2
    while (used.has(unique)) unique = `${id}-${i++}`
    used.add(unique)
    el.id = unique
    items.push({ id: unique, text: `${num}、${title}`, level: 2 })
  })
  return items
}

function buildToc() {
  const root = contentRef.value
  if (!root) return
  const headings = root.querySelectorAll<HTMLElement>('h1, h2, h3, h4')
  const items: TocItem[] = []
  const used = new Set<string>()

  headings.forEach((el) => {
    const text = (el.textContent || '').trim()
    if (!text) return
    let id = slugify(text)
    if (!id) id = 'heading'
    let unique = id
    let i = 2
    while (used.has(unique)) unique = `${id}-${i++}`
    used.add(unique)
    el.id = unique
    if (!el.querySelector('.heading-anchor')) {
      const a = document.createElement('a')
      a.className = 'heading-anchor'
      a.href = `#${unique}`
      a.setAttribute('aria-label', 'anchor')
      a.innerHTML = '#'
      el.appendChild(a)
    }
    items.push({ id: unique, text, level: Number(el.tagName.substring(1)) })
  })

  // 没有 h 标签时启用后备方案
  if (items.length === 0) {
    toc.value = fallbackToc(root)
  } else {
    toc.value = items
  }
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const offset = 80
  const y = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: y, behavior: 'smooth' })
  mobileTocOpen.value = false
  activeId.value = id
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ============== 代码块复制按钮 + 语法高亮 ==============
function detectLanguage(codeEl: HTMLElement | null, preEl: HTMLElement): string {
  const cls = codeEl?.className || ''
  const m = cls.match(/language-([\w-]+)/)
  let lang = m?.[1] || preEl.getAttribute('data-lang') || ''
  lang = lang.toLowerCase()
  if (LANG_ALIASES[lang]) lang = LANG_ALIASES[lang]
  return lang
}

function enhanceCodeBlocks() {
  const root = contentRef.value
  if (!root) return
  root.querySelectorAll<HTMLPreElement>('pre').forEach((pre) => {
    if (pre.dataset.enhanced) return
    pre.dataset.enhanced = '1'
    pre.classList.add('code-block')

    const codeEl = pre.querySelector('code')
    const rawCode = (codeEl?.textContent || pre.textContent || '').replace(/\n$/, '')

    let lang = detectLanguage(codeEl, pre)
    let highlighted = ''
    try {
      if (lang && hljs.getLanguage(lang)) {
        const r = hljs.highlight(rawCode, { language: lang, ignoreIllegals: true })
        highlighted = r.value
        lang = r.language || lang
      } else {
        const r = hljs.highlightAuto(rawCode)
        highlighted = r.value
        lang = r.language || 'text'
      }
    } catch {
      highlighted = escapeHtml(rawCode)
      lang = 'text'
    }

    // 重建 pre 内部结构：header + code.hljs
    pre.innerHTML = ''

    const header = document.createElement('div')
    header.className = 'code-block-header'
    const langLabel = document.createElement('span')
    langLabel.className = 'code-block-lang'
    langLabel.textContent = lang
    header.appendChild(langLabel)

    const copyBtn = document.createElement('button')
    copyBtn.className = 'code-block-copy'
    copyBtn.type = 'button'
    copyBtn.textContent = '复制'
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(rawCode)
        copyBtn.textContent = '已复制'
        copyBtn.classList.add('copied')
        setTimeout(() => {
          copyBtn.textContent = '复制'
          copyBtn.classList.remove('copied')
        }, 1500)
      } catch {
        copyBtn.textContent = '失败'
        setTimeout(() => (copyBtn.textContent = '复制'), 1500)
      }
    })
    header.appendChild(copyBtn)
    pre.appendChild(header)

    const code = document.createElement('code')
    code.className = `hljs language-${lang}`
    code.innerHTML = highlighted
    pre.appendChild(code)
  })
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ============== 阅读进度 + ScrollSpy ==============
const contentRef = ref<HTMLElement | null>(null)
const progress = ref(0)
let observer: IntersectionObserver | null = null

function onScroll() {
  const el = contentRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const total = rect.height - window.innerHeight + 200
  if (total <= 0) {
    progress.value = rect.bottom < window.innerHeight ? 100 : 0
    return
  }
  const scrolled = -rect.top + 200
  progress.value = Math.max(0, Math.min(100, (scrolled / total) * 100))
}

function setupScrollSpy() {
  if (!('IntersectionObserver' in window) || !contentRef.value) return
  observer?.disconnect()
  passedIds.value = new Set()
  const headings = contentRef.value.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]')
  observer = new IntersectionObserver(
    (entries) => {
      // 选最靠近顶部且可见的标题
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) {
        activeId.value = visible[0].target.id
      }
      // 进度联动：已滚过 viewport 顶部以上的 heading 视为"已读"
      entries.forEach((e) => {
        const id = (e.target as HTMLElement).id
        if (!id) return
        if (e.boundingClientRect.top < 100) {
          passedIds.value.add(id)
        }
      })
    },
    { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] },
  )
  headings.forEach((h) => observer!.observe(h))
}

// ============== 字数 / 阅读时长 ==============
const wordCount = computed(() => {
  const html = article.value?.content || ''
  // 简单去标签
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  // 中文按字，英文按词
  const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (text.match(/[A-Za-z]+/g) || []).length
  return cn + en
})
const readingMinutes = computed(() => Math.max(1, Math.round(wordCount.value / 300)))

// ============== 生命周期 ==============
onMounted(async () => {
  await nextTick()
  buildToc()
  enhanceCodeBlocks()
  setupScrollSpy()
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  observer?.disconnect()
})

// 文章切换时重新构建
watch(id, async () => {
  await nextTick()
  buildToc()
  enhanceCodeBlocks()
  setupScrollSpy()
})

useHead({
  title: () => (article.value ? `${article.value.title} - ch-wiki` : '文章 - ch-wiki'),
  meta: [
    { name: 'description', content: () => article.value?.description || '' },
    { name: 'keywords', content: () => article.value?.keywords || '' },
  ],
})
</script>

<style scoped>
.article-page {
  position: relative;
  background: var(--color-bg-white);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

/* ============ 顶部进度条 ============ */
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), #67c23a);
  z-index: 1000;
  transition: width 0.1s linear;
  box-shadow: 0 1px 3px rgba(64, 158, 255, 0.4);
}

/* ============ 头图 ============ */
.article-cover {
  width: 100%;
  max-height: 360px;
  overflow: hidden;
  background: var(--color-bg);
}
.article-cover img {
  width: 100%;
  height: 100%;
  max-height: 360px;
  object-fit: cover;
  display: block;
}

/* ============ 头部标题区 ============ */
.article-header {
  background: var(--color-bg-white);
  padding: 40px 0 24px;
  border-bottom: 1px solid var(--color-border);
}
.article-header-inner {
  max-width: 820px;
  margin: 0 auto;
  padding: 0 24px;
}
.article-category {
  display: inline-block;
  font-size: 12px;
  color: var(--color-primary);
  background: rgba(64, 158, 255, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
  margin-bottom: 16px;
  text-decoration: none;
  transition: background 0.2s;
}
.article-category:hover {
  background: rgba(64, 158, 255, 0.2);
  color: var(--color-primary-dark);
}
.article-title {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 12px;
  color: var(--color-text);
  letter-spacing: -0.5px;
}
.article-desc {
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}
.article-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}
.meta-author { display: flex; align-items: center; gap: 12px; }
.meta-author-info { display: flex; flex-direction: column; }
.meta-author-name { font-size: 14px; font-weight: 600; color: var(--color-text); }
.meta-author-remark { font-size: 12px; color: var(--color-text-placeholder); margin-top: 2px; }
.meta-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}
.meta-stats span { display: inline-flex; align-items: center; gap: 4px; }
.meta-stats .el-icon { font-size: 14px; opacity: 0.7; }
.meta-reading { color: var(--color-primary); font-weight: 500; }

.article-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}
.keyword-tag { font-size: 12px; }

/* ============ 移动端目录按钮 ============ */
.toc-mobile-toggle {
  display: none;
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 90;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 10px 18px;
  font-size: 14px;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
  cursor: pointer;
  align-items: center;
  gap: 6px;
}
.toc-mobile-toggle.active { background: var(--color-primary-dark); }

/* ============ 主体三栏布局 ============ */
.article-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 280px;
  gap: 32px;
  max-width: 1320px;
  margin: 0 auto;
  padding: 32px 24px 48px;
  align-items: start;
}

/* 左：目录 */
.toc-sidebar {
  position: sticky;
  top: 24px;
  align-self: start;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  scrollbar-width: thin;
}
.toc-sticky {
  padding: 4px 0 24px;
}
.toc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 12px 12px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 12px;
}
.toc-title .el-icon { color: var(--color-primary); }
.toc-list { list-style: none; padding: 0; margin: 0; }
.toc-item {
  position: relative;
  margin: 2px 0;
}
.toc-item a {
  position: relative;
  display: flex;
  align-items: center;
  padding: 6px 12px 6px 16px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 13px;
  line-height: 1.6;
  border-radius: 0 4px 4px 0;
  transition: all 0.2s;
  word-break: break-word;
}
.toc-item a:hover {
  color: var(--color-primary);
  background: rgba(64, 158, 255, 0.06);
}
.toc-item .toc-progress {
  position: absolute;
  left: 0;
  top: 0;
  width: 2px;
  height: 0;
  background: linear-gradient(180deg, var(--color-primary), #67c23a);
  border-radius: 1px;
  transition: height 0.3s ease;
}
.toc-item.passed .toc-progress { height: 50%; opacity: 0.6; }
.toc-item.active .toc-progress { height: 100%; opacity: 1; }
.toc-item.active a {
  color: var(--color-primary);
  font-weight: 600;
  background: rgba(64, 158, 255, 0.08);
}
.toc-text { flex: 1; min-width: 0; }

/* TOC 展开/收起按钮 */
.toc-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  margin-top: 8px;
  padding: 6px 0;
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  color: var(--color-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.toc-toggle:hover {
  background: rgba(64, 158, 255, 0.06);
  border-color: var(--color-primary-light);
}
.toc-level-3 a { padding-left: 28px; font-size: 12.5px; }
.toc-level-4 a { padding-left: 40px; font-size: 12px; color: var(--color-text-placeholder); }

/* 目录为空时的占位 */
.toc-empty {
  padding: 20px 12px 24px;
  text-align: center;
  color: var(--color-text-placeholder);
}
.toc-empty .el-icon {
  font-size: 28px;
  margin-bottom: 8px;
  opacity: 0.4;
}
.toc-empty p { margin: 4px 0; font-size: 13px; }
.toc-empty-tip { font-size: 11px; opacity: 0.7; }

/* 中：正文 */
.article-body {
  min-width: 0;
  max-width: 820px;
  width: 100%;
  margin: 0 auto;
}

/* 右：作者 + 元信息 */
.author-sidebar {
  position: sticky;
  top: 24px;
  align-self: start;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  scrollbar-width: thin;
}
.author-sticky { padding-bottom: 24px; }

/* 作者卡（始终显示：头像 + 名字 + 简介） */
.author-card {
  background: var(--color-bg);
  border-radius: 8px;
  padding: 24px 20px;
  text-align: center;
  margin-bottom: 16px;
}
.author-card .el-avatar { margin-bottom: 12px; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.author-name { font-size: 16px; font-weight: 600; color: var(--color-text); margin-bottom: 6px; }
.author-remark { font-size: 12px; color: var(--color-text-secondary); line-height: 1.6; }

.info-card {
  background: var(--color-bg);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}
.info-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}
.info-list { list-style: none; padding: 0; margin: 0; }
.info-list li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--color-border);
}
.info-list li:last-child { border-bottom: none; }
.info-label { color: var(--color-text-placeholder); }
.info-value { color: var(--color-text); font-weight: 500; }

.back-top {
  display: flex;
  align-items: center;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--color-border);
}
.info-list li:last-child { border-bottom: none; }
.info-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-placeholder);
}
.info-label .el-icon { font-size: 14px; opacity: 0.7; }
.back-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.back-top:hover { color: var(--color-primary); border-color: var(--color-primary); }

/* 全局返回顶部 — 始终可见但半透明，滚动后高亮 */
.back-top-global {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 95;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-white);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  font-size: 20px;
  opacity: 0.4;
  transform: translateY(8px);
  transition: opacity 0.25s, transform 0.25s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.back-top-global:hover {
  opacity: 1;
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.25);
  transform: translateY(0);
}
.back-top-global.visible {
  opacity: 0.95;
  transform: translateY(0);
}

/* ============ 正文 prose 美化（halo 风格） ============ */
.article-content {
  font-size: 16px;
  line-height: 1.9;
  color: #2c3e50;
  word-wrap: break-word;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
}

/* 标题 */
.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3),
.article-content :deep(h4),
.article-content :deep(h5),
.article-content :deep(h6) {
  position: relative;
  font-weight: 700;
  line-height: 1.4;
  color: #1f2329;
  margin: 1.8em 0 0.8em;
  scroll-margin-top: 80px;
}
.article-content :deep(h1) { font-size: 1.8em; padding-bottom: 0.3em; border-bottom: 1px solid #e5e7eb; }
.article-content :deep(h2) { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #e5e7eb; }
.article-content :deep(h3) { font-size: 1.25em; }
.article-content :deep(h4) { font-size: 1.1em; }
.article-content :deep(h5),
.article-content :deep(h6) { font-size: 1em; }

/* 标题 hover 锚点 */
.article-content :deep(.heading-anchor) {
  position: absolute;
  left: -1.2em;
  top: 50%;
  transform: translateY(-50%);
  padding-right: 4px;
  color: var(--color-primary);
  font-weight: 400;
  opacity: 0;
  text-decoration: none;
  transition: opacity 0.2s;
}
.article-content :deep(h1:hover) .heading-anchor,
.article-content :deep(h2:hover) .heading-anchor,
.article-content :deep(h3:hover) .heading-anchor,
.article-content :deep(h4:hover) .heading-anchor,
.article-content :deep(h5:hover) .heading-anchor,
.article-content :deep(h6:hover) .heading-anchor { opacity: 1; }

.article-content :deep(p) {
  margin: 0 0 1em;
  word-break: break-word;
  color: #374151;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0 0 1em;
}
.article-content :deep(li) {
  margin-bottom: 0.4em;
  line-height: 1.9;
  color: #374151;
}
.article-content :deep(li > p) { margin-bottom: 0.4em; }
.article-content :deep(li::marker) { color: var(--color-primary); }

.article-content :deep(strong) { font-weight: 600; color: #1f2329; }
.article-content :deep(em) { font-style: italic; color: #1f2329; }

/* 引用 */
.article-content :deep(blockquote) {
  margin: 1.5em 0;
  padding: 14px 20px;
  background: #f6f8fa;
  border-left: 4px solid var(--color-primary);
  border-radius: 0 6px 6px 0;
  color: #4b5563;
}
.article-content :deep(blockquote p) { margin-bottom: 0.5em; }
.article-content :deep(blockquote p:last-child) { margin-bottom: 0; }

/* 行内代码 */
.article-content :deep(code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.88em;
  padding: 2px 6px;
  background: rgba(64, 158, 255, 0.1);
  color: #d63384;
  border-radius: 4px;
  word-break: break-word;
}

/* 代码块 */
.article-content :deep(.code-block) {
  position: relative;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 8px;
  overflow: hidden;
  margin: 1.5em 0;
  font-size: 14px;
  line-height: 1.7;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.article-content :deep(.code-block) > code,
.article-content :deep(.code-block) > pre {
  display: block;
  background: transparent;
  color: inherit;
  padding: 14px 18px;
  margin: 0;
  overflow-x: auto;
  font-size: inherit;
  border-radius: 0;
}
.article-content :deep(.code-block-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: #2d2d2d;
  border-bottom: 1px solid #1e1e1e;
  color: #9ca3af;
  font-size: 12px;
}
.article-content :deep(.code-block-lang) { text-transform: uppercase; font-weight: 500; letter-spacing: 0.5px; }
.article-content :deep(.code-block-copy) {
  background: transparent;
  border: 1px solid #4b5563;
  color: #9ca3af;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.article-content :deep(.code-block-copy:hover) { color: #fff; border-color: #6b7280; }
.article-content :deep(.code-block-copy.copied) { color: #67c23a; border-color: #67c23a; }

/* 兼容老的 pre 写法（没被 enhanceCodeBlocks 处理过的） */
.article-content :deep(pre) {
  position: relative;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px 20px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 14px;
  line-height: 1.7;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.article-content :deep(pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
  font-size: inherit;
  border-radius: 0;
}

/* 链接 */
.article-content :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}
.article-content :deep(a:hover) {
  color: var(--color-primary-dark);
  border-bottom-color: var(--color-primary);
}

/* 图片 */
.article-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 1.5em 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: block;
}

/* 表格 */
.article-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-size: 14px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 0 0 1px #e5e7eb;
}
.article-content :deep(th),
.article-content :deep(td) {
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  text-align: left;
}
.article-content :deep(th) { background: #f6f8fa; font-weight: 600; color: #1f2329; }
.article-content :deep(tr:nth-child(even) td) { background: #fafbfc; }

.article-content :deep(hr) {
  border: 0;
  height: 1px;
  background: #e5e7eb;
  margin: 2em 0;
}

/* ============ 文末标签 ============ */
.article-footer-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}
.footer-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-right: 4px;
}

/* ============ 推荐文章 ============ */
.recommend-section {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1f2329;
}
.section-title .el-icon { color: var(--color-primary); }
.recommend-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.recommend-card {
  display: flex;
  flex-direction: column;
  background: #f6f8fa;
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid transparent;
}
.recommend-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--color-primary-light);
}
.recommend-cover { width: 100%; height: 120px; overflow: hidden; background: #e4e7ed; }
.recommend-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.recommend-card:hover .recommend-cover img { transform: scale(1.05); }
.recommend-body { padding: 12px 14px; }
.recommend-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 4px;
  color: #1f2329;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.recommend-desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.recommend-meta {
  font-size: 12px;
  color: #9ca3af;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.recommend-cat { color: var(--color-primary); font-weight: 500; }

/* ============ highlight.js 主题（atom-one-dark 风格，匹配深色代码块） ============ */
.article-content :deep(.hljs) { display: block; overflow-x: auto; color: #abb2bf; }
.article-content :deep(.hljs-comment),
.article-content :deep(.hljs-quote) { color: #5c6370; font-style: italic; }
.article-content :deep(.hljs-doctag),
.article-content :deep(.hljs-keyword),
.article-content :deep(.hljs-formula) { color: #c678dd; }
.article-content :deep(.hljs-section),
.article-content :deep(.hljs-name),
.article-content :deep(.hljs-selector-tag),
.article-content :deep(.hljs-deletion),
.article-content :deep(.hljs-subst) { color: #e06c75; }
.article-content :deep(.hljs-literal) { color: #56b6c2; }
.article-content :deep(.hljs-string),
.article-content :deep(.hljs-regexp),
.article-content :deep(.hljs-addition),
.article-content :deep(.hljs-attribute),
.article-content :deep(.hljs-meta .hljs-string) { color: #98c379; }
.article-content :deep(.hljs-attr),
.article-content :deep(.hljs-variable),
.article-content :deep(.hljs-template-variable),
.article-content :deep(.hljs-type),
.article-content :deep(.hljs-selector-class),
.article-content :deep(.hljs-selector-attr),
.article-content :deep(.hljs-selector-pseudo) { color: #d19a66; }
.article-content :deep(.hljs-symbol),
.article-content :deep(.hljs-bullet),
.article-content :deep(.hljs-link),
.article-content :deep(.hljs-meta),
.article-content :deep(.hljs-selector-id),
.article-content :deep(.hljs-title) { color: #61aeee; }
.article-content :deep(.hljs-built_in),
.article-content :deep(.hljs-title),
.article-content :deep(.hljs-emphasis) { color: #61aeee; font-style: italic; }
.article-content :deep(.hljs-strong) { font-weight: 700; }
.article-content :deep(.hljs-link) { text-decoration: underline; }
.article-content :deep(.hljs-number),
.article-content :deep(.hljs-params) { color: #d19a66; }
.article-content :deep(.hljs-tag) { color: #e06c75; }
.article-content :deep(.hljs-attribute) { color: #d19a66; }
.article-content :deep(.hljs-emphasis) { font-style: italic; }

/* ============ 响应式 ============ */
@media (max-width: 1180px) {
  .article-layout { grid-template-columns: minmax(0, 1fr) 240px; gap: 24px; padding: 24px 20px 40px; }
  .toc-sidebar { display: none; }
  .toc-sidebar.open {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    max-height: 100vh;
    padding: 24px;
  }
  .toc-sidebar.open .toc-sticky {
    background: var(--color-bg-white);
    border-radius: 8px;
    padding: 20px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
  }
  .toc-mobile-toggle { display: inline-flex; }
}
@media (max-width: 768px) {
  .article-layout { grid-template-columns: 1fr; padding: 16px 12px 32px; }
  .author-sidebar { display: none; }
  .article-title { font-size: 24px; }
  .article-cover { max-height: 220px; }
  .article-cover img { max-height: 220px; }
  .article-meta { flex-direction: column; align-items: flex-start; }
  .meta-stats { gap: 12px; }
  .recommend-grid { grid-template-columns: 1fr; }
  .article-header-inner { padding: 0 16px; }
}
</style>
