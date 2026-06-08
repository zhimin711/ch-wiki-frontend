import type { ApiResult } from './api-client'
import { extractData, useApiClient } from './api-client'
import { sm2Encrypt } from './sm2-crypto'

export interface LoginTokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  username: string
  nickname: string
}

export interface PasswordLoginRequest {
  account: string
  password: string
}

/** 加密配置 (后端 /api/security/key 返回) */
export interface EncryptionConfig {
  apiKey: string
  publicKey: string
}

export const HEADER_API_KEY = 'API_KEY'

let cachedConfig: EncryptionConfig | null = null

/**
 * 获取后端 SM2 加密公钥和 apiKey，结果缓存到内存。
 */
export async function loadEncryptionConfig(): Promise<EncryptionConfig> {
  if (cachedConfig) return cachedConfig
  const client = useApiClient()
  const { data: resp } = await client.get<ApiResult<EncryptionConfig>>('/api/security/key')
  const config = extractData(resp)
  if (!config?.apiKey || !config?.publicKey) {
    throw new Error('加密配置不可用，请稍后重试')
  }
  cachedConfig = config
  return config
}

export function useAuthApi() {
  const client = useApiClient()

  return {
    /** 账号密码登录（自动 SM2 加密密码） */
    async passwordLogin(request: PasswordLoginRequest) {
      const config = await loadEncryptionConfig()
      const encryptedPassword = sm2Encrypt(request.password, config.publicKey)

      const { data: resp } = await client.post<ApiResult<LoginTokenResponse>>(
        '/api/session/login',
        { account: request.account, password: encryptedPassword },
        { headers: { [HEADER_API_KEY]: config.apiKey } },
      )
      return extractData(resp)
    },

    /** OAuth2 一次性 code 换 JWT */
    async exchangeCodeToken(code: string) {
      const { data: resp } = await client.get<ApiResult<LoginTokenResponse>>('/api/auth/code/token', { params: { code } })
      return extractData(resp)
    },

    /** 获取 OAuth2 回调 URL */
    async getOAuth2CallbackUrl() {
      const { data: resp } = await client.get<ApiResult<string>>('/api/auth/oauth2/callback-url')
      return extractData(resp)
    },
  }
}
