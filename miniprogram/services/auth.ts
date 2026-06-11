// services/auth.ts - 封装 auth 云函数调用

interface AuthResult {
  code: number;
  message: string;
  data: any;
}

export function callAuth(action: string, payload: any = {}): Promise<AuthResult> {
  return wx.cloud.callFunction({
    name: 'auth',
    data: { action, payload },
  }).then((res: any) => res.result);
}

export function login(): Promise<AuthResult> {
  return callAuth('login');
}

export function bindPhone(code: string): Promise<AuthResult> {
  return callAuth('bindPhone', { code });
}

export function getMe(): Promise<AuthResult> {
  return callAuth('getMe');
}
