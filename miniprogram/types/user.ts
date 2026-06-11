export interface User {
  _id: string
  guita_id: string
  openid: string
  unionid: string
  phone: string
  nickname: string
  avatar_url: string
  status: UserStatus
  created_at: string
  updated_at: string
}

export type UserStatus = 'need_phone' | 'need_host' | 'ready' | 'inactive' | 'banned'
