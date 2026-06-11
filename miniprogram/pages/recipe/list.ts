// pages/recipe/list.ts
import { listContent } from '../../services/content';
import { trackEvent } from '../../services/event';
import { EVENT_NAMES, CONTENT_TYPE } from '../../constants/index';

Page({
  data: {
    loading: true,
    error: '',
    list: [] as any[],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loadingMore: false,
  },

  onShow() {
    if (this.data.list.length === 0) {
      this.loadRecipes(true);
    }
  },

  async loadRecipes(refresh: boolean = false) {
    const page = refresh ? 1 : this.data.page;
    if (!refresh && this.data.loadingMore) return;

    this.setData({
      loading: page === 1,
      loadingMore: page > 1,
      error: '',
    });

    try {
      const res = await listContent(CONTENT_TYPE.RECIPE, page, this.data.pageSize);
      if (res.code === 0) {
        const newList = refresh ? res.data.list : [...this.data.list, ...res.data.list];
        this.setData({
          list: newList,
          page,
          hasMore: res.data.has_more,
        });

        if (page === 1) {
          trackEvent(EVENT_NAMES.CONTENT_RECIPE_LIST_VIEW);
        }
      } else {
        this.setData({ error: res.message || '加载失败' });
      }
    } catch (err) {
      console.error('loadRecipes error:', err);
      this.setData({ error: '刚刚网络有点慢，再试一次好么？' });
    } finally {
      this.setData({ loading: false, loadingMore: false });
    }
  },

  onRecipeTap(e: any) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/recipe/detail?id=${id}` });
  },

  onLoadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ page: this.data.page + 1 }, () => {
      this.loadRecipes(false);
    });
  },

  onPullDownRefresh() {
    this.loadRecipes(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onRetry() {
    this.loadRecipes(true);
  },
});
