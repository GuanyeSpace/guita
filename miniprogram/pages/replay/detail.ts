// pages/replay/detail.ts
import { getContentDetail, recordContent } from '../../services/content';
import { trackEvent } from '../../services/event';
import { EVENT_NAMES } from '../../constants/index';

Page({
  data: {
    loading: true,
    error: '',
    content: null as any,
    contentId: '',
  },

  onLoad(options: { id?: string }) {
    if (options.id) {
      this.setData({ contentId: options.id });
      this.loadDetail(options.id);
    } else {
      this.setData({ loading: false, error: '缺少内容 ID' });
    }
  },

  async loadDetail(contentId: string) {
    this.setData({ loading: true, error: '' });
    try {
      const res = await getContentDetail(contentId);
      if (res.code === 0) {
        this.setData({ content: res.data.content });
        // 埋点
        trackEvent(EVENT_NAMES.CONTENT_REPLAY_OPEN, this.data.content?.host_id, contentId);
      } else {
        this.setData({ error: res.message || '加载失败' });
      }
    } catch (err) {
      console.error('loadDetail error:', err);
      this.setData({ error: '刚刚网络有点慢，再试一次好么？' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onVideoError(e: any) {
    console.error('video error:', e.detail);
    wx.showToast({ title: '刚刚网络有点慢，再试一次好么？', icon: 'none' });
  },

  onPlay() {
    // 记录播放行为
    if (this.data.contentId) {
      recordContent(this.data.contentId, 'play');
    }
  },

  onRetry() {
    if (this.data.contentId) {
      this.loadDetail(this.data.contentId);
    }
  },
});
