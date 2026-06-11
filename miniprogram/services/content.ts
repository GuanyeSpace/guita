// services/content.ts - 封装 content 云函数调用

interface ContentResult {
  code: number;
  message: string;
  data: any;
}

export function callContent(action: string, payload: any = {}): Promise<ContentResult> {
  return wx.cloud.callFunction({
    name: 'content',
    data: { action, payload },
  }).then((res: any) => res.result);
}

export function listContent(content_type: string, page: number = 1, page_size: number = 20): Promise<ContentResult> {
  return callContent('list', { content_type, page, page_size });
}

export function getContentDetail(content_id: string): Promise<ContentResult> {
  return callContent('detail', { content_id });
}

export function recordContent(content_id: string, record_type: string, progress_sec: number = 0, completed: boolean = false): Promise<ContentResult> {
  return callContent('record', { content_id, record_type, progress_sec, completed });
}

export function getLatestContent(): Promise<ContentResult> {
  return callContent('latest', {});
}
