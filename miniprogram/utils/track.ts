function track(
  event_name: string,
  options?: {
    host_id?: string | null
    content_id?: string | null
    properties?: Record<string, unknown>
  },
): void {
  try {
    wx.cloud
      .callFunction({
        name: 'event',
        data: {
          action: 'track',
          payload: {
            event_name,
            host_id: options?.host_id ?? null,
            content_id: options?.content_id ?? null,
            properties: options?.properties ?? {},
          },
        },
      })
      .catch(() => {})
  } catch (_) {
    // silently ignore
  }
}

export { track }
