// services/host.ts - 封装 host 云函数调用

interface HostResult {
  code: number;
  message: string;
  data: any;
}

export function callHost(action: string, payload: any = {}): Promise<HostResult> {
  return wx.cloud.callFunction({
    name: 'host',
    data: { action, payload },
  }).then((res: any) => res.result);
}

export function listActiveHosts(): Promise<HostResult> {
  return callHost('listActive');
}

export function bindHost(host_id: string): Promise<HostResult> {
  return callHost('bind', { host_id });
}

export function getMyHost(): Promise<HostResult> {
  return callHost('getMyHost');
}
