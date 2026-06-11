import type { CloudFunctionResponse, CallFunctionParams } from '../types/cloud'

export function callFunction<T = unknown>(params: CallFunctionParams): Promise<CloudFunctionResponse<T>> {
  const { name, action, payload = {} } = params
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data: { action, payload },
      success: (res) => {
        const result = res.result as CloudFunctionResponse<T>
        if (result.code !== 0) {
          reject(new Error(result.message || '操作失败'))
          return
        }
        resolve(result)
      },
      fail: () => {
        reject(new Error('刚刚网络有点慢，再试一次好么？'))
      },
    })
  })
}
