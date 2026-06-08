// 默认头像生成 composable
// 用用户名首字符 + hash 选色生成 SVG data URL，美化 el-avatar 缺省头像。
// 自动以 useAvatar() 形式导入。

const COLORS: string[] = [
  '#5b86e5', '#36d1dc', '#11998e', '#38ef7d',
  '#f857a6', '#ff6a00', '#f7b733', '#8e2de2',
  '#4a00e0', '#4286f4', '#00b4db', '#43cea2',
  '#ee0979', '#fc4a1a',
]

function hashCode(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function shade(hex: string, ratio: number): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * ratio)))
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const trimmed = name.trim()
  if (!trimmed) return '?'
  if (/[\u4e00-\u9fa5]/.test(trimmed)) {
    return trimmed[0]
  }
  const parts = trimmed.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return (parts[0]?.[0] || '?').toUpperCase()
}

export function generateAvatar(name: string | null | undefined, size = 80): string {
  const safeName = (name && name.trim()) || '?'
  const text = getInitials(safeName)
  const color = COLORS[hashCode(safeName) % COLORS.length]
  const darker = shade(color, 0.72)
  const fontSize = Math.round(size * 0.46)
  const gid = `g-${hashCode(safeName).toString(36)}`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs>
  <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${color}"/>
    <stop offset="100%" stop-color="${darker}"/>
  </linearGradient>
</defs>
<rect width="${size}" height="${size}" fill="url(#${gid})"/>
<ellipse cx="${size * 0.3}" cy="${size * 0.28}" rx="${size * 0.4}" ry="${size * 0.25}" fill="rgba(255,255,255,0.18)"/>
<text x="50%" y="52%" text-anchor="middle" dominant-baseline="central"
      font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif"
      font-size="${fontSize}" font-weight="700" fill="#ffffff">${escapeXml(text)}</text>
</svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function normalizeBackendUrl(url: string | null | undefined): string {
  if (!url) return ''
  const value = url.trim()
  if (!value) return ''
  if (/^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value)) return value
  if (value.startsWith('/')) return value
  return `/${value}`
}

export function resolveDisplayImage(url: string | null | undefined, fallbackName?: string | null, size = 80): string {
  const normalized = normalizeBackendUrl(url)
  return normalized || generateAvatar(fallbackName, size)
}

/** 组合式 API：默认根据用户名返回头像 URL */
export function useAvatar(name: string | null | undefined) {
  return computed(() => generateAvatar(name))
}

export function useAvatarUrl(url: string | null | undefined, name?: string | null, size = 80) {
  return computed(() => resolveDisplayImage(url, name, size))
}
