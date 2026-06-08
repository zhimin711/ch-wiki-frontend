import { useApiClient } from './api-client'

export interface PersonalTokenItem {
  tokenId: string
  username?: string
  name: string
  description?: string
  tokenPrefix?: string
  tokenLastChars?: string
  scopes?: string[]
  status?: string
  expiredAt?: string
  lastUsedAt?: string
  createAt?: string
}

export interface PersonalTokenCreateRequest {
  name: string
  description?: string
  expiredAt?: string | null
  scopes: string[]
}

export interface PersonalTokenCreateResponse extends PersonalTokenItem {
  token: string
}

export const PERSONAL_TOKEN_SCOPE_OPTIONS = [
  { label: '读取个人信息', value: 'profile:read' },
  { label: '管理个人令牌', value: 'profile:write' },
  { label: '读取书籍', value: 'book:read' },
  { label: '管理书籍', value: 'book:write' },
  { label: '读取文章', value: 'article:read' },
  { label: '管理文章', value: 'article:write' },
  { label: '读取任务', value: 'task:read' },
  { label: '管理任务', value: 'task:write' },
  { label: '读取资源', value: 'resource:read' },
  { label: '管理资源', value: 'resource:write' },
  { label: '读取书签', value: 'bookmark:read' },
  { label: '管理书签', value: 'bookmark:write' },
]

function responseRows<T>(resp: any): T[] {
  if (Array.isArray(resp?.rows)) return resp.rows
  if (Array.isArray(resp?.data)) return resp.data
  if (Array.isArray(resp?.data?.rows)) return resp.data.rows
  if (resp?.rows) return [resp.rows]
  if (resp?.data) return [resp.data]
  return []
}

function responseData<T>(resp: any): T | null {
  const rows = responseRows<T>(resp)
  return rows[0] || null
}

export function personalTokenStatusLabel(status?: string) {
  if (status === '0') return '启用'
  if (status === '1') return '已撤销'
  if (status === '2') return '已过期'
  return '未知'
}

export function personalTokenStatusType(status?: string) {
  if (status === '0') return 'success'
  if (status === '1') return 'danger'
  if (status === '2') return 'warning'
  return 'info'
}

export function usePersonalTokenApi() {
  const client = useApiClient()

  return {
    async listPersonalTokens() {
      const { data: resp } = await client.get('/api/user/personal-tokens')
      return responseRows<PersonalTokenItem>(resp)
    },

    async createPersonalToken(request: PersonalTokenCreateRequest) {
      const { data: resp } = await client.post('/api/user/personal-tokens', request)
      return responseData<PersonalTokenCreateResponse>(resp)
    },

    async revokePersonalToken(tokenId: string) {
      const { data: resp } = await client.delete(`/api/user/personal-tokens/${encodeURIComponent(tokenId)}`)
      return !!(resp?.success ?? resp?.data)
    },
  }
}
