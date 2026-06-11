export interface User {
  _id: string
  guita_id: string
  openid: string
  unionid: string
  phone: string
  nickname: string
  avatar_url: string
  status: DbUserStatus
  created_at: string
  updated_at: string
}

export type DbUserStatus = 'active' | 'inactive' | 'deleted' | 'banned'
