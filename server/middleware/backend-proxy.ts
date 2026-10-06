import { createError, defineEventHandler, getRequestURL, proxyRequest } from 'h3'

const BACKEND_PATH_PREFIXES = [
  '/api',
  '/media',
  '/upload',
  '/resource',
  '/oauth2',
  '/login/oauth2',
]

function shouldProxy(pathname: string) {
  return BACKEND_PATH_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export default defineEventHandler((event) => {
  const requestUrl = getRequestURL(event)
  if (!shouldProxy(requestUrl.pathname)) return

  const config = useRuntimeConfig(event)
  const proxyTarget = String(config.apiProxyTarget || '').replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(proxyTarget)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_API_PROXY_TARGET is not configured correctly',
    })
  }

  return proxyRequest(event, `${proxyTarget}${requestUrl.pathname}${requestUrl.search}`)
})
