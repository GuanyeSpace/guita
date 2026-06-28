/**
 * 记录用户内容行为（fire-and-forget，静默忽略错误）
 */
function recordContent(
  contentId: string,
  recordType: string,
  options?: {
    progressSec?: number
    completed?: boolean
  },
): void {
  try {
    wx.cloud
      .callFunction({
        name: 'content',
        data: {
          action: 'record',
          payload: {
            content_id: contentId,
            record_type: recordType,
            progress_sec: options?.progressSec ?? 0,
            completed: options?.completed ?? false,
          },
        },
      })
      .catch(() => {})
  } catch (_) {
    // silently ignore
  }
}

export { recordContent }
