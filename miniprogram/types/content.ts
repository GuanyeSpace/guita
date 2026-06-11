export type ContentType = 'replay' | 'recipe'

export type ContentCategory = 'daily' | 'special' | 'basics'

export interface ContentItem {
  _id: string
  host_id: string
  host_slug: string
  content_type: ContentType
  content_category: ContentCategory
  title: string
  description: string
  cover_file_id: string
  asset_file_id: string
  asset_url: string
  duration_sec: number
  tags: string[]
  status: ContentStatus
  sort_order: number
  published_at: string
  created_at: string
  updated_at: string
}

export type ContentStatus = 'published' | 'draft' | 'archived'
