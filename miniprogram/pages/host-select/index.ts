// pages/host-select/index.ts
import { listActiveHosts, bindHost } from '../../services/host';
import { trackEvent } from '../../services/event';
import { EVENT_NAMES } from '../../constants/index';

Page({
  data: {
    loading: true,
    error: '',
    hosts: [] as any[],
    selectedId: '',
    showConfirm: false,
    confirmHost: null as any,
    binding: false,
  },

  onLoad() {
    this.loadHosts();
  },

  async loadHosts() {
    this.setData({ loading: true, error: '' });
    try {
      const res = await listActiveHosts();
      if (res.code === 0) {
        this.setData({ hosts: res.data.list });
        // 埋点
        trackEvent(EVENT_NAMES.HOST_SELECT_VIEW);
      } else {
        this.setData({ error: res.message || '加载失败' });
      }
    } catch (err) {
      console.error('loadHosts error:', err);
      this.setData({ error: '刚刚网络有点慢，再试一次好么？' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 选择主播
  onSelectHost(e: any) {
    const { id } = e.currentTarget.dataset;
    this.setData({ selectedId: id });
  },

  // 点击确认
  onConfirm() {
    if (!this.data.selectedId) return;
    const host = this.data.hosts.find((h: any) => h._id === this.data.selectedId);
    if (!host) return;
    this.setData({ showConfirm: true, confirmHost: host });
  },

  // 关闭确认弹窗
  onCancelConfirm() {
    this.setData({ showConfirm: false, confirmHost: null });
  },

  // 确认绑定
  async onConfirmBind() {
    const host = this.data.confirmHost;
    if (!host) return;

    this.setData({ binding: true });
    try {
      const res = await bindHost(host._id);
      if (res.code === 0) {
        wx.showToast({ title: '绑定成功', icon: 'success', duration: 1500 });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/home/index' });
        }, 1500);
      } else {
        wx.showToast({ title: res.message || '绑定失败', icon: 'none' });
      }
    } catch (err) {
      console.error('bindHost error:', err);
      wx.showToast({ title: '刚刚网络有点慢，再试一次好么？', icon: 'none' });
    } finally {
      this.setData({ binding: false, showConfirm: false, confirmHost: null });
    }
  },
});
