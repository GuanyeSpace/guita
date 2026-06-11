// pages/home/index.ts
import { getMe } from '../../services/auth';
import { getMyHost } from '../../services/host';
import { getLatestContent } from '../../services/content';
import { trackEvent } from '../../services/event';
import { EVENT_NAMES } from '../../constants/index';

Page({
  data: {
    loading: true,
    error: '',
    host: null as any,
    replays: [] as any[],
    recipes: [] as any[],
  },

  onShow() {
    this.loadHomeData();
  },

  async loadHomeData() {
    this.setData({ loading: true, error: '' });
    try {
      // 1. 获取用户状态
      const meRes = await getMe();
      if (meRes.code !== 0) {
        this.setData({ error: meRes.message || '获取用户信息失败' });
        return;
      }

      const { user, host, status } = meRes.data;

      if (status === 'need_phone') {
        wx.redirectTo({ url: '/pages/bind-phone/index' });
        return;
      }
      if (status === 'need_host') {
        wx.redirectTo({ url: '/pages/host-select/index' });
        return;
      }

      if (!host) {
        this.setData({ error: '未绑定主播' });
        return;
      }

      this.setData({ host });

      // 2. 获取最新内容
      const contentRes = await getLatestContent();
      if (contentRes.code === 0) {
        this.setData({
          replays: contentRes.data.replays || [],
          recipes: contentRes.data.recipes || [],
        });
      }

      // 埋点
      trackEvent(EVENT_NAMES.HOME_VIEW, host._id);
    } catch (err) {
      console.error('loadHomeData error:', err);
      this.setData({ error: '刚刚网络有点慢，再试一次好么？' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 跳转回放详情
  onReplayTap(e: any) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/replay/detail?id=${id}` });
  },

  // 跳转食谱详情
  onRecipeTap(e: any) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/recipe/detail?id=${id}` });
  },

  // 查看更多回放
  onMoreReplay() {
    wx.switchTab({ url: '/pages/replay/list' });
  },

  // 查看更多食谱
  onMoreRecipe() {
    wx.switchTab({ url: '/pages/recipe/list' });
  },

  onRetry() {
    this.loadHomeData();
  },
});
