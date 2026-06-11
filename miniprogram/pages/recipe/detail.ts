// pages/recipe/detail.ts
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
        trackEvent(EVENT_NAMES.CONTENT_RECIPE_OPEN, this.data.content?.host_id, contentId);
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

  // 查看食谱文件
  onViewFile() {
    const content = this.data.content;
    if (!content) return;

    const fileUrl = content.asset_url;
    const fileId = content.asset_file_id;

    if (!fileUrl && !fileId) {
      wx.showToast({ title: '暂无食谱文件', icon: 'none' });
      return;
    }

    // 跳转到文件预览页
    wx.navigateTo({
      url: `/pages/preview/index?fileId=${encodeURIComponent(fileId || '')}&fileUrl=${encodeURIComponent(fileUrl || '')}&title=${encodeURIComponent(content.title)}`,
    });

    // 记录预览行为
    recordContent(this.data.contentId, 'preview');
  },

  onRetry() {
    if (this.data.contentId) {
      this.loadDetail(this.data.contentId);
    }
  },
});
