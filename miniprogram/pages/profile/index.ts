// pages/profile/index.ts
import { getMe } from '../../services/auth';
import { trackEvent } from '../../services/event';
import { EVENT_NAMES } from '../../constants/index';
import { maskPhone, formatDate } from '../../utils/index';

Page({
  data: {
    loading: true,
    error: '',
    user: null as any,
    host: null as any,
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    this.setData({ loading: true, error: '' });
    try {
      const res = await getMe();
      if (res.code === 0) {
        this.setData({
          user: res.data.user,
          host: res.data.host,
        });
        trackEvent(EVENT_NAMES.PROFILE_VIEW, res.data.host?._id);
      } else {
        this.setData({ error: res.message || '获取用户信息失败' });
      }
    } catch (err) {
      console.error('loadProfile error:', err);
      this.setData({ error: '刚刚网络有点慢，再试一次好么？' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onRetry() {
    this.loadProfile();
  },
});
