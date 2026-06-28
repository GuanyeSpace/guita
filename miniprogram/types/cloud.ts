export interface CloudFunctionResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface CallFunctionParams {
  name: string
  action: string
  payload?: Record<string, unknown>
}

export interface PaginationParams {
  page: number
  page_size: number
}

export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export type LoginStatus = 'need_phone' | 'need_host' | 'ready' | 'inactive' | 'banned'

export interface LoginData {
  user: Record<string, unknown>
  status: LoginStatus
}

export interface BindPhoneData {
  user: Record<string, unknown>
  status: 'need_host'
}

export interface HostListData {
  list: Record<string, unknown>[]
}

export interface HostBindData {
  host: Record<string, unknown>
  binding: Record<string, unknown>
}

export interface GetMyHostData {
  host: Record<string, unknown>
  binding: Record<string, unknown>
}

export interface ContentListData {
  list: Record<string, unknown>[]
  page: number
  page_size: number
  total: number
}

export interface ContentDetailData {
  detail: Record<string, unknown>
}

export interface ContentRecordParams {
  content_id: string
  record_type: 'view' | 'play' | 'progress' | 'complete' | 'preview'
  progress_sec?: number
  completed?: boolean
}
