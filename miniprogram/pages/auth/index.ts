// pages/auth/index.ts
import { login, getMe } from '../../services/auth';

Page({
  data: {
    loading: true,
    error: '',
  },

  onLoad() {
    this.initAuth();
  },

  async initAuth() {
    this.setData({ loading: true, error: '' });
    try {
      // 1. 先获取用户状态
      const res = await getMe();
      if (res.code !== 0) {
        // 用户不存在，先登录创建
        const loginRes = await login();
        if (loginRes.code !== 0) {
          this.setData({ error: loginRes.message || '登录失败' });
          return;
        }
        this.handleStatus(loginRes.data.status);
        return;
      }
      this.handleStatus(res.data.status);
    } catch (err) {
      console.error('auth error:', err);
      this.setData({ error: '刚刚网络有点慢，再试一次好么？' });
    } finally {
      this.setData({ loading: false });
    }
  },

  handleStatus(status: string) {
    switch (status) {
      case 'need_phone':
        wx.redirectTo({ url: '/pages/bind-phone/index' });
        break;
      case 'need_host':
        wx.redirectTo({ url: '/pages/host-select/index' });
        break;
      case 'ready':
        wx.switchTab({ url: '/pages/home/index' });
        break;
      case 'inactive':
      case 'banned':
        this.setData({ error: '账号暂不可用，请联系客服。' });
        break;
      default:
        this.setData({ error: '未知状态，请重试' });
    }
  },

  onRetry() {
    this.initAuth();
  },
});
