export interface Host {
  _id: string
  slug: string
  name: string
  display_name: string
  avatar_file_id: string
  description: string
  target_user: string
  brand_color_primary: string
  brand_color_accent: string
  sort_order: number
  status: HostStatus
  created_at: string
  updated_at: string
}

export type HostStatus = 'active' | 'inactive'
