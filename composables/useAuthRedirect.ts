const SENSITIVE_REDIRECT_PARAMS = [
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'jwt',
  'code',
]

const OAUTH_REDIRECT_STORAGE_KEY = 'auth_oauth2_redirect'

function firstString(value: unknown): string | null {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null
  return typeof value === 'string' ? value : null
}

export function normalizeAuthRedirect(value: unknown, fallback = '/'): string {
  const raw = firstString(value)?.trim()
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback

  try {
    const url = new URL(raw, 'http://chwiki.local')
    if (url.origin !== 'http://chwiki.local') return fallback
    if (url.pathname === '/login' || url.pathname === '/login/callback') return fallback

    for (const param of SENSITIVE_REDIRECT_PARAMS) {
      url.searchParams.delete(param)
    }

    const search = url.searchParams.toString()
    return `${url.pathname}${search ? `?${search}` : ''}`
  } catch {
    return fallback
  }
}

export function buildLoginRedirectPath(value: unknown): string {
  const redirect = normalizeAuthRedirect(value, '/')
  return `/login?redirect=${encodeURIComponent(redirect)}`
}

export function rememberOAuthRedirect(value: unknown) {
  if (!import.meta.client) return
  const redirect = normalizeAuthRedirect(value, '/')
  sessionStorage.setItem(OAUTH_REDIRECT_STORAGE_KEY, redirect)
}

export function consumeOAuthRedirect(fallback = '/'): string {
  if (!import.meta.client) return fallback
  const stored = sessionStorage.getItem(OAUTH_REDIRECT_STORAGE_KEY)
  sessionStorage.removeItem(OAUTH_REDIRECT_STORAGE_KEY)
  return normalizeAuthRedirect(stored, fallback)
}
