import { callFunction } from './request'
import type { CloudFunctionResponse } from '../types/cloud'

export async function cloudCall<T = unknown>(
  name: string,
  action: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const res: CloudFunctionResponse<T> = await callFunction<T>({ name, action, payload })
  return res.data
}
