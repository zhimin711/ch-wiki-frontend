// 公开阅读页（书籍章节、文章详情）通用阅读设置
// 提供：背景、字号、字体、行高、页宽 5 档
// 用 CSS 变量驱动:组件只读 --reader-* 即可,无需关心档位
// 状态:useState 跨组件共享,localStorage 持久化(SSR 安全)

export type ReaderBackground = 'white' | 'green' | 'yellow' | 'sepia' | 'dark'
export type ReaderFontSize = 'sm' | 'md' | 'lg' | 'xl'
export type ReaderFontFamily = 'sans' | 'serif' | 'kai' | 'mono'
export type ReaderLineHeight = 'tight' | 'normal' | 'loose'
export type ReaderWidth = 'narrow' | 'medium' | 'wide'

export interface ReaderSettings {
  background: ReaderBackground
  fontSize: ReaderFontSize
  fontFamily: ReaderFontFamily
  lineHeight: ReaderLineHeight
  width: ReaderWidth
}

export const READER_SETTINGS_DEFAULTS: ReaderSettings = {
  background: 'white',
  fontSize: 'md',
  fontFamily: 'sans',
  lineHeight: 'normal',
  width: 'medium',
}

const STORAGE_KEY = 'ch-wiki-reader-settings'

// 档位 -> CSS 变量值
const BG_COLOR: Record<ReaderBackground, string> = {
  white: '#ffffff',
  green: '#cce8cf',   // 护眼绿
  yellow: '#f6efe1',  // 护眼黄
  sepia: '#f4ecd8',   // 米黄
  dark: '#1f2125',    // 夜间
}

const BG_TEXT_COLOR: Record<ReaderBackground, string> = {
  white: '#2c3e50',
  green: '#2a3a2c',
  yellow: '#5a4a32',
  sepia: '#3a2e1a',
  dark: '#cfd2d6',
}

const FONT_SIZE_PX: Record<ReaderFontSize, number> = {
  sm: 15,
  md: 17,
  lg: 19,
  xl: 21,
}

const FONT_FAMILY: Record<ReaderFontFamily, string> = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  serif: '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", SimSun, serif',
  kai: '"Kaiti SC", STKaiti, KaiTi, serif',
  mono: '"SF Mono", Consolas, Menlo, monospace',
}

const LINE_HEIGHT: Record<ReaderLineHeight, number> = {
  tight: 1.7,
  normal: 2.0,
  loose: 2.3,
}

const WIDTH_PX: Record<ReaderWidth, number> = {
  narrow: 640,
  medium: 820,
  wide: 1024,
}

function isValidKey<T extends string>(value: unknown, dict: Record<T, unknown>): value is T {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(dict, value as T)
}

function loadFromStorage(): ReaderSettings {
  if (typeof window === 'undefined') return { ...READER_SETTINGS_DEFAULTS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...READER_SETTINGS_DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>
    const result: ReaderSettings = { ...READER_SETTINGS_DEFAULTS }
    if (isValidKey(parsed.background, BG_COLOR)) result.background = parsed.background
    if (isValidKey(parsed.fontSize, FONT_SIZE_PX)) result.fontSize = parsed.fontSize
    if (isValidKey(parsed.fontFamily, FONT_FAMILY)) result.fontFamily = parsed.fontFamily
    if (isValidKey(parsed.lineHeight, LINE_HEIGHT)) result.lineHeight = parsed.lineHeight
    if (isValidKey(parsed.width, WIDTH_PX)) result.width = parsed.width
    return result
  } catch {
    return { ...READER_SETTINGS_DEFAULTS }
  }
}

function saveToStorage(settings: ReaderSettings) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* ignore quota / privacy mode errors */
  }
}

export function useReaderSettings() {
  // useState: 跨组件共享,SSR 安全
  const settings = useState<ReaderSettings>('reader-settings', () => ({ ...READER_SETTINGS_DEFAULTS }))

  // 客户端水合后从 localStorage 读一次
  if (import.meta.client && settings.value === READER_SETTINGS_DEFAULTS) {
    // 避免在初次 mount 前覆盖用户主动设置;只在默认值状态才读
    const loaded = loadFromStorage()
    if (JSON.stringify(loaded) !== JSON.stringify(settings.value)) {
      settings.value = loaded
    }
  }

  function update<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) {
    settings.value = { ...settings.value, [key]: value }
    if (import.meta.client) saveToStorage(settings.value)
  }

  function reset() {
    settings.value = { ...READER_SETTINGS_DEFAULTS }
    if (import.meta.client) saveToStorage(settings.value)
  }

  // 计算属性:把当前设置转成 CSS 变量值,组件用 :style 绑定即可
  const styleVars = computed<Record<string, string>>(() => ({
    '--reader-bg': BG_COLOR[settings.value.background],
    '--reader-text': BG_TEXT_COLOR[settings.value.background],
    '--reader-font-size': `${FONT_SIZE_PX[settings.value.fontSize]}px`,
    '--reader-font-family': FONT_FAMILY[settings.value.fontFamily],
    '--reader-line-height': String(LINE_HEIGHT[settings.value.lineHeight]),
    '--reader-width': `${WIDTH_PX[settings.value.width]}px`,
  }))

  // 暴露档位选项,给设置面板用
  const options = {
    background: [
      { value: 'white', label: '默认', preview: '#ffffff' },
      { value: 'green', label: '护眼绿', preview: '#cce8cf' },
      { value: 'yellow', label: '护眼黄', preview: '#f6efe1' },
      { value: 'sepia', label: '米黄', preview: '#f4ecd8' },
      { value: 'dark', label: '夜间', preview: '#1f2125' },
    ] as const,
    fontSize: [
      { value: 'sm', label: '小' },
      { value: 'md', label: '中' },
      { value: 'lg', label: '大' },
      { value: 'xl', label: '特大' },
    ] as const,
    fontFamily: [
      { value: 'sans', label: '默认' },
      { value: 'serif', label: '宋体' },
      { value: 'kai', label: '楷体' },
      { value: 'mono', label: '等宽' },
    ] as const,
    lineHeight: [
      { value: 'tight', label: '紧凑' },
      { value: 'normal', label: '默认' },
      { value: 'loose', label: '宽松' },
    ] as const,
    width: [
      { value: 'narrow', label: '窄' },
      { value: 'medium', label: '中' },
      { value: 'wide', label: '宽' },
    ] as const,
  }

  return { settings, styleVars, update, reset, options }
}
