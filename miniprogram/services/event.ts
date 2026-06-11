// services/event.ts - 封装 event 云函数调用

interface EventResult {
  code: number;
  message: string;
  data: any;
}

export function callEvent(action: string, payload: any = {}): Promise<EventResult> {
  return wx.cloud.callFunction({
    name: 'event',
    data: { action, payload },
  }).then((res: any) => res.result);
}

export function trackEvent(event_name: string, host_id: string = '', content_id: string = '', properties: any = {}): Promise<EventResult> {
  return callEvent('track', { event_name, host_id, content_id, properties });
}
