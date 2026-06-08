// 文章内容渲染：自动判断 HTML 或 Markdown
// 现在后端返回 tinymce HTML，未来切到 markdown 时只需后端在 PublicArticleDetailDTO
// 加 contentType 字段（'html' | 'markdown'），前端会自动用对应渲染器。

import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'


let _md: MarkdownIt | null = null

function getMd(): MarkdownIt {
  if (_md) return _md
  _md = new MarkdownIt({
    html: true,        // 允许 markdown 内嵌 HTML
    linkify: true,     // 自动识别 URL
    typographer: true, // 智能排版
    breaks: false,
  })
  // 自动给标题加 id（这样 buildToc() 可以无缝工作）
  _md.use(anchor, {
    permalink: false,
    slugify: (s: string) =>
      s
        .toString()
        .trim()
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/[\s\u3000]+/g, '-')
        .replace(/[^\w\u4e00-\u9fa5-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
  })
  return _md
}

/** 启发式判断是否为 HTML */
function looksLikeHtml(s: string): boolean {
  const t = s.trim()
  if (!t.startsWith('<')) return false
  // 出现常见块级标签就视为 HTML
  return /<(h[1-6]|p|div|ul|ol|li|pre|blockquote|img|table|code|strong|em|br|hr|section|article)[\s>]/i.test(t)
}

export type ContentType = 'html' | 'markdown'

export function useArticleContent() {
  /**
   * 渲染文章正文为 HTML
   * @param content 原始内容
   * @param contentType 可选，'html' | 'markdown'；不传则自动判断
   */
  function render(content: string, contentType?: ContentType): string {
    if (!content) return ''
    if (contentType === 'markdown') return getMd().render(content)
    if (contentType === 'html') return content
    // 启发式
    return looksLikeHtml(content) ? content : getMd().render(content)
  }

  return { render }
}
