import type { ApiResult } from './api-client'
import { extractData, useApiClient } from './api-client'
import { HEADER_API_KEY, loadEncryptionConfig } from './auth-api'
import { sm2Encrypt } from './sm2-crypto'

export interface UserProfile {
  id: number
  username: string
  nickname: string | null
  realName: string | null
  avatar: string | null
  sex: number | null
  email: string | null
  mobile: string | null
  type: string | null
  level: number | null
  integral: number | null
  hasPassword: boolean
  remark: string | null
}

export interface UserProfileUpdateRequest {
  nickname?: string
  realName?: string
  sex?: number | null
  email?: string
  mobile?: string
  remark?: string
}

export interface PasswordStatus {
  hasPassword: boolean
}

export interface PasswordUpdateRequest {
  origPassword?: string
  newPassword: string
}

export interface UploadFileInfo {
  name?: string
  url?: string
  href?: string
  path?: string
  src?: string
}

export function uploadedAvatarUrl(fileInfo: UploadFileInfo | null): string {
  if (!fileInfo) return ''
  return fileInfo.url || fileInfo.href || fileInfo.path || fileInfo.src || fileInfo.name || ''
}

export function useUserApi() {
  const client = useApiClient()

  return {
    async getProfile() {
      const { data: resp } = await client.get<ApiResult<UserProfile>>('/api/user/profile')
      return extractData(resp)
    },

    async updateProfile(request: UserProfileUpdateRequest) {
      const { data: resp } = await client.put<ApiResult<UserProfile>>('/api/user/profile', request)
      return extractData(resp)
    },

    async getPasswordStatus() {
      const { data: resp } = await client.get<ApiResult<PasswordStatus>>('/api/user/password/status')
      return extractData(resp)
    },

    async updatePassword(request: PasswordUpdateRequest) {
      const config = await loadEncryptionConfig()
      const encrypted = {
        newPassword: sm2Encrypt(request.newPassword, config.publicKey),
        ...(request.origPassword ? { origPassword: sm2Encrypt(request.origPassword, config.publicKey) } : {}),
      }
      const { data: resp } = await client.put<ApiResult<boolean>>('/api/user/password', encrypted, {
        headers: { [HEADER_API_KEY]: config.apiKey },
      })
      return extractData(resp)
    },

    async uploadAvatar(file: File) {
      const form = new FormData()
      form.append('file', file)
      const { data: resp } = await client.post<ApiResult<UploadFileInfo>>('/upload/image/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return extractData(resp)
    },

    async updateAvatar(avatar: string) {
      const { data: resp } = await client.put<ApiResult<UserProfile>>('/api/user/avatar', { avatar })
      return extractData(resp)
    },
  }
}
